# ATLAS DataGob · Guía de demo end-to-end

## Objetivo

Ejecutar una demo repetible de ATLAS DataGob sin depender de captura manual desde cero. La demo usa **10 demandas sintéticas semilla**, materializadas en el modelo runtime del backlog.

La data no está hardcodeada en la UI. Se guarda como registros reales del modelo de datos local en:

```text
data/runtime/demand_backlog.json
```

El seed versionado está en:

```text
data/demo/demand_backlog_seed.json
```

## 1. Materializar data sintética en el modelo runtime

```bash
make seed-demo
```

Este comando carga las 10 demandas sintéticas desde `data/demo/demand_backlog_seed.json` y las persiste como registros del backlog en `data/runtime/demand_backlog.json`.

## 2. Levantar backend

```bash
make dev-api
```

Validar salud:

```bash
curl http://localhost:8000/health
```

## 3. Resetear backlog de demo desde API

```bash
curl -X POST http://localhost:8000/demo/reset
```

Esto reemplaza el archivo runtime local `data/runtime/demand_backlog.json` por los casos curados de `data/demo/demand_backlog_seed.json` y agrega un evento auditable `demo_reset`.

## 4. Revisar casos semilla y backlog persistido

```bash
curl http://localhost:8000/demo/cases
curl http://localhost:8000/demands/backlog
```

La respuesta de `/demands/backlog` debe mostrar mínimo 10 demandas `DEM-DEMO-*` porque ya están persistidas en el modelo runtime.

## 5. Levantar frontend

```bash
cd apps/web
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

En Cloud Shell, abrir el puerto 3000 desde Web Preview.

## 6. Storyline sugerido

### Escena 1 · Intake negocio

Mostrar cómo el Data Owner registra una nueva demanda con valor de negocio, supuestos económicos y contexto funcional.

### Escena 2 · Comité Operativo

Abrir la grilla, filtrar por dominio o área, seleccionar `DEM-DEMO-002` o `DEM-DEMO-006` y explicar que está pendiente de completar checklist técnico/gobierno.

Completar o ajustar:

- Disponibilidad/calidad de datos.
- Viabilidad técnica.
- Esfuerzo.
- Riesgo/control.
- Reutilización.

Guardar parcial y mostrar el evento en la trazabilidad.

### Escena 3 · Recalcular score

Desde el panel lateral, recalcular score con los datos validados. Explicar que ATLAS no inventa VAN, TIR, ROI ni payback: usa datos explícitos del Data Owner y validación del comité.

### Escena 4 · Tablero Ejecutivo

Cambiar a Tablero Ejecutivo y mostrar:

- Total de demandas.
- Score promedio.
- Casos de alta prioridad.
- Top iniciativas.
- VAN/ROI/Payback cuando existan datos.
- Brechas agregadas.

### Escena 5 · Reformulación, rechazo o MVP

Seleccionar:

- `DEM-DEMO-003` para reformulación.
- `DEM-DEMO-008` para rechazo/cierre lógico.
- `DEM-DEMO-010` para candidato a MVP.

## 7. Validaciones locales recomendadas

Backend:

```bash
make test
make lint-local
```

Frontend:

```bash
cd apps/web
npm run verify
```

## 8. Mensaje ejecutivo de cierre

ATLAS DataGob convierte la gestión de demanda de datos en un flujo gobernado, trazable y priorizable: negocio captura valor, los agentes estructuran y validan, el comité completa gobierno/arquitectura, y la dirección decide con evidencia.
