# Sprint 13 · Demo readiness

## Objetivo

Preparar ATLAS DataGob para demos repetibles, estables y ejecutivas usando datos sintéticos semilla, reset controlado del backlog y una guía end-to-end.

## Decisión de diseño

Los casos demo no están hardcodeados en la lógica de la aplicación. Están versionados como **data sintética semilla** en `data/demo/demand_backlog_seed.json`.

Esto permite:

- Reiniciar la demo con un backlog consistente.
- Mostrar una grilla con volumen mínimo realista.
- Validar filtros por dominio, área, estado y prioridad.
- Mostrar tablero ejecutivo con distribución de casos.
- Probar trazabilidad con eventos auditables.

## Incluye

- Dataset semilla `data/demo/demand_backlog_seed.json` con mínimo 10 demandas sintéticas registradas.
- Servicio de carga de casos demo.
- Reset del backlog runtime desde semilla.
- Endpoint `GET /demo/cases`.
- Endpoint `POST /demo/reset`.
- Proxies Next.js para `/api/demo/cases` y `/api/demo/reset`.
- Tests unitarios de carga y reset demo.
- Guía `docs/demo/end-to-end-demo-guide.md`.
- API version `0.6.2`.

## Casos sintéticos curados

| Caso | Dominio | Área | Estado | Uso en demo |
| --- | --- | --- | --- | --- |
| DEM-DEMO-001 | Ventas | Comercial | scored | Mostrar score alto, VAN positivo y tablero ejecutivo. |
| DEM-DEMO-002 | Clientes | Marketing | operative_committee_review | Mostrar revisión del Comité, edición y recalcular score. |
| DEM-DEMO-003 | Logística | Operaciones | reformulation_required | Mostrar reformulación por falta de información. |
| DEM-DEMO-004 | Producto | Producto | scored | Mostrar data product maestro y reutilización alta. |
| DEM-DEMO-005 | Finanzas | Finanzas | scored | Mostrar VAN alto, prioridad media y trade-offs. |
| DEM-DEMO-006 | Clientes | Gobierno de Datos | operative_committee_review | Completar checklist técnico/gobierno. |
| DEM-DEMO-007 | Logística | Supply Chain | approved_for_scoring | Caso listo para cálculo de score. |
| DEM-DEMO-008 | Transversal | TI | rejected | Mostrar rechazo/cierre lógico trazable. |
| DEM-DEMO-009 | Logística | Operaciones | scored | Mostrar dashboard operativo con prioridad media. |
| DEM-DEMO-010 | Gobierno de Datos | Gobierno de Datos | mvp_candidate | Mostrar transición futura hacia MVP. |

## Gobierno

El reset demo reemplaza solo el backlog runtime local. No modifica catálogos canónicos, políticas ni especificaciones del producto. Cada registro cargado agrega un evento `demo_reset` para mantener trazabilidad.

## Validación

```bash
make test
make lint-local
cd apps/web
npm run verify
```

## Próximo incremento

Sprint 14 · UI demo controls: botón visible para resetear demo, confirmación visual y guía rápida embebida en el cockpit.
