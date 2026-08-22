# Feature 56 — ADK Discovery Spike

## Objective

Validate, against the real Google Cloud project used by ATLAS, which Google ADK agents can be discovered without modifying or instrumenting the governed agents, and close the `ObservedAgent` contract using only metadata exposed by Google Agent Platform / Vertex AI.

This spike is **read-only**. It must not create, update, invoke, pause or delete any agent.

## Product decision under validation

> ATLAS Agent Governance is an out-of-band governance control plane. Discovery must work from platform metadata and must not require an ATLAS SDK or custom callback inside each governed agent.

## Current Google platform baseline

As of 2026-08-21, Google Agent Platform exposes deployed agent runtimes as `reasoningEngines` and provides a GA `v1` list operation scoped by project and location.

Canonical list resource:

```text
GET https://<location>-aiplatform.googleapis.com/v1/projects/<project>/locations/<location>/reasoningEngines
```

The resource contract currently exposes, among other fields:

- `name`;
- `displayName`;
- `description`;
- `createTime`;
- `updateTime`;
- `etag`;
- `labels`;
- `spec.agentFramework`;
- `spec.identityType`;
- `spec.serviceAccount`;
- deployment-source information in `spec`.

`spec.agentFramework` can identify `google-adk` distinctly from other supported frameworks. ATLAS V1 therefore filters the discovered estate to `google-adk` while keeping the provider boundary generic.

The current Agent Platform Python SDK also exposes `client.agent_engines.list(...)`. The V1 discovery spike intentionally uses the REST contract plus the active `gcloud` access token so it can be executed from Cloud Shell without introducing a new application dependency.

## Script

```text
scripts/spikes/feature56_discover_adk_agents.sh
```

Properties:

- read-only;
- paginates all Reasoning Engines in the configured project/location;
- filters only `spec.agentFramework == "google-adk"`;
- preserves a raw response file under `/tmp`;
- creates a normalized `ObservedAgent` candidate JSON under `/tmp`;
- does not infer model, runtime health or governance metadata when the platform does not expose them directly;
- initializes governance state as `not_assessed` without changing the provider resource.

## Candidate ObservedAgent contract

```json
{
  "provider_agent_id": "<reasoning-engine-id>",
  "resource_name": "projects/.../locations/.../reasoningEngines/...",
  "display_name": "...",
  "description": "...",
  "framework": "google-adk",
  "runtime_type": "vertex_ai_agent_engine",
  "project_id": "...",
  "location": "...",
  "deployment_target": "reasoning_engine",
  "model_name": null,
  "resource_status": null,
  "created_at": "...",
  "updated_at": "...",
  "labels": {},
  "service_account": null,
  "identity_type": null,
  "deployment_source_kind": null,
  "discovery_source": "aiplatform.v1.projects.locations.reasoningEngines.list",
  "last_observed_at": "...",
  "governance_status": "not_assessed"
}
```

### Important semantic rule

`model_name` and `resource_status` remain nullable unless the real provider response exposes a trustworthy value. ATLAS must not infer them from display names, descriptions, labels or previous knowledge.

## Real-environment execution

From Cloud Shell:

```bash
cd ~/portafoliodatagob

git fetch origin
git switch feature/56-adk-agent-governance-spec
git pull --ff-only origin feature/56-adk-agent-governance-spec

chmod +x scripts/spikes/feature56_discover_adk_agents.sh

PROJECT=proyectopersonal-480420 \
REGION=us-central1 \
./scripts/spikes/feature56_discover_adk_agents.sh
```

The expected terminal result ends with:

```text
[PASS] Discovery completed. No agent was modified.
```

The script also prints `OUT_FILE=<path>`. That normalized JSON becomes the evidence required to close the discovery contract.

## Validation questions

The spike is accepted when the real output answers all of the following:

1. Can ATLAS enumerate the existing deployed Agent Platform resources in `proyectopersonal-480420/us-central1`?
2. Does `spec.agentFramework` reliably identify the ADK subset?
3. Are `name`, `displayName`, timestamps and labels populated consistently enough for inventory use?
4. Is `spec.serviceAccount` exposed for the deployed agents we currently have?
5. Which deployment-source representation is actually present in the environment?
6. Which fields in the initial Feature 56 SPEC must remain governance-owned because Google does not expose them?
7. Is the Reasoning Engine resource name stable enough to be the provider-side join key?

## Expected design outcome

After the real run, the Feature 56 domain model will separate data into two explicit layers:

### Observed platform metadata

Read-only facts discovered from Google:

- provider/resource identity;
- display metadata;
- framework;
- project/location;
- timestamps;
- labels;
- runtime identity configuration;
- deployment-source metadata where available.

### ATLAS governance metadata

Owned by ATLAS and never inferred from the provider unless explicitly configured:

- business owner;
- technical owner;
- business purpose;
- business domain;
- criticality;
- autonomy level;
- risk classification;
- human-oversight requirements;
- data classification;
- applicable policies;
- governance findings;
- governance status;
- governance evidence.

## Non-goals of this spike

- No AgentOps instrumentation.
- No session/run enumeration yet.
- No tool interception.
- No prompt inspection.
- No policy enforcement.
- No kill switch.
- No changes to existing ADK agents.
- No production UI changes.

## Exit criterion

The spike is complete when a real normalized discovery output is captured and the `ObservedAgent` schema can be frozen without invented provider fields.
