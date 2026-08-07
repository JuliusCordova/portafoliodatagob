# Sprint 04 — Policy RAG Multi-Agent Intake

## Objective

Build the design foundation for an intake that validates data, ML and GenAI initiatives against policy RAG and the Google Cloud end-to-end reference architecture.

## Current design decisions

- Intake must be multi-agent, not a single chatbot.
- Policy RAG must validate data lifecycle, reconciliation, semantic model, datasets, governance and FinOps policies.
- Architecture validation must use a predefined architecture designed by a Data Architect.
- The model must not invent new architecture patterns.
- If a request does not fit an approved pattern, it must be routed to a Data Architect.

## Included in this sprint design

- Policy RAG multi-agent specification.
- Markdown policies for data lifecycle, reconciliation, semantic model and governance.
- Google Cloud end-to-end reference architecture.
- Architecture Compliance Agent definition.
- Human review routing logic.

## Canonical architecture scope

The intake must validate the full flow:

`Sources -> Extraction -> Landing -> Bronze -> Silver -> Gold -> Feature Layer -> Knowledge Layer -> Serving -> BI / ML / GenAI / Agents -> Monitoring -> FinOps`

## Agents planned

1. Intake Conversation Agent.
2. Requirement Structuring Agent.
3. Initiative Classification Agent.
4. Policy Retrieval Agent.
5. Data Lifecycle Policy Agent.
6. Reconciliation and Control Agent.
7. Semantic Model and Dataset Agent.
8. Governance and Risk Agent.
9. Architecture Compliance Agent.
10. Committee Pack Agent.

## Architecture Compliance Agent

The new Architecture Compliance Agent validates whether the demand fits an approved Google Cloud architecture pattern:

- BI / Reporting data product.
- Data engineering product.
- Machine Learning data product.
- GenAI / RAG / Agentic data product.
- Streaming / real-time data product.

If a request uses a non-approved component or introduces a new architecture pattern, the agent must set:

```json
{
  "human_architecture_review_required": true,
  "recommended_next_action": "architect_review"
}
```

## Implementation plan

### Step 1 — Policy and architecture loaders

- Load Markdown policies from `docs/policies`.
- Load reference architecture from `docs/architecture`.
- Normalize policies into searchable chunks.

### Step 2 — Local retrieval

- Reuse low-cost local retrieval approach for MVP.
- Retrieve relevant policies by requirement text, initiative type and target consumption.

### Step 3 — Policy validation service

- Validate lifecycle completeness.
- Validate reconciliation controls.
- Validate semantic model obligation.
- Validate governance controls.
- Validate FinOps readiness.

### Step 4 — Architecture Compliance Agent

- Map request to approved architecture pattern.
- Detect missing components.
- Detect non-canonical components.
- Detect need for human Data Architect review.

### Step 5 — API endpoint

Add endpoint:

`POST /intake/policy-architecture-validate`

The endpoint must return:

- Classification.
- Relevant policies.
- Architecture pattern.
- Missing controls.
- FinOps gaps.
- Human review flag.
- Recommended next action.

### Step 6 — Tests

Add tests for:

- BI request with complete architecture.
- ML request missing feature layer.
- GenAI request missing knowledge governance.
- Streaming request requiring human review.
- New component not in catalog.

## Definition of done

- Architecture policy files versioned.
- Reference architecture versioned.
- Architecture Compliance Agent designed.
- Implementation path documented.
- Tests planned for Sprint 04 build phase.

## Next step

Implement the services and agent logic in code after the design PR is approved.
