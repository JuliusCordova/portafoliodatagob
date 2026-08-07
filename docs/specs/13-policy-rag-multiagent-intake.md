# Spec 13 · Policy RAG Multi-Agent Intake

## Decision

ATLAS DataGob will evolve the Sprint 04 intake from a single chatbot into a **multi-agent intake experience with Policy RAG**.

The intake must not only capture a business request. It must also validate whether the request is architecturally and governably ready according to reusable data lifecycle policies.

## Rationale

Business users and domain owners often describe needs in business language. A data governance intake must translate those needs into a structured, evaluable and governable initiative.

The product must validate the request against:

- Data lifecycle policies.
- Medallion or equivalent layer expectations.
- Data quality and reconciliation controls.
- Semantic model and certified dataset requirements.
- Domain ownership and stewardship.
- Risk, access, privacy and operational readiness.
- Reuse opportunities against existing projects and canonical domains.

## Policy Knowledge Base

The Policy RAG corpus will be stored initially as Markdown files under:

```text
knowledge/policies/
```

Each policy must be chunkable, versionable and traceable.

Recommended structure:

```text
knowledge/policies/
  data-lifecycle/
    policy-001-medallion-lifecycle.md
    policy-002-reconciliation-control-points.md
    policy-003-semantic-model-and-certified-datasets.md
    policy-004-quality-lineage-access-and-retention.md
  architecture/
    policy-005-workload-to-engine-decision.md
  intake/
    policy-006-intake-minimum-information.md
```

## Multi-Agent Architecture

### 1. Intake Conversation Agent

Guides the user through a conversational intake and asks only what is missing.

Responsibilities:

- Capture business problem.
- Identify sponsor, area and domain.
- Ask for expected value, urgency and decision context.
- Keep the interaction friendly and business-oriented.

### 2. Requirement Structuring Agent

Transforms the conversation into a structured demand object.

Responsibilities:

- Normalize title, description, objective and expected value.
- Identify data sources, candidate datasets, consumers and outputs.
- Produce a JSON-ready request for backend validation.

### 3. Initiative Classification Agent

Classifies the initiative as:

- Data engineering.
- Data governance.
- Machine learning.
- Agentic AI.
- Hybrid.

Responsibilities:

- Use deterministic rules first.
- Use LLM reasoning only as assistive explanation.
- Return confidence, signals and secondary categories.

### 4. Policy Retrieval Agent

Queries the Policy RAG corpus.

Responsibilities:

- Retrieve relevant policies based on request type, domain, lifecycle stage and expected output.
- Return cited policy fragments.
- Avoid inventing policies not present in the corpus.

### 5. Data Lifecycle Policy Agent

Validates whether the request clearly describes the lifecycle of the data.

Expected checks:

- Source and ingestion path identified.
- Raw/Bronze preservation or landing strategy defined.
- Silver cleansing, standardization and quality expectations defined.
- Gold business consumption layer defined when needed.
- Feature, knowledge or serving layer identified for ML/AI/agentic use cases.

### 6. Reconciliation and Control Agent

Validates control points and reconciliation expectations.

Expected checks:

- Reconciliation from source to ingestion.
- Reconciliation from Bronze to Silver.
- Reconciliation from Silver to Gold.
- Row counts, totals, keys, duplicates, nulls and business metric checks.
- Exception handling and remediation owner.

### 7. Semantic Model and Dataset Agent

Validates if the initiative requires a semantic model, certified dataset or reusable data product.

Expected checks:

- Business metrics are defined and owned.
- Gold output is understandable by business users.
- Semantic model is required for BI, self-service, recurring KPIs or executive dashboards.
- Certified dataset is required for reuse across domains.
- Dimension/time/calendar needs are identified.
- Aggregated tables are evaluated for cost, performance and dashboard usability.

### 8. Governance and Risk Agent

Validates governance readiness.

Expected checks:

- Data owner and data steward proposed or missing.
- Access, privacy and sensitivity risks identified.
- Catalog, lineage and metadata requirements identified.
- SLA, retention and support expectations captured.

### 9. Committee Pack Agent

Builds a decision-ready summary.

Output:

- Recommendation: execute, backlog, reformulate, reject or GO conditioned.
- Missing information.
- Policy gaps.
- Suggested conditions.
- Evidence for committee review.

## Required Output

The intake orchestration should produce a structure like:

```json
{
  "request_id": "DM-DEMO-001",
  "classification": {
    "primary_type": "data_engineering",
    "secondary_types": ["data_governance"],
    "confidence": 0.84
  },
  "policy_validation": {
    "status": "reformulate",
    "gaps": [
      "No reconciliation control from Silver to Gold was described.",
      "Semantic model ownership is missing."
    ],
    "required_policies": [
      "policy-001-medallion-lifecycle",
      "policy-002-reconciliation-control-points",
      "policy-003-semantic-model-and-certified-datasets"
    ]
  },
  "recommended_next_step": "Ask the requester to define certified metrics, semantic model owner and reconciliation controls."
}
```

## Human Decision Rule

Agents recommend. Humans decide.

The Policy RAG can mark a request as ready, incomplete or high risk, but final decision belongs to the defined governance workflow.

## MVP Scope

Included in Sprint 04:

- Markdown policy corpus.
- Policy retrieval service over local files.
- Multi-agent orchestration skeleton.
- Policy validation report for intake requests.
- Unit tests using synthetic requests.

Not included yet:

- Real vector database.
- Real Gemini/Vertex AI invocation.
- Enterprise authentication.
- Production GCS/RAG deployment.

## Acceptance Criteria

- A business request can be classified and validated against at least three policy documents.
- A request missing reconciliation controls returns a clear policy gap.
- A BI or executive reporting request requiring reusable metrics triggers semantic model validation.
- A ML or agentic request triggers feature, knowledge or serving layer validation.
- The response includes recommended next steps and human-readable rationale.
- The implementation remains reusable and not coupled to a specific client.
