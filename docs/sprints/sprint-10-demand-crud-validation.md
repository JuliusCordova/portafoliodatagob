# Sprint 10 · CRUD de demanda y validación editable

## Objetivo

Fortalecer la gestión operativa de demanda para que el Comité Operativo pueda editar y validar información antes de calcular o recalcular el score.

## Principio de diseño

ATLAS DataGob separa responsabilidades:

- El Data Owner captura valor de negocio y supuestos económicos.
- El Comité Operativo valida esa información y completa criterios técnicos/gobierno.
- El score se calcula solo después de contar con información explícita y trazable.

## Incluye

- Edición parcial de una demanda persistida.
- Actualización de campos editables del requerimiento.
- Actualización de `business_inputs`.
- Actualización de `committee_inputs`.
- Registro de `validation_state`.
- Actualización de decisión operativa.
- Evento auditable `demand_updated`.
- Endpoint `PATCH /demands/{demand_id}`.
- Proxy Next.js `PATCH /api/demands/update`.
- API version `0.6.1`.
- Tests unitarios de actualización editable y trazabilidad.

## Campos protegidos

La edición parcial no permite sobrescribir campos sensibles como:

- `demand_id`
- `created_at`
- `events`
- payloads completos de validación histórica

## Flujo esperado

1. El usuario registra demanda desde Intake.
2. El Comité abre la demanda desde la grilla.
3. El Comité valida/ajusta datos del Data Owner.
4. El Comité completa criterios técnicos/gobierno.
5. ATLAS registra `demand_updated`.
6. Luego se calcula score con el endpoint de Sprint 09.

## Validación manual

```bash
curl -X PATCH http://localhost:8000/demands/<DEMAND_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "request_update": {"requester_area":"Ventas", "domain_hint":"Clientes"},
    "business_inputs": {"operational_impact":4, "van_usd":25500, "roi_percent":80},
    "committee_inputs": {"data_readiness":4, "technical_feasibility":4, "reuse_potential":5},
    "validation_state":"committee_validated",
    "decision":"ready_for_scoring",
    "actor":"Data Steward",
    "comment":"Checklist validado por comité operativo."
  }'
```

## Próximo incremento sugerido

Sprint 11 · Experiencia UI de edición inline en la grilla: modal lateral, validación de campos obligatorios, guardado parcial y recálculo de score desde la misma vista del Comité Operativo.
