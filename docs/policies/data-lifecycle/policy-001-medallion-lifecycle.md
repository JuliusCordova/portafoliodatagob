# POLICY-001 · Data Lifecycle and Medallion Readiness

## Purpose

Ensure that each data initiative explains how data moves from source to trusted consumption.

## Policy

Any initiative that creates, transforms, exposes or consumes enterprise data must describe the data lifecycle and the controls expected by layer.

The Medallion pattern is a logical maturity model. It orders layers, but the end-to-end architecture must still explain ingestion, processing, governance and consumption.

## Minimum Questions

1. Which source systems, files, APIs or events are involved?
2. What ingestion mode is expected: batch, streaming, CDC, API or file load?
3. Is there a landing or Bronze layer?
4. What cleansing, validation and standardization are expected in Silver?
5. What business-ready output is expected in Gold?
6. Is the output for BI, ML, GenAI, agents or operational apps?
7. Is a Feature Layer, Knowledge Layer or Serving Layer required?
8. Who owns the dataset or data product?
9. What catalog, lineage and access controls are required?

## Layer Expectations

### Ingestion

Sources and ingestion mode must be clear.

### Bronze

Bronze preserves source data for traceability, audit and reprocessing.

### Silver

Silver creates clean, standardized and integrated data with quality rules.

### Gold

Gold creates business-ready data for KPIs, dashboards, decision-making or certified consumption.

### Feature Layer

Required when the request supports ML or predictive analytics.

### Knowledge Layer

Required when the request supports RAG, search, GenAI, LLMs or agents.

### Serving Layer

Required when data, insights or model outputs are exposed through dashboards, APIs, apps or agent tools.

## Validation Status

- `ready`: lifecycle sufficiently defined.
- `needs_clarification`: lifecycle exists but some controls are unclear.
- `policy_gap`: lifecycle stages are missing.
- `not_applicable`: request does not involve data lifecycle.

## Common Gaps

- Missing ingestion path.
- Missing Bronze preservation.
- Missing Silver quality rules.
- Missing Gold consumption definition.
- ML request without Feature Layer.
- Agentic or RAG request without Knowledge Layer.
