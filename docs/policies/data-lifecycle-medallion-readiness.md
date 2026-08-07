# Policy — Data Lifecycle and Medallion Readiness

## Purpose

Every initiative must describe how data moves from source extraction to consumption.

The lifecycle is not limited to Bronze, Silver and Gold. For ML and GenAI initiatives, the lifecycle can extend to Feature Layer, Knowledge Layer and Serving.

## Canonical lifecycle

`Sources -> Extraction -> Landing -> Bronze -> Silver -> Gold -> Feature Layer -> Knowledge Layer -> Serving -> Consumption`

## Bronze readiness

Bronze is required when source data must be preserved, audited or reprocessed.

Bronze must define:

- Source system.
- Extraction method.
- Raw storage location.
- Load timestamp.
- Batch or event identifier.
- Schema capture.
- Retention.
- Lineage metadata.
- Reprocessing strategy.

## Silver readiness

Silver is required when raw data must be trusted, conformed or reused.

Silver must define:

- Type standardization.
- Deduplication.
- Business key validation.
- Technical quality rules.
- Rejected record handling.
- Integration logic.
- Privacy or sensitive data tagging.
- Owner and steward.

## Gold readiness

Gold is required when data is consumed by business users, dashboards, recurring reports, KPIs, ML training or reusable analytical products.

Gold must define:

- Business grain.
- Facts and dimensions or justified analytical model.
- Certified metrics.
- KPI owner.
- Aggregates when needed.
- Semantic model alignment.

## Feature Layer readiness

Feature Layer is required when the initiative supports machine learning.

It must define:

- Feature definitions.
- Feature owner.
- Feature freshness.
- Training-serving consistency.
- Reuse potential.
- Monitoring requirements.

## Knowledge Layer readiness

Knowledge Layer is required when the initiative supports GenAI, RAG or agents.

It must define:

- Knowledge sources.
- Chunking strategy.
- Embedding strategy.
- Vector index.
- Refresh cadence.
- Source traceability.
- Retrieval governance.

## Serving readiness

Serving must define how the data product will be consumed:

- Dashboard.
- Certified dataset.
- Semantic model.
- API.
- Batch prediction.
- Online endpoint.
- RAG service.
- Agentic workflow.

## Agent decision rules

- If the lifecycle is incomplete, request more information.
- If the requested consumption is BI and no Gold/Semantic model is defined, raise a policy gap.
- If the requested consumption is ML and no Feature Layer is defined, raise a policy gap.
- If the requested consumption is GenAI/RAG and no Knowledge Layer is defined, raise a policy gap.
- If the request bypasses mandatory lifecycle layers without justification, route to Data Architect review.

## Acceptance criteria

A requirement is lifecycle-ready when the required layers are explicitly identified, controlled and mapped to the canonical architecture.
