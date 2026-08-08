# ATLAS DataGob · Demand lifecycle contract

## Propósito

El backlog de demanda ya no debe depender de strings sueltos en UI, API o archivos JSON. Este contrato formaliza el ciclo de vida de una demanda para que el producto pueda evolucionar desde persistencia local hacia una base administrada sin perder trazabilidad ni gobierno.

## Versión del modelo

Cada demanda persistida debe incluir:

```text
schema_version = demand-record-v1.0
```

La versión permite migraciones futuras cuando el backlog pase a Firestore, Cloud SQL, AlloyDB, BigQuery u otro repositorio administrado.

## Estados válidos

```text
draft
intake_validated
operative_committee_review
reformulation_required
approved_for_scoring
scored
mvp_candidate
production_candidate
rejected
closed
archived
```

## Estados terminales

```text
rejected
closed
archived
```

Un estado terminal no debe volver al flujo operativo normal. `rejected` y `closed` solo pueden pasar a `archived`.

## Transiciones gobernadas

| Desde | Hacia permitido |
| --- | --- |
| draft | intake_validated, operative_committee_review, reformulation_required, rejected, closed |
| intake_validated | operative_committee_review, reformulation_required, approved_for_scoring, rejected, closed |
| operative_committee_review | approved_for_scoring, scored, reformulation_required, rejected, closed |
| reformulation_required | intake_validated, operative_committee_review, approved_for_scoring, rejected, closed |
| approved_for_scoring | scored, operative_committee_review, rejected, closed |
| scored | mvp_candidate, production_candidate, operative_committee_review, closed, archived |
| mvp_candidate | production_candidate, scored, closed, archived |
| production_candidate | scored, closed, archived |
| rejected | archived |
| closed | archived |
| archived | ninguno |

## Forma mínima del registro

Todo registro debe tener, como mínimo:

```text
demand_id
created_at
updated_at
status
decision
current_stage
request
classification
architecture
policy_gaps
architecture_gaps
finops_gaps
committee
committee_summary
agent_trace
events
```

Además, `request` debe incluir:

```text
title
description
requester_area
requester_role
```

## Reglas de persistencia local

Antes de escribir en `data/runtime/demand_backlog.json`, ATLAS normaliza y valida cada registro. La normalización agrega:

```text
schema_version
business_inputs
committee_inputs
events
policy_gaps
architecture_gaps
finops_gaps
agent_trace
```

La validación falla si falta estructura mínima, si el estado no existe en el lifecycle o si se intenta una transición inválida.

## Preparación para persistencia administrada

Este contrato permite que un futuro repositorio administrado implemente los mismos métodos sin cambiar el comportamiento funcional:

```text
load_demand_records
write_demand_records
create_demand_record
update_demand_record
update_demand_record_status
update_demand_record_scoring
reset_demo_backlog
```

La implementación local sigue siendo JSON para el MVP, pero el contrato ya separa el modelo del mecanismo físico de persistencia.
