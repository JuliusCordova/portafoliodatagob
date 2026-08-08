# Sprint 16 · Product hardening

## Objetivo

Endurecer ATLAS DataGob para que el backlog de demanda tenga contrato formal de modelo, lifecycle gobernado y validación antes de persistir registros.

Este sprint prepara el producto para una futura persistencia administrada sin cambiar aún la experiencia visual ni el flujo funcional de negocio.

## Incluye

- Contrato `demand_lifecycle.py`.
- `schema_version = demand-record-v1.0` para registros persistidos.
- Estados oficiales de demanda.
- Transiciones válidas de lifecycle.
- Validación mínima de forma de registros.
- Normalización automática antes de persistir.
- Validación de transiciones en `update_demand_record_status`.
- Validación de transición a `scored` en `update_demand_record_scoring`.
- Tests unitarios del contrato de lifecycle.
- Documento `docs/architecture/demand-lifecycle-contract.md`.

## Decisiones de diseño

1. El contrato vive fuera del API y fuera de la UI.
2. El backlog local JSON sigue siendo válido para MVP/demo.
3. La regla de lifecycle queda centralizada para evitar estados inconsistentes.
4. La UI no define estados; solo invoca APIs.
5. El siguiente repositorio administrado debe respetar el mismo contrato.

## Validación

```bash
make test
make lint-local
cd apps/web
npm run verify
```

## Próximo incremento

Sprint 17 · Managed persistence readiness: interfaz de repositorio, adapter local y preparación para backend administrado.
