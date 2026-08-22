# Feature 56 — ADK Discovery Spike

## Objective
Validate, with a read-only spike against the real Google Cloud estate, what Google Agent Platform / Reasoning Engine metadata can be used by ATLAS to build the new Agent Governance screen without modifying or instrumenting individual agents.

## Scope

- Google Cloud project: `proyectopersonal-480420`
- Region: `us-central1`
- Discovery source: Agent Platform / Reasoning Engines
- Framework filter: `spec.agentFramework=google-adk`
- Operation mode: read-only

## Execution

Command:

```bash
PROJECT=proyectopersonal-480420 \
REGION=us-central1 \
./scripts/spikes/feature56_discover_adk_agents.sh
```

Execution timestamp: `2026-08-22T00:08:57Z`

Generated files:

```text
RAW_FILE=/tmp/atlas-f56-agent-engines-20260822T000857Z.json
OUT_FILE=/tmp/atlas-f56-observed-agents-20260822T000857Z.json
```

## Result

```text
total_reasoning_engines: 24
total_google_adk: 23
[PASS] Discovery completed. No agent was modified.
```

## Confirmed metadata

The spike confirmed that ATLAS can normalize, for the current estate:

- provider resource id;
- display name;
- ADK framework;
- create/update timestamps;
- runtime service account;
- deployment source kind;
- project and location from discovery scope.

All 23 ADK resources returned `deployment_source_kind=package`.

## Estate observed

### Ayniq

19 ADK Reasoning Engines were discovered across multiple candidate deployments for `Ayniq IaC Agent` and `Ayniq Plan Reviewer`.

Runtime service account:

```text
ayn-iac-agent-runtime@proyectopersonal-480420.iam.gserviceaccount.com
```

### PrimaDemo

4 ADK Reasoning Engines were discovered across multiple versions/candidates of `PrimaDemo Financial Journey`.

Runtime service account:

```text
primademo-agent-runtime@proyectopersonal-480420.iam.gserviceaccount.com
```

## Critical architecture finding

The spike proves that a Reasoning Engine must be modeled as an **observed deployment**, not automatically as the logical business agent.

Multiple Reasoning Engines correspond to historical candidates/versions of the same logical product capability. Counting every resource as one governed agent would inflate the corporate agent estate.

The canonical model is therefore:

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

The detailed frozen contract is documented in:

`docs/specs/15-adk-discovery-real-contract.md`

## Governance metadata boundary

The following must not be inferred from the discovery result unless another approved canonical source exists:

- Business Owner;
- Technical Owner;
- business purpose;
- risk;
- autonomy;
- Human-in-the-Loop;
- data classification;
- exact model;
- authorized tools;
- compliance status.

These remain explicit ATLAS governance metadata.

## Conclusion

**SPIKE PASS.**

The environment provides enough official metadata to implement out-of-band ADK discovery. Feature 56 can proceed without SDK injection or agent-specific integration, using the separation between logical governed agents and observed provider deployments.
