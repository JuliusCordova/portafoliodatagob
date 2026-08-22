# Feature 56 — ADK Discovery Checkpoint

Date: 2026-08-22
Repository: `JuliusCordova/portafoliodatagob`
Branch: `feature/56-adk-agent-governance-spec`
Project: `proyectopersonal-480420`
Region: `us-central1`

## Status

**REAL ADK DISCOVERY: PASS**

The discovery spike was executed read-only against the real Google Cloud environment.

Result:

```text
total_reasoning_engines: 24
total_google_adk: 23
[PASS] Discovery completed. No agent was modified.
```

Generated files in Cloud Shell:

```text
RAW_FILE=/tmp/atlas-f56-agent-engines-20260822T000857Z.json
OUT_FILE=/tmp/atlas-f56-observed-agents-20260822T000857Z.json
```

## Observed ADK resources

### Ayniq estate

19 ADK Reasoning Engines were observed across historical candidate deployments of:

- `Ayniq IaC Agent`
- `Ayniq Plan Reviewer`

Observed runtime identity:

`ayn-iac-agent-runtime@proyectopersonal-480420.iam.gserviceaccount.com`

All normalized resources reported:

`deployment_source_kind=package`

One previously governed runtime release candidate is among the observed resources:

- provider id `3187010869166866432`
- display name `Ayniq IaC Agent candidate 2026.08.07-05`

### PrimaDemo estate

4 ADK Reasoning Engines were observed for historical candidates/versions of:

`PrimaDemo Financial Journey`

Observed runtime identity:

`primademo-agent-runtime@proyectopersonal-480420.iam.gserviceaccount.com`

All normalized resources reported:

`deployment_source_kind=package`

## Confirmed observable fields

The real environment returned sufficient data to normalize:

- provider resource id;
- display name;
- `google-adk` framework;
- created timestamp;
- updated timestamp;
- service account;
- deployment source kind;
- project and region from discovery scope.

## Non-observable governance fields

The discovery evidence does not establish these as canonical platform metadata:

- Business Owner;
- Technical Owner;
- business purpose;
- risk;
- autonomy;
- Human-in-the-Loop;
- data classification;
- exact LLM model;
- authorized tools;
- governance/compliance status.

ATLAS must not infer these as facts. They remain governance-managed data until another approved canonical source exists.

## Domain correction produced by the spike

A Reasoning Engine resource is treated as an **ObservedDeployment**, not automatically as a logical governed agent.

The canonical model now separates:

```text
GovernedAgent
     1
     |
     | 0..N
     v
AgentDeploymentBinding
     |
     v
ObservedDeployment (Google ADK / Reasoning Engine)
```

This avoids reporting the 23 historical/candidate deployments as 23 distinct governed agents.

Before binding:

```text
ADK deployments observed = 23
Unbound deployments       = 23
Governed agents            = 0
```

## Governance conclusion

Feature 56 discovery is technically viable against the current estate without agent-specific integration or modification.

The next implementation phase may proceed using the frozen separation between logical agents and provider deployments defined in `docs/specs/15-adk-discovery-real-contract.md`.
