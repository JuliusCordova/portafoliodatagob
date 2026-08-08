# ATLAS DataGob · Capability Map

## 1. Mapa de capacidades

| Capa | Capacidad | Estado | Sprints clave |
|---|---|---:|---|
| Producto | Concepto ATLAS DataGob | Completo | 00–02 |
| Dominio | Modelo canónico de demanda | Completo | 03, 16 |
| Gobierno | Policy RAG local | Completo | 04 |
| Gobierno | Validación de arquitectura canónica | Completo | 04 |
| Workflow | Comité operativo y validación final | Completo | 04, 08 |
| UX | Intake cockpit | Completo | 05–06.3 |
| Persistencia | Backlog local | Completo | 07 |
| Persistencia | Abstracción de repositorio | Completo | 17 |
| Persistencia | Configuración local_json / Firestore | Completo | 18–19 |
| Scoring | Priorización y score | Completo | 09–11 |
| UX | CRUD gobernado e inline editing | Completo | 10–12 |
| Demo | Dataset sintético materializado | Completo | 13–15 |
| Runtime | Contenedores y Cloud Run readiness | Completo | 20–22 |
| Seguridad | Roles y permisos | Completo | 23 |
| Seguridad | Propagación de identidad Web → API | Completo | 24 |
| Validación | Smoke autenticado | Completo | 25 |
| Evidencia | Paquete de evidencia piloto | Completo | 26 |
| Operación | Ejecución controlada de piloto | Completo | 27 |
| UX ejecutiva | Ribbon y guía ejecutiva | Completo | 28 |
| Observabilidad | Readiness operativo e incidentes | Completo | 29 |
| Release | Gate de release candidate | Completo | 30 |
| Handoff | Paquete ejecutivo de entrega | En curso | 31 |

## 2. Capacidades funcionales

### Intake y estructuración

- Captura solicitud de negocio.
- Registra área, dominio, rol solicitante y consumo esperado.
- Estructura la demanda para evaluación.

### Validación agéntica

- Clasifica tipo de iniciativa.
- Evalúa política, arquitectura y FinOps.
- Identifica brechas y ruta de comité.
- Recomienda revisión por Arquitecto de Datos cuando corresponde.

### Comité y scoring

- Permite edición gobernada.
- Separa inputs del Data Owner e inputs del Comité.
- Calcula score, prioridad, VAN, ROI, TIR y payback cuando hay métricas disponibles.
- Mantiene trazabilidad de eventos.

### Dashboard ejecutivo

- Muestra score promedio, prioridad, VAN total y demandas scored.
- Ranking Top 5 de iniciativas.
- Distribución por prioridad y brechas.

## 3. Capacidades técnicas

### API

- FastAPI.
- Endpoints de health, intake, demandas, scoring, metadata, políticas, auth y readiness operativo.
- Versionado API.

### Web

- Next.js.
- Proxy Web → API.
- Session banner.
- Demo controls.
- Executive demo ribbon.

### Persistencia

- Local JSON por defecto para desarrollo.
- Firestore adapter para piloto gestionado.
- Configuración por variables de entorno.

### Seguridad

- Auth mode `disabled` para demo local.
- Auth mode `header` para piloto.
- Roles: viewer, data_owner, data_steward, data_architect, committee_member, executive, platform_admin.
- Permisos explícitos por ruta.

### Operación

- Dockerfiles API/Web.
- Scripts Cloud Run.
- Smoke estándar.
- Smoke autenticado.
- Evidence collector.
- Controlled pilot execution.
- Operational readiness.
- Production promotion gate.

## 4. Capacidades pendientes para producción completa

- Integración con IdP real.
- Auditoría productiva centralizada.
- Observabilidad administrada con métricas/SLOs.
- Gestión segura de secretos.
- Hardening de IAM y red.
- Pruebas de carga.
- Runbook Día 2 con responsables definidos.
- Integración con repositorios corporativos de políticas y arquitectura.
