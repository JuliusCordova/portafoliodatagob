# POLICY-002 · Reconciliation and Control Points

## Purpose

Ensure that data initiatives include control points that allow teams to validate completeness, consistency and business reliability across the lifecycle.

## Policy

Any initiative that moves or transforms data must define reconciliation controls between major stages.

## Required Control Points

### Source to Ingestion

Validate that data was received as expected.

Minimum evidence:

- Source extract identifier.
- Load timestamp.
- Row count or file count.
- Technical status.
- Error count.

### Ingestion to Bronze

Validate that the raw or landing record is preserved.

Minimum evidence:

- Row count comparison.
- Duplicate detection.
- Required metadata captured.
- Reprocessing key or load identifier.

### Bronze to Silver

Validate that transformation and cleansing rules are controlled.

Minimum evidence:

- Row count before and after transformation.
- Invalid records count.
- Null checks for mandatory fields.
- Data type and format checks.
- Duplicate and key uniqueness checks.
- Business rule exceptions.

### Silver to Gold

Validate that business-ready outputs remain consistent with trusted data.

Minimum evidence:

- Metric reconciliation.
- Aggregation checks.
- Control totals.
- Business key consistency.
- Certified metric owner.

### Gold to Consumption

Validate that dashboards, semantic models, APIs or agents consume certified data.

Minimum evidence:

- Dataset or semantic model name.
- Consumer owner.
- Refresh frequency.
- Access rule.
- Reconciliation result.

## Required Intake Questions

1. Which totals or metrics must reconcile?
2. What is the expected tolerance threshold?
3. Who reviews exceptions?
4. What happens when reconciliation fails?
5. Is reconciliation required up to Gold or only up to Silver?
6. Will the result feed BI, ML, RAG or agents?

## Validation Status

- `ready`: control points and owners are defined.
- `needs_clarification`: control points exist but evidence or owners are incomplete.
- `policy_gap`: no reconciliation strategy was provided.

## Common Gaps

- No row-count check.
- No business total validation.
- No owner for exceptions.
- No tolerance threshold.
- No Silver-to-Gold validation for business metrics.
