# Feature 56 — Agent Governance implementation checkpoint

Date: 2026-08-22
Branch: `feature/56-adk-agent-governance-spec`
PR: `#61`

## Status

**IMPLEMENTATION + ISOLATED PREVIEW + CONTROLLED FUNCTIONAL E2E: PASS**

Feature 56 contains the first working ATLAS control plane dedicated to governance of Google ADK deployments. Stable ATLAS services have not been modified or promoted.

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

Governance finding history is also preserved. A new assessment closes previous open findings and appends the current findings; it does not erase prior evidence.

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

Feature code SHA `077d08b5b5ee0b92bd95c8174afd6ced6e382b9b` reached 4/4 green before preview execution across API tests, Web build, Container build and Deploy scripts.

## Isolated preview — PASS

Cloud Build:

```text
BUILD_ID: 5e0cf6af-94b3-47a1-9fc9-44aae34f1557
STATUS: SUCCESS
```

Preview services:

```text
atlas-datagob-api-f56-preview
atlas-datagob-web-f56-preview
```

Validated revisions:

```text
API revision: atlas-datagob-api-f56-preview-00001-rm9
Web revision: atlas-datagob-web-f56-preview-00001-gsx
```

Preview Firestore collections are isolated with `_f56_preview` suffixes.

Preview validation result:

```text
API health                         PASS · ATLAS DataGob 0.9.0
Real Google ADK discovery          PASS · 23 deployments
Persisted deployment count        PASS · 23
Web /agent-governance              PASS · HTTP 200
Web -> API proxy                   PASS · deployments_adk=23
Automatic logical agent creation  PASS · 0
Stable services modified          NO
```

A `gcloud --set-env-vars` escaping issue with comma-separated Web roles was found in the first Web deploy attempt. The script was hardened to use `--env-vars-file`, and the already-built validated Web image was deployed without rebuilding Feature code.

## Controlled functional E2E — PASS

Script:

```text
scripts/cloud_run/validate_feature56_preview_e2e.sh
```

Real observed deployment used:

```text
google-adk:8881601491744325632
Ayniq IaC Agent candidate 2026.08.10-06
```

Logical governed identity created:

```text
AGT-D28B3CDD
Ayniq IaC Agent · Feature 56 E2E
```

Human-confirmed binding:

```text
ADB-4E547135
binding_source=human_confirmed
environment=preview
is_current=true
```

Phase 1 intentionally omitted mandatory-control evidence:

```text
status=action_required
score=90
mandatory_controls_registered=false
open finding=AGF-F9A6FA7934
```

Phase 2 registered the mandatory controls from the versioned ATLAS governance catalog and reassessed:

```text
status=governed
score=100
mandatory_controls_registered=true
open findings=0
```

The prior finding was preserved as historical evidence and closed:

```text
finding_id=AGF-F9A6FA7934
status=closed
resolved_at=2026-08-22T01:16:56+00:00
```

Final estate state:

```text
deployments_adk=23
deployments_unbound=22
governed_agents=1
governed_compliant=1
action_required=0
open_findings=0
```

Runtime boundary remained intact:

```text
RUNTIME_AGENT_MODIFIED=false
```

Detailed evidence:

```text
docs/deployment/evidence/FEATURE_56_CONTROLLED_E2E_CHECKPOINT_2026-08-22.md
```

## Remaining checkpoint

The only pre-merge acceptance checkpoint still pending is visual validation of the isolated Web preview:

```text
https://atlas-datagob-web-f56-preview-mkqutd4koq-uc.a.run.app/agent-governance
```

Visual validation should confirm:

1. KPI row reflects `23 / 22 / 1` and one compliant governed identity;
2. `Agentes` tab shows `Ayniq IaC Agent · Feature 56 E2E` as governed;
3. governed-agent drawer shows risk `medium`, autonomy `l1`, linked deployment and historical closed finding;
4. `Deployments` tab shows the selected Reasoning Engine as bound and the remaining 22 as unbound;
5. no runtime-enforcement actions such as pause/kill/disable writes appear;
6. layout, responsive behavior and executive readability are acceptable.

Only after that visual checkpoint should PR #61 move out of Draft. Merge/promotion remain separate decisions.
