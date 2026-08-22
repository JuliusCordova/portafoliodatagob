# Feature 56 — Agent Governance implementation checkpoint

Date: 2026-08-22
Branch: `feature/56-adk-agent-governance-spec`
PR: `#61`

## Status

**IMPLEMENTATION COMPLETE FOR ISOLATED PREVIEW VALIDATION**

Feature 56 now contains the first working ATLAS control plane dedicated to governance of Google ADK deployments. Stable ATLAS services have not been modified or promoted.

## Product boundary

The implementation preserves the approved V1 boundary:

- Google ADK / Google Agent Platform only;
- out-of-band discovery and governance;
- no SDK installed inside governed agents;
- no prompt or response interception;
- no tool-call interception;
- no runtime enforcement / kill switch;
- no automatic creation of logical agents from deployment-name heuristics.

## Real estate baseline

The read-only spike against `proyectopersonal-480420/us-central1` returned:

```text
total_reasoning_engines = 24
total_google_adk        = 23
```

The provider resource is therefore modeled as `ObservedDeployment`, not as `GovernedAgent`.

```text
GovernedAgent
      |
      | 0..N
      v
AgentDeploymentBinding
      |
      v
ObservedDeployment
```

## Backend implemented

### Discovery adapter

`apps/api/src/atlas_datagob/services/agent_discovery.py`

- reads `projects.locations.reasoningEngines.list` in Google Agent Platform v1;
- filters `spec.agentFramework == google-adk`;
- uses Application Default Credentials at runtime;
- maps Reasoning Engine resources to canonical `ObservedDeployment` records;
- preserves provider facts such as resource id, display name, service account, timestamps and provider-declared deployment source;
- supports the direct `packageSpec` representation validated in the real estate;
- leaves model/status/governance fields null or ATLAS-owned when Google does not expose them canonically;
- never invokes or changes an agent.

### Firestore repository

`apps/api/src/atlas_datagob/services/agent_governance_repository.py`

Dedicated collections:

```text
atlas_agent_deployments
atlas_agents
atlas_agent_deployment_bindings
atlas_agent_governance
atlas_agent_governance_events
atlas_agent_findings
```

Preview deployment overrides them with `_f56_preview` suffixes.

The repository preserves provider history: deployments missing from a future refresh are marked `not_observed` instead of being deleted.

Governance finding history is also preserved. A new assessment closes previous open findings as `superseded_by_reassessment` and appends the current findings; it does not erase prior evidence.

### Governance service

`apps/api/src/atlas_datagob/services/agent_governance_service.py`

Responsibilities:

- refresh the observed ADK estate;
- summarize deployment/governance KPIs;
- create logical governed identities;
- bind observed deployments to a governed identity only through an explicit user action;
- maintain governance profiles;
- execute deterministic governance assessments;
- load applicable controls from the existing versioned ATLAS governance catalog;
- persist findings/evidence state.

Policy references in findings are resolved from the active catalog `id@version`; the assessment does not hard-code a policy version.

The LLM is not a source of truth for the `governed` decision.

### API extension

`apps/api/src/atlas_datagob/api/feature56_app.py`

API version: `0.9.0`.

Feature 56 imports and extends the complete Feature 54 application, so Conversational Intake remains available.

Implemented routes:

```text
GET   /agent-governance/summary
GET   /agent-governance/deployments
POST  /agent-governance/discovery/refresh
GET   /agent-governance/agents
POST  /agent-governance/agents
GET   /agent-governance/agents/{agent_id}
PATCH /agent-governance/agents/{agent_id}/profile
POST  /agent-governance/agents/{agent_id}/deployments/bind
POST  /agent-governance/agents/{agent_id}/assess
GET   /agent-governance/findings
```

## RBAC implemented

Read access uses `agent_governance:read` and is included in the read-only permission set.

Mutating governance permissions are granted to Data Steward, Data Architect and Platform Admin:

```text
agent_governance:edit
agent_governance:bind
agent_governance:assess
agent_governance:refresh
```

Executive and other read-only users can inspect the control plane but cannot alter governance state.

## Web implementation

Route:

```text
/agent-governance
```

Navigation label:

```text
Gobierno de agentes
```

The first screen implements:

- executive KPI row;
- tabs `Agentes` and `Deployments`;
- ADK deployment inventory;
- unbound deployment filtering;
- explicit create/bind workflow;
- governed Agent Estate table;
- deployment detail drawer;
- governed-agent detail drawer;
- editable governance profile;
- autonomy levels L0-L4;
- risk / criticality / human oversight fields;
- policy references;
- deterministic assessment action;
- findings and linked-deployment drill-down.

A deployment is never converted into a governed logical agent by UI heuristics.

## Web/API proxy

A server-side Next.js catch-all proxy was added under:

```text
/api/agent-governance/[...segments]
```

It propagates the existing ATLAS web identity contract and keeps the browser decoupled from the backend service URL.

## CI

During implementation CI detected and drove corrections to:

1. lazy-load runtime `httpx` so the dependency-light API unit-test runner remains valid;
2. preserve Feature 54 container-contract evidence while starting the Feature 56 extension;
3. remove nullable Agent Drawer typing ambiguity in the Web app;
4. align deployment-source normalization with the real `packageSpec` provider contract;
5. verify policy-version propagation independently from hard-coded `1.0` assumptions.

The final implementation head must remain 4/4 green before preview execution.

## Preview deployment

Script:

```text
scripts/cloud_run/deploy_feature56_preview.sh
```

It builds immutable images from the current branch SHA and deploys only:

```text
atlas-datagob-api-f56-preview
atlas-datagob-web-f56-preview
```

Stable services are not changed:

```text
atlas-datagob-api
atlas-datagob-web
```

Preview Firestore collections are isolated:

```text
atlas_agent_deployments_f56_preview
atlas_agents_f56_preview
atlas_agent_deployment_bindings_f56_preview
atlas_agent_governance_f56_preview
atlas_agent_governance_events_f56_preview
atlas_agent_findings_f56_preview
atlas_demands_f56_preview
```

The script performs, in order:

1. immutable Cloud Build of API + Web;
2. API preview deployment;
3. `/health` smoke;
4. read-only Agent Platform discovery;
5. persistence-count validation;
6. Web preview deployment;
7. `/agent-governance` HTTP smoke;
8. Web → API proxy validation;
9. prints the direct Agent Governance preview URL only after all checks pass.

## Preview acceptance gate

Preview is considered conforming only when:

```text
API health                       PASS
Agent Governance summary         PASS
ADK discovery                    >= 1 deployment
Persisted count                  == discovery count
Web /agent-governance            HTTP 200
Web -> API proxy deployment KPI  == discovery count
Stable service names             untouched
```

For the currently observed estate, the expected discovery count is 23. The check intentionally validates the live result rather than hard-coding 23 so the product remains correct when new ADK deployments appear.

## Next checkpoint

Run the isolated preview script from Cloud Shell on a clean Feature 56 branch. After it prints `FEATURE 56 PREVIEW: CONFORME`, capture the exact build/revisions/URLs and perform visual validation of:

1. deployments-first state;
2. unbound filter;
3. explicit logical-agent creation;
4. deployment binding;
5. governance-profile editing;
6. deterministic assessment + findings;
7. linked deployment history.

Only after that E2E checkpoint can PR #61 be considered implementation-complete. Merge/promotion remain separate decisions.
