# Policy — FinOps by Design for Data, ML and GenAI Products

## Purpose

Every data, ML and GenAI initiative must include FinOps controls from intake, not after deployment.

## Mandatory fields

Every initiative must define:

- Domain.
- Data product or initiative ID.
- Cost owner.
- Technical owner.
- Environment.
- Expected consumers.
- Expected data volume.
- Expected query frequency.
- Expected refresh frequency.
- Expected serving pattern.
- Expected monthly cost band.

## Mandatory labels

All cloud resources must support the following labels where technically possible:

- `domain`
- `data_product`
- `initiative_id`
- `environment`
- `owner`
- `cost_center`
- `business_capability`

## BigQuery cost controls

The architecture must evaluate:

- Partitioning.
- Clustering.
- Aggregate tables.
- Materialized views where applicable.
- Query byte limits.
- Scheduled queries versus interactive queries.
- Reservations versus on-demand pricing where applicable.
- Avoidance of repeated full-table scans.

## Storage cost controls

The architecture must evaluate:

- Retention by layer.
- Lifecycle policies.
- Compression and file format.
- Raw data immutability requirements.
- Archive strategy for infrequently accessed data.

## ML cost controls

The architecture must evaluate:

- Batch prediction versus online serving.
- Endpoint replica minimums.
- Training job frequency.
- Feature refresh frequency.
- Model monitoring cost.

## GenAI / RAG / Agent cost controls

The architecture must evaluate:

- Token volume.
- Embedding refresh cadence.
- Vector index type.
- Retrieval frequency.
- Agent tool calls.
- Human approval requirement for expensive or risky actions.

## Escalation rules

Route to FinOps or Data Architect review when:

- Cost cannot be estimated.
- The request includes high-volume streaming.
- The request requires always-on model serving.
- The request requires low-latency RAG at scale.
- The request lacks resource labels or cost owner.
- The expected architecture bypasses cost controls.

## Acceptance criteria

An initiative is FinOps-ready when it has:

- Cost owner.
- Mandatory labels.
- Cost driver assumptions.
- Storage, query and serving cost controls.
- Budget and alert requirement.
- Architecture recommendation aligned to value and cost.
