# POLICY-003 · Semantic Model and Certified Datasets

## Purpose

Ensure that recurring business consumption is supported by governed, understandable and reusable semantic assets.

## Policy

Any initiative that produces recurring KPIs, executive dashboards, self-service analytics, cross-domain reporting or business-facing datasets must evaluate whether a semantic model or certified dataset is required.

## Semantic Model Required When

- The output will be consumed by business users through BI or self-service reporting.
- Metrics must be standardized across areas.
- The initiative produces KPIs, dashboards or recurring scorecards.
- The same dataset will be reused by multiple teams or domains.
- There are business definitions that need one certified interpretation.
- The data will support decisions with financial, operational or customer impact.

## Certified Dataset Required When

- The dataset becomes an enterprise reference for a domain.
- It supports more than one use case.
- It is exposed to other domains.
- It feeds BI, ML, GenAI, RAG or agents.
- Access and quality expectations must be monitored.

## Minimum Required Information

1. Business metrics and definitions.
2. Metric owner.
3. Grain of the dataset.
4. Dimensions and facts.
5. Time/calendar requirement.
6. Refresh frequency.
7. Access profile.
8. Consumers.
9. Certification owner.
10. Known data quality rules.

## Time Dimension Rule

If the request analyzes behavior over time, periods without activity, monthly or quarterly evolution, or business calendars, the intake must evaluate the need for a dedicated time dimension.

## Aggregated Tables Rule

If the request serves dashboards with high volume, repeated metrics or executive summaries, the intake must evaluate aggregated tables to reduce repeated calculations, improve performance and standardize metrics.

## Validation Status

- `ready`: semantic asset is defined or explicitly not required.
- `needs_clarification`: metrics or consumers are unclear.
- `policy_gap`: BI or self-service request lacks semantic model or certified dataset definition.

## Common Gaps

- KPI without owner.
- Dashboard without certified dataset.
- Recurring metric without definition.
- No time dimension for time-based analysis.
- No grain definition.
- Gold table defined but no semantic consumption plan.
