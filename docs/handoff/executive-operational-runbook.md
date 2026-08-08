# ATLAS DataGob · Executive-operational runbook

Release objetivo: `atlas-datagob-v1.0-rc1`

## 1. Objetivo del runbook

Guiar la operación del piloto ATLAS DataGob desde una perspectiva ejecutiva y operativa. Este runbook resume cómo iniciar, validar, demostrar, monitorear y escalar el producto durante un piloto controlado.

## 2. Audiencia

- Sponsor ejecutivo.
- Líder de portafolio.
- Comité operativo.
- Arquitectura de datos.
- Gobierno de datos.
- Plataforma / DevOps.
- Equipo de delivery.

## 3. Flujo operativo recomendado

### Paso 1 · Preparar ambiente

Validar variables mínimas:

```bash
export ATLAS_DEMAND_REPOSITORY=local_json
export ATLAS_DEMAND_BACKLOG_PATH=data/runtime/demand_backlog.json
export ATLAS_DEMO_SEED_PATH=data/demo/demand_backlog_seed.json
```

Para Firestore piloto:

```bash
export ATLAS_DEMAND_REPOSITORY=firestore
export ATLAS_FIRESTORE_PROJECT=<project-id>
export ATLAS_FIRESTORE_DATABASE="(default)"
export ATLAS_FIRESTORE_COLLECTION=atlas_demands
```

### Paso 2 · Ejecutar API local

```bash
make dev-api
```

Validaciones mínimas:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/ops/readiness
```

### Paso 3 · Ejecutar web local

```bash
cd apps/web
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

Abrir:

```text
http://localhost:3000
```

### Paso 4 · Resetear demo

Desde la UI usar `Resetear demo` o por API:

```bash
curl -X POST http://localhost:8000/demo/reset
```

### Paso 5 · Recorrer demo end-to-end

1. Dashboard principal: revisar backlog y scoring.
2. Comité operativo: registrar decisión, motivo, riesgo y condiciones.
3. Sponsor review: revisar paquete, imprimir o descargar evidencia.
4. Sponsor outcome: registrar visto bueno, observaciones, ajuste o pausa.
5. Sponsor follow-up: revisar SLA, asignar responsable, fecha compromiso y acción.

## 4. Rutas principales

- `/` Dashboard principal.
- `/committee` Comité operativo.
- `/sponsor-review` Paquete de decisión y sponsor outcome.
- `/sponsor-followup` Seguimiento sponsor, SLA y acciones de portafolio.

## 5. Validación técnica mínima

Antes de una demo o piloto:

```bash
make test
make docker-build
make validate-production-promotion-gate-script
```

Para Cloud Run:

```bash
make cloud-smoke
make authenticated-cloud-smoke
```

## 6. Criterios de salud operativa

Revisar `/ops/readiness` para validar:

- Configuración cargada.
- Repositorio de demandas accesible.
- Dataset demo disponible.
- Modo de autenticación conocido.
- Estado operativo legible para soporte.

## 7. Roles y responsabilidades durante piloto

| Rol | Responsabilidad |
|---|---|
| Sponsor | Aprobar piloto, revisar outcomes y remover bloqueos ejecutivos. |
| Portfolio Owner | Monitorear follow-up, SLA y responsables. |
| Comité operativo | Emitir decisión formal sobre demandas. |
| Data Architect | Validar patrón, excepciones y condiciones técnicas. |
| Data Steward | Apoyar calidad de datos y claridad de demanda. |
| Platform Admin | Operar ambiente, configuración, despliegue y evidencias. |

## 8. Manejo de incidentes

### API no responde

1. Revisar logs de runtime.
2. Validar variables de entorno.
3. Ejecutar `/health`.
4. Revisar `/ops/readiness`.
5. Reintentar con repositorio local JSON si Firestore falla.

### Web no carga

1. Validar `ATLAS_INTERNAL_API_BASE`.
2. Revisar build Next.js.
3. Confirmar conectividad hacia API.
4. Ejecutar web build en CI o local.

### Datos demo no aparecen

1. Ejecutar reset demo.
2. Validar ruta de seed data.
3. Revisar permisos si se usa Firestore.
4. Confirmar que `/demands/backlog` responde.

## 9. Cadencia de seguimiento piloto

- Daily operativo: 15 minutos para revisar bloqueos.
- Comité semanal: revisar decisiones, pausas y ajustes.
- Sponsor checkpoint: revisar outcomes y valor demostrado.
- Cierre piloto: evaluar GO / NO-GO hacia producción gestionada.

## 10. Cierre ejecutivo

El piloto debe cerrar con:

- Evidencia de decisiones.
- Paquetes exportados o imprimibles.
- Resultados sponsor registrados.
- SLA y responsables de seguimiento visibles.
- Recomendación de continuidad: escalar, extender, ajustar o cerrar.
