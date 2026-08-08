# Sprint 14 · UI demo controls

## Objetivo

Hacer visible y operable desde el cockpit la carga de data sintética al modelo runtime, sin mezclar el control de demo con la lógica principal de intake, comité o tablero ejecutivo.

## Decisión de diseño

El control de demo se implementa como componente global del layout:

- No modifica la grilla CRUD principal.
- No acopla lógica de demo al flujo funcional del Comité Operativo.
- Permite resetear el backlog runtime desde cualquier vista.
- Mantiene una guía rápida embebida para ejecutar la demo.

## Incluye

- Componente `DemoControls`.
- Estilos aislados con CSS Module.
- Render global desde `layout.tsx`.
- Botón `Resetear demo`.
- Confirmación antes de reemplazar el backlog runtime.
- Llamada a `POST /api/demo/reset`.
- Recarga controlada de la UI luego del reset.
- Acceso a `GET /api/demo/cases` para ver la data semilla.
- Guía rápida embebida: reset, comité, scoring y tablero ejecutivo.

## Gobierno de datos demo

El botón no hardcodea registros en frontend. Solo invoca el proxy web, que llama al backend para materializar la data sintética versionada en `data/runtime/demand_backlog.json`.

## Validación esperada

En CI deben pasar:

- API tests.
- Web build.

Validación manual:

1. Levantar backend con `make dev-api`.
2. Levantar frontend con `make dev-web` o `npm run dev`.
3. Presionar `Resetear demo`.
4. Confirmar que la grilla muestra 10 demandas sintéticas.
5. Abrir Comité Operativo y validar filtros/edición/scoring.
6. Abrir Tablero Ejecutivo y validar KPIs con data materializada.

## Próximo incremento

Sprint 15 · Demo script y narrativa ejecutiva: secuencia de presentación, talking points, criterios de éxito y checklist previo a demo.
