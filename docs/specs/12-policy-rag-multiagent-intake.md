# ATLAS DataGob — Policy RAG Multi-Agent Intake

## Purpose

The intake must evolve from a simple chatbot into a multi-agent intake system that helps business users, domain owners and data owners structure data, ML and GenAI initiatives before committee review.

The system must validate each requirement against:

- Existing projects and domains.
- Data lifecycle policies.
- Reconciliation and control policies.
- Semantic model and certified dataset policies.
- Governance, quality, lineage and access policies.
- Google Cloud end-to-end reference architecture.
- FinOps-by-design controls.
- Operative Committee decision workflow.
- Data Architect final validation.

## Design principle

The intake is not an architecture generator.

The intake validates a request against policies and against a reference architecture predefined by a Data Architect. If the request does not fit, it escalates to human review.

The agent does not approve or reject the initiative by itself. It produces a validation package for the Operative Committee. The Data Architect, as part of the Operative Committee, performs the final architecture validation before the initiative can move forward or be rejected.

## Multi-agent model

1. Intake Conversation Agent.
2. Requirement Structuring Agent.
3. Initiative Classification Agent.
4. Similarity and Existing Projects Agent.
5. Policy Retrieval Agent.
6. Data Lifecycle Policy Agent.
7. Reconciliation and Control Agent.
8. Semantic Model and Dataset Agent.
9. Governance and Risk Agent.
10. Architecture Compliance Agent.
11. FinOps Readiness Agent.
12. Operative Committee Routing Agent.
13. Committee Pack Agent.

## Architecture Compliance Agent

This agent validates that every initiative fits an approved Google Cloud architecture pattern.

Approved patterns:

- BI / Reporting data product.
- Data engineering product.
- Machine Learning data product.
- GenAI / RAG / Agentic data product.
- Streaming / real-time data product.

The agent must not approve new components or new architecture flows autonomously.

If a request introduces a new component, bypasses a mandatory layer, or cannot be mapped to an approved architecture pattern, it must route the request to a Data Architect.

## Operative Committee and Data Architect workflow

After the user requirement is captured, structured and validated against policies, the request moves to Operative Committee validation.

The Operative Committee is responsible for reviewing:

- Business clarity and expected value.
- Initiative classification.
- Policy gaps.
- Architecture gaps.
- FinOps gaps.
- Domain, owner and steward alignment.
- Risk and governance implications.
- Agent recommendation and evidence.

The Data Architect is a mandatory member of the Operative Committee for architecture validation.

### Decision rules

1. If the request complies with policies and the canonical architecture, the Data Architect can approve the architecture validation and the committee can move the request to scoring or prioritization.
2. If the request does not comply with policies or architecture, the request must be marked as rejected or reformulation-required, but only after the Data Architect performs a final validation.
3. If the request introduces a new valid architectural need, the status must not be automatic rejection. It must be routed to Data Architect review as an architecture exception.
4. If the Data Architect confirms the exception should become a new approved pattern or component, the canonical architecture and policy corpus must be updated through PR before the pattern is reused.
5. If the Data Architect confirms non-compliance, the request is rejected with documented rationale, missing policies and rejected architecture gaps.

## Request lifecycle states

```text
Draft
  -> Intake Completed
  -> Policy and Architecture Validation
  -> Operative Committee Review
  -> Data Architect Final Validation
  -> Approved for Scoring | Reformulation Required | Rejected | Architecture Exception
```

## Policy corpus

The RAG policy corpus is stored as Markdown and can later be indexed into Cloud Storage JSONL, BigQuery vector search or Vertex AI Vector Search.

Initial corpus:

- Data lifecycle and Medallion readiness.
- Reconciliation and control points.
- Semantic model and certified datasets.
- Governance, quality, lineage and access.
- Google Cloud end-to-end reference architecture.
- FinOps-by-design.
- Operative Committee and Data Architect approval workflow.

## Expected validation output

```json
{
  "structured_request": {},
  "initiative_type": "data_engineering | data_governance | machine_learning | agentic_ai | hybrid | unknown",
  "architecture_pattern": "bi_reporting | data_engineering | machine_learning | genai_rag | streaming | unknown",
  "similar_projects": [],
  "policy_gaps": [],
  "architecture_gaps": [],
  "finops_gaps": [],
  "human_architecture_review_required": false,
  "operative_committee_review_required": true,
  "data_architect_final_validation_required": true,
  "recommended_questions": [],
  "recommended_next_action": "approve_for_scoring | request_more_info | reformulate | architect_review | reject_with_architect_validation",
  "committee_summary": "",
  "data_architect_decision": "pending | approved | rejected | exception_requested",
  "final_status": "pending_committee | approved_for_scoring | reformulation_required | rejected | architecture_exception"
}
```

## Human review triggers

Human Data Architect review is required when:

- The architecture pattern is unknown.
- A new service or component is proposed.
- A mandatory lifecycle layer is skipped.
- Reconciliation controls are absent for a data engineering or BI initiative.
- The semantic model is missing for reusable BI or executive consumption.
- The ML request lacks feature lifecycle and model monitoring.
- The GenAI/RAG request lacks knowledge source traceability or retrieval governance.
- Agentic actions affect production systems, customers, finances, access, risk or compliance.
- FinOps risk is high or cannot be estimated.
- The agent recommends rejection due to policy or architecture non-compliance.

## MVP storage approach

For MVP, policies can be stored as Markdown in the repository and loaded locally.

Future evolution:

1. Cloud Storage policy corpus in Markdown / JSONL.
2. Embeddings and vector index.
3. BigQuery vector search for low-cost MVP retrieval.
4. Vertex AI Vector Search for high-scale or low-latency retrieval.
5. Dataplex governance metadata as an additional grounding source.

## Acceptance criteria

- The intake returns policy gaps and architecture gaps.
- The intake identifies the architecture pattern.
- The intake identifies missing components.
- The intake identifies whether Data Architect review is required.
- The intake never invents a new architecture pattern as approved.
- The intake routes every validated requirement to Operative Committee review.
- The intake requires Data Architect final validation before rejection due to policy or architecture non-compliance.
- The final recommendation is explainable and committee-ready.
