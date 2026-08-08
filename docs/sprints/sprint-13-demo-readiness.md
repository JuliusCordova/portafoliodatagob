# Sprint 13 · Demo readiness

## Objetivo

Preparar ATLAS DataGob para demos repetibles, estables y ejecutivas usando datos semilla, reset controlado del backlog y una guía end-to-end.

## Incluye

- Dataset semilla `data/demo/demand_backlog_seed.json`.
- Servicio de carga de casos demo.
- Reset del backlog runtime desde semilla.
- Endpoint `GET /demo/cases`.
- Endpoint `POST /demo/reset`.
- Proxies Next.js para `/api/demo/cases` y `/api/demo/reset`.
- Tests unitarios de carga y reset demo.
- Guía `docs/demo/end-to-end-demo-guide.md`.
- API version `0.6.2`.

## Casos curados

| Caso | Estado | Uso en demo |
| --- | --- | --- |
| DEM-DEMO-001 | scored | Mostrar score alto, VAN positivo y tablero ejecutivo. |
| DEM-DEMO-002 | operative_committee_review | Mostrar revisión del Comité, edición y recalcular score. |
| DEM-DEMO-003 | reformulation_required | Mostrar reformulación/cierre lógico por falta de información. |

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
