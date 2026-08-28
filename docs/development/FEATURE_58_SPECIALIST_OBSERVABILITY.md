# Feature 58 · Specialist Observability + Governed Completion Guard

## Product principle

> Gemini decides how to converse; ATLAS deterministically guarantees governance validations that are already resolvable from structured state.

The business user must be able to understand that ATLAS is consulting governed specialist capabilities without exposing unnecessary implementation detail.

## Business-facing experience

The Intake exposes a compact **Especialistas ATLAS** panel with three governed capabilities:

- Especialista de Datos;
- Especialista de Arquitectura;
- Especialista de Políticas.

Each item shows whether the assessment has completed and a short business-facing result, for example:

```text
Especialista de Arquitectura
✓ GCP-BI-001@1.1
```

or:

```text
Especialista de Políticas
✓ 6 políticas aplicables
```

Pending specialists are shown as `Aún no requerido`; ATLAS does not pretend a specialist ran when evidence was insufficient.

## Technical traceability

An expandable **Ver trazabilidad técnica** section preserves:

- internal agent ID;
- ADK trace for the turn;
- assessment summary;
- execution mode.

Execution mode is one of:

- `adk_agent`: Gemini ADK delegated to the registered specialist;
- `runtime_guard`: ATLAS completed an already-resolvable mandatory validation deterministically after the ADK turn;
- `session_state`: the current session already contained a valid assessment;
- `not_run`: the specialist has not run because required evidence is not yet available.

A `runtime_guard` must never be mislabeled as an ADK sub-agent invocation.

## Deterministic completion rule

### Architecture

When `project_classification.primary_type` is known and not `unknown`, and no `architecture_assessment` exists, ATLAS deterministically selects/validates the approved architecture baseline using the same governed catalog loader used by the Architecture specialist.

The runtime does not ask a business user to design a technical architecture merely to select an approved baseline.

### Policies

Policy completion is more conservative. The runtime may evaluate policies only when:

1. project type is known;
2. architecture assessment exists;
3. data sensitivity is explicitly represented in Data Readiness state;
4. policy assessment is still missing.

ATLAS must not interpret absent sensitivity evidence as `false`.

## Persistence

Deterministic completion results are persisted through ADK session `EventActions.state_delta` and attributed to the registered orchestrator for durable-session compatibility.

The response separately exposes `specialist_activity` so observability can distinguish ADK execution from runtime guard execution.

## Acceptance evidence

Feature 58 E2E already proved dynamic catalog consumption without redeploy:

- `AGENT-001@1.1` consumed by Policy & Controls Agent;
- `GCP-BI-001@1.1` consumed by Architecture Validation Agent.

The completion guard addresses the observed case where a first-turn dashboard classification was correct but Gemini omitted Architecture specialist delegation until the next turn.

## Acceptance criteria

- A classified initiative cannot remain without an architecture baseline merely because the LLM skipped delegation.
- A policy assessment is not force-completed until data sensitivity is explicitly known.
- Business UI shows specialist participation and result summaries.
- Technical trace differentiates `adk_agent` and `runtime_guard`.
- No scoring, demand lifecycle, committee decision or catalog mutation behavior is changed by this enhancement.
