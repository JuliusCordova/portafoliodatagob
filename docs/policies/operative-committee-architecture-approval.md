# Policy — Operative Committee and Data Architect Architecture Approval

## Purpose

Define the governance workflow after an intake requirement has been captured and validated by ATLAS DataGob agents.

The goal is to ensure that requirements are not approved, rejected or reworked solely by an agent. The final governance decision must remain human-led, with the Data Architect acting as the required architecture validator inside the Operative Committee.

## Scope

This policy applies to all initiatives classified as:

- Data engineering.
- Data governance.
- BI / reporting.
- Machine learning.
- GenAI / RAG / agentic AI.
- Streaming or real-time data products.
- Hybrid initiatives.

## Mandatory workflow

```text
User Requirement
  -> Intake Conversation
  -> Requirement Structuring
  -> Policy RAG Validation
  -> Architecture Compliance Validation
  -> Operative Committee Review
  -> Data Architect Final Validation
  -> Approved for Scoring | Reformulation Required | Rejected | Architecture Exception
```

## Operative Committee responsibilities

The Operative Committee must review:

- The structured requirement.
- Business value and urgency.
- Initiative classification.
- Domain, subdomain, owner and steward alignment.
- Policy compliance.
- Architecture compliance.
- FinOps readiness.
- Risks and dependencies.
- Agent-generated evidence.
- Recommended decision.

## Data Architect responsibilities

The Data Architect is responsible for final validation of:

- Alignment with the canonical Google Cloud end-to-end architecture.
- Use of approved components.
- Correct placement in the data lifecycle.
- Required layers: extraction, landing, bronze, silver, gold, feature layer, knowledge layer, serving, monitoring and FinOps.
- Reconciliation and control points.
- Semantic model or certified dataset obligation.
- ML feature lifecycle and model serving pattern.
- GenAI/RAG source traceability and retrieval governance.
- Architecture exception handling.

## Decision rules

### Approve for scoring

A requirement can move to scoring when:

- It has a clear business objective.
- It fits an approved architecture pattern.
- Mandatory policy controls are present or explicitly planned.
- The Data Architect validates the architecture.
- The Operative Committee accepts the package for prioritization.

### Reformulation required

A requirement must be returned for reformulation when:

- The business objective is unclear.
- The data source is not sufficiently described.
- The expected consumption is ambiguous.
- The owner, steward or domain is missing.
- The request can be corrected without creating an architecture exception.

### Rejected

A requirement can be rejected only after Data Architect final validation when:

- It violates mandatory policy controls.
- It bypasses required architecture layers without justified exception.
- It introduces unacceptable security, governance or FinOps risk.
- It proposes an unsupported architecture pattern and the Data Architect does not approve an exception.

The rejection must include:

- Policy gaps.
- Architecture gaps.
- Data Architect rationale.
- Recommended corrective action if applicable.

### Architecture exception

A requirement must be marked as architecture exception when:

- It introduces a potentially valid new component.
- It requires a new approved architecture pattern.
- It cannot be solved with the current canonical architecture but may represent a real business need.

Architecture exceptions are not reusable until the canonical architecture and policy corpus are updated through PR.

## Agent behavior rules

The agents may:

- Detect gaps.
- Recommend a decision path.
- Build evidence for committee review.
- Route to Data Architect review.

The agents must not:

- Reject a request without Data Architect final validation.
- Approve a new architecture component.
- Create a new canonical pattern by themselves.
- Override Operative Committee decisions.

## Minimum output fields

Every policy and architecture validation must include:

```json
{
  "operative_committee_review_required": true,
  "data_architect_final_validation_required": true,
  "data_architect_decision": "pending | approved | rejected | exception_requested",
  "committee_decision": "pending | approved_for_scoring | reformulation_required | rejected | architecture_exception",
  "decision_rationale": "",
  "policy_gaps": [],
  "architecture_gaps": [],
  "required_actions_before_resubmission": []
}
```

## Principle

ATLAS DataGob accelerates intake and validation, but architecture accountability remains with the Data Architect and the Operative Committee.
