# Feature 59 · Increment 02 — Real Google ADK LLM Telemetry

Status: Development / isolated feature branch

Branch: `feature/59-reusable-agent-governance-agentops`

## Objective

Instrument ATLAS DataGob with the same proven FinOps telemetry pattern used by Business Rules Silver: capture real model usage from Google ADK callbacks at the moment each Gemini call finishes, correlate those calls to one governed application turn, and persist best-effort analytical evidence in BigQuery.

## Instrumented ATLAS agents

- `atlas_business_fact_extractor`
- `atlas_intake_orchestrator`
- `atlas_data_readiness_agent`
- `atlas_architecture_validation_agent`
- `atlas_policy_controls_agent`

The orchestrator tree is instrumented recursively so future delegated ADK sub-agents inherit the same telemetry pattern without duplicating callback code.

## Runtime flow

```text
POST /intake/conversation
        |
        +-- agentops_run_context(run_id, trace_id, requested_by)
        |
        +-- atlas_business_fact_extractor
        |      +-- before_model_callback -> start timer
        |      +-- Gemini
        |      +-- after_model_callback  -> usage_metadata -> BigQuery
        |
        +-- atlas_intake_orchestrator
               +-- specialist ADK agents
                      +-- same run_id / trace_id
                      +-- one row per real LLM call
```

## BigQuery target

Default table:

`<GOOGLE_CLOUD_PROJECT>.<ATLAS_AGENTOPS_DATASET>.agent_llm_usage`

Default dataset: `agentops`.

Optional override: `ATLAS_AGENTOPS_LLM_USAGE_TABLE`.

Telemetry is enabled only when `ATLAS_AGENTOPS_ENABLED=true`.

## Captured fields

- `agent_system_id`
- `run_id`
- `trace_id`
- `session_id`
- `agent_id`
- `model_provider`
- `model_name`
- `request_count`
- `input_tokens`
- `output_tokens`
- `total_tokens`
- `latency_ms`
- `status`
- `error_code`
- `error_message`
- `requested_by`
- `observed_at`
- `billing_reference`
- operational metadata

Prompts and model responses are not persisted by this increment.

## Correlation rule

One HTTP conversational intake turn creates one AgentOps `run_id` and `trace_id`. The mandatory fact extractor and the main orchestrator/specialists execute within the same Python context, so their model calls are grouped into the same governed turn even though the extractor uses its own ephemeral ADK session.

If a callback executes outside an application run context, ADK `invocation_id` is used as a safe fallback correlation key.

## Reliability rule

AgentOps is best-effort and fail-open with respect to observability only. A BigQuery telemetry failure logs a warning and never fails the governed Intake business execution.

This does not relax governance gates, catalog validation, Definition of Ready, registration controls, or authorization.

## Privacy rule

V1 records operational metadata only. Full prompts/responses are intentionally excluded. Any future capture of conversation content requires an explicit governed retention and privacy decision.

## Acceptance criteria

- the five ATLAS ADK agents expose reusable telemetry callbacks;
- one conversational turn correlates extractor + orchestrator + specialists under one `run_id`;
- real `LlmResponse.usage_metadata` provides token counts;
- latency is measured around each model call;
- `SUCCESS` / `FAILED` and errors are queryable fields;
- BigQuery errors do not break Intake;
- telemetry remains disabled unless explicitly enabled per environment;
- tests validate correlation, token extraction, tree instrumentation and fail-open behavior;
- no production deployment is performed as part of this increment.
