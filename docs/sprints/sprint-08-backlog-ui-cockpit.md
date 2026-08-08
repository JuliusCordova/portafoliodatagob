# Sprint 08 · Backlog UI Cockpit

## Objetivo

Convertir ATLAS DataGob en un cockpit operativo de gobierno de demanda, donde las solicitudes persistidas puedan consultarse, seleccionarse y avanzar de estado con trazabilidad auditable.

## Alcance implementado

### Frontend

- Hero actualizado a `ATLAS DataGob · Sprint 08`.
- Métricas ejecutivas de backlog:
  - solicitudes registradas,
  - solicitudes en revisión,
  - solicitudes aprobadas,
  - eventos de trazabilidad.
- Tabla de backlog con:
  - `demand_id`,
  - estado,
  - patrón arquitectónico,
  - número de brechas,
  - decisión sugerida.
- Panel de detalle de solicitud con:
  - resumen de comité,
  - consumo esperado,
  - patrón,
  - decisión,
  - reviewers requeridos,
  - timeline de eventos.
- Acciones de comité:
  - aprobar a scoring,
  - solicitar reformulación,
  - rechazar.

### Next.js proxy

Se agregan rutas internas para evitar CORS y mantener el navegador apuntando al mismo origen:

```text
GET   /api/demands/backlog      -> GET   FastAPI /demands/backlog
PATCH /api/demands/status       -> PATCH FastAPI /demands/{demand_id}/status
```

### Backend utilizado

El Sprint 08 reutiliza los endpoints del Sprint 07:

```text
POST  /demands/validate-and-create
GET   /demands/backlog
GET   /demands/{demand_id}
PATCH /demands/{demand_id}/status
```

## Prueba manual esperada

1. Actualizar `main` o la rama del sprint.
2. Levantar backend:

```bash
cd ~/portafoliodatagob
make dev-api
```

3. Levantar frontend:

```bash
cd ~/portafoliodatagob/apps/web
npm run dev -- -H 0.0.0.0 -p 3000
```

4. Abrir Web Preview puerto 3000.
5. Presionar **Validar y guardar solicitud**.
6. Confirmar que aparece un registro `DEM-...` en la tabla de backlog.
7. Seleccionar la solicitud y ejecutar una acción de comité.
8. Confirmar que el timeline agrega un nuevo evento.

## Resultado esperado

ATLAS DataGob permite operar el ciclo mínimo de gobierno de demanda:

```text
Nueva solicitud
→ Validación multiagente
→ Registro en backlog
→ Revisión por comité / Arquitecto de Datos
→ Cambio de estado
→ Evento auditable
```

## Próximo sprint sugerido

Sprint 09 · Detalle de demanda y scoring operativo:

- cálculo de scoring desde backlog,
- filtros por estado/dominio/patrón,
- detalle expandido de brechas,
- estados controlados por catálogo,
- preparación para persistencia gestionada en GCP.
