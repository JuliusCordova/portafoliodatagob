# Feature 56 — Agent Governance Preview Checkpoint

Date: 2026-08-22
Repository: `JuliusCordova/portafoliodatagob`
Branch: `feature/56-adk-agent-governance-spec`
Feature image SHA: `077d08b5b5ee0b92bd95c8174afd6ced6e382b9b`
Current branch head after preview-script hardening: `71590c8158afdd1132fb3fd37fb6557f28d08aee`
Project: `proyectopersonal-480420`
Region: `us-central1`

## Status

**ISOLATED CLOUD RUN PREVIEW: PASS**

The Feature 56 control plane was deployed in isolated preview services and validated against the real Google ADK estate. No governed ADK agent was invoked, modified, paused, instrumented or reconfigured.

## Immutable build evidence

Cloud Build:

```text
BUILD_ID: 5e0cf6af-94b3-47a1-9fc9-44aae34f1557
STATUS: SUCCESS
DURATION: 3M41S
SOURCE: gs://proyectopersonal-480420_cloudbuild/source/1787360708.583277-1dede1df838f494791c65b0db1a93f46.tgz
API_IMAGE: us-central1-docker.pkg.dev/proyectopersonal-480420/atlas-datagob/atlas-datagob-api:f56-preview-077d08b
WEB_IMAGE: us-central1-docker.pkg.dev/proyectopersonal-480420/atlas-datagob/atlas-datagob-web:f56-preview-077d08b
```

Both preview images were built from the exact Feature 56 implementation SHA `077d08b5b5ee0b92bd95c8174afd6ced6e382b9b`.

## API preview

Service:

```text
atlas-datagob-api-f56-preview
```

Revision:

```text
atlas-datagob-api-f56-preview-00001-rm9
```

Traffic:

```text
100%
```

Validated endpoint:

```text
https://atlas-datagob-api-f56-preview-913797829604.us-central1.run.app
```

Health result:

```json
{
  "status": "ok",
  "product": "ATLAS DataGob",
  "version": "0.9.0"
}
```

## Real ADK discovery through preview API

Initial preview state before refresh:

```text
deployments_adk       = 0
deployments_unbound   = 0
governed_agents       = 0
```

Read-only refresh result:

```text
observed          = 23
inserted          = 23
updated           = 0
not_observed      = 0
total_google_adk  = 23
refreshed_at      = 2026-08-22T01:09:31+00:00
```

Persisted deployment count matched discovery exactly:

```text
Firestore deployments = 23
Discovery deployments = 23
MATCH = PASS
```

First persisted observed deployment:

```text
deployment_id: google-adk:8881601491744325632
display_name: Ayniq IaC Agent candidate 2026.08.10-06
framework: google-adk
runtime_type: vertex_ai_reasoning_engine
deployment_source_kind: package
service_account: ayn-iac-agent-runtime@proyectopersonal-480420.iam.gserviceaccount.com
binding_status: unbound
governed_agent_id: null
resource_name: projects/913797829604/locations/us-central1/reasoningEngines/8881601491744325632
```

This validates the core domain rule in production-like infrastructure: a provider deployment is observed and persisted without being automatically promoted to a logical governed agent.

## Firestore preview isolation

Feature 56 preview uses dedicated collections with `_f56_preview` suffixes, including:

```text
atlas_agent_deployments_f56_preview
atlas_agents_f56_preview
atlas_agent_deployment_bindings_f56_preview
atlas_agent_governance_f56_preview
atlas_agent_governance_events_f56_preview
atlas_agent_findings_f56_preview
atlas_demands_f56_preview
```

At this checkpoint, 23 real ADK deployments were persisted and all remained unbound.

## Web preview

The first Web deploy attempt stopped before service creation because `gcloud --set-env-vars` interpreted commas inside `ATLAS_WEB_DEMO_ROLES` as dictionary separators.

This was a deployment-script escaping issue only. The Web image had already built successfully.

The deployment script was hardened to use a temporary YAML env file in commit:

```text
71590c8158afdd1132fb3fd37fb6557f28d08aee
```

The already validated immutable Web image `f56-preview-077d08b` was then deployed without rebuilding the feature code.

Service:

```text
atlas-datagob-web-f56-preview
```

Revision:

```text
atlas-datagob-web-f56-preview-00001-gsx
```

Traffic:

```text
100%
```

Canonical Web URL resolved by `gcloud run services describe`:

```text
https://atlas-datagob-web-f56-preview-mkqutd4koq-uc.a.run.app
```

Agent Governance route:

```text
https://atlas-datagob-web-f56-preview-mkqutd4koq-uc.a.run.app/agent-governance
```

HTTP validation:

```text
GET /agent-governance -> HTTP 200
```

## Web → API proxy validation

The server-side Web proxy returned:

```json
{
  "deployments_adk": 23,
  "deployments_unbound": 23,
  "governed_agents": 0,
  "governed_compliant": 0,
  "not_assessed": 0,
  "action_required": 0,
  "high_risk": 0,
  "open_findings": 0,
  "last_observed_at": "2026-08-22T01:09:30+00:00"
}
```

The expected deployments-first initial state is therefore validated:

```text
ADK deployments observed = 23
Unbound deployments       = 23
Governed agents            = 0
Automatic logical agents   = 0
```

## Acceptance gate

| Gate | Result |
| --- | --- |
| Cloud Build exact Feature 56 image | PASS |
| API preview deployment | PASS |
| API health v0.9.0 | PASS |
| Real Google ADK discovery | PASS — 23 |
| Firestore persisted count == discovery count | PASS — 23 == 23 |
| No automatic deployment binding | PASS — 23 unbound |
| No automatic GovernedAgent creation | PASS — 0 agents |
| Web preview deployment | PASS |
| `/agent-governance` HTTP | PASS — 200 |
| Web → API proxy | PASS — 23 deployments |
| Runtime modification of governed ADK agents | NONE |

## Governance conclusion

Feature 56 has passed its infrastructure preview checkpoint. The control-plane architecture is now validated against the real Google ADK estate while remaining out-of-band from governed agent runtime code.

The next checkpoint is a controlled functional E2E using preview metadata only:

1. create one logical `GovernedAgent`;
2. explicitly bind one observed ADK deployment;
3. populate its governance profile;
4. execute deterministic assessment;
5. verify findings, policy references and evidence;
6. validate the same flow visually in `/agent-governance`.

Merge and production promotion remain separate decisions and are not authorized by this checkpoint.
