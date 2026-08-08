# Sprint 17 · Managed persistence readiness

## Objetivo

Preparar ATLAS DataGob para evolucionar de persistencia local JSON a persistencia administrada sin cambiar la lógica funcional de gestión de demanda.

## Incluye

- Interfaz `DemandRepository`.
- Adapter `LocalJsonDemandRepository`.
- Factory `demand_repository_for`.
- Refactor de `demand_backlog.py` para usar el adapter detrás de `load_demand_records` y `write_demand_records`.
- Tests del adapter local.
- Documento `docs/architecture/managed-persistence-readiness.md`.

## Fuera de alcance

- Implementar Firestore, Cloud SQL, BigQuery o AlloyDB.
- Cambiar la UI.
- Cambiar endpoints públicos.
- Cambiar scoring, lifecycle o demo seed.

## Gobierno

El Sprint 17 introduce una frontera técnica: la lógica del backlog deja de conocer directamente cómo se leen/escriben registros.

El adapter local sigue validando el contrato de lifecycle antes de persistir, por lo que no se pierde control ni trazabilidad.

## Validación

```bash
make test
make lint-local
cd apps/web
npm run verify
```

## Próximo incremento

Sprint 18 · Persistence configuration: variables de entorno para elegir adapter, path runtime y documentación operativa para ambientes local/demo/productivo.
