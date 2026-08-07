# Sprint 04 · Policy RAG Multi-Agent Intake

## Objective

Build the next evolution of ATLAS DataGob intake: a multi-agent intake flow that validates business requests against data lifecycle and governance policies.

## Why this sprint matters

The intake must help business users and domain owners structure their ideas and understand whether their request is ready for evaluation.

The system should detect gaps before a committee discussion, such as:

- Missing lifecycle definition.
- Missing reconciliation controls.
- Missing semantic model or certified dataset.
- Missing data owner or steward.
- Missing quality, lineage or access controls.

## Scope

### Documentation and Policy Corpus

- Add Policy RAG specification.
- Add Markdown policy corpus for:
  - Data lifecycle and Medallion readiness.
  - Reconciliation control points.
  - Semantic model and certified datasets.
  - Governance, quality, lineage and access.

### Backend

- Policy document loader.
- Local keyword/semantic-lite retrieval over Markdown policies.
- Policy validation service.
- Multi-agent orchestration skeleton.
- Intake policy validation endpoint.

### Agents

- Intake Conversation Agent.
- Requirement Structuring Agent.
- Classification Agent.
- Policy Retrieval Agent.
- Data Lifecycle Policy Agent.
- Reconciliation and Control Agent.
- Semantic Model and Dataset Agent.
- Governance and Risk Agent.
- Committee Pack Agent.

### Tests

- Request with missing reconciliation must return policy gap.
- BI request without semantic model must return policy gap.
- ML request must evaluate Feature Layer need.
- Agentic/RAG request must evaluate Knowledge Layer need.
- Governance request must validate owner, steward, access and lineage.

## Expected Output

For each intake request, ATLAS DataGob should produce:

- Structured request.
- Initiative classification.
- Similar projects.
- Policy gaps.
- Recommended next questions.
- Committee-ready summary.

## Not in Scope Yet

- Real vector database.
- Real Vertex AI / Gemini invocation.
- Cloud Storage policy index.
- Enterprise authentication.
- Production deployment.

## Definition of Done

- Policy corpus is versioned.
- Multi-agent design is documented.
- Local policy retrieval is implemented.
- Validation endpoint is available.
- Unit tests pass locally and in GitHub Actions.
- The sprint keeps the product generic and reusable.
