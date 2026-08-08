# ATLAS DataGob · Product Handoff Guide

## 1. Propósito

Este documento permite transferir ATLAS DataGob a un equipo técnico, sponsor ejecutivo o responsable de piloto sin depender de conocimiento tácito.

## 2. Repositorio

```text
Repository: JuliusCordova/portafoliodatagob
Default branch: main
Current package: Sprint 31 · Executive release package and product handoff
```

## 3. Componentes principales

```text
apps/api       FastAPI backend
apps/web       Next.js frontend
data           contratos, catálogo, seed demo y runtime local
docs           arquitectura, deployment, runbooks, release package y sprints
scripts        smoke tests, deployment helpers, seed demo y gates
```

## 4. Comandos locales clave

```bash
make test
make test-api
make lint-local
make seed-demo
make dev-api
make dev-web
```

## 5. Comandos Cloud Run / piloto

```bash
make deploy-validate
make deploy-api
make deploy-web
make deploy-verify
make cloud-smoke
make authenticated-cloud-smoke
make collect-pilot-evidence
make controlled-pilot-execution
make production-promotion-gate
```

## 6. Endpoints relevantes

| Endpoint | Uso |
|---|---|
| `GET /health` | Health básico del API |
| `GET /auth/permissions` | Modelo de roles y permisos |
| `POST /intake/policy-architecture-validate` | Validación agéntica |
| `POST /demands/validate-and-create` | Validación + registro de demanda |
| `GET /demands/backlog` | Backlog de demandas |
| `PATCH /demands/{demand_id}` | Edición gobernada |
| `PATCH /demands/{demand_id}/status` | Cambio de estado |
| `POST /demands/{demand_id}/score` | Scoring gobernado |
| `GET /demo/cases` | Dataset demo |
| `POST /demo/reset` | Reset demo controlado |
| `GET /ops/readiness` | Readiness operativo |

## 7. Variables críticas

### Persistencia

```bash
ATLAS_DEMAND_REPOSITORY=local_json|firestore
ATLAS_DEMAND_BACKLOG_PATH=data/runtime/demand_backlog.json
ATLAS_DEMO_SEED_PATH=data/demo/demand_backlog_seed.json
ATLAS_FIRESTORE_PROJECT=<project>
ATLAS_FIRESTORE_COLLECTION=<collection>
```

### Seguridad

```bash
ATLAS_AUTH_MODE=disabled|header
ATLAS_WEB_IDENTITY_MODE=disabled|static|passthrough
ATLAS_WEB_DEMO_USER=demo.operator@atlas.local
ATLAS_WEB_DEMO_ROLES=data_steward,committee_member,executive
```

### Piloto y release candidate

```bash
ATLAS_API_URL=<api-url>
ATLAS_WEB_URL=<web-url>
ATLAS_PILOT_EXECUTE_DEPLOY=false
ATLAS_RC_ID=atlas-datagob-rc-001
ATLAS_RC_APPROVER=<approver>
```

## 8. Flujo recomendado de piloto

1. Actualizar `main`.
2. Configurar variables Cloud Run.
3. Validar ambiente con `make deploy-validate`.
4. Ejecutar despliegue API/Web si corresponde.
5. Ejecutar smoke estándar.
6. Ejecutar smoke autenticado.
7. Consultar `/ops/readiness`.
8. Generar evidencia con `make collect-pilot-evidence`.
9. Ejecutar `make production-promotion-gate`.
10. Documentar decisión Go / Conditional Go / No-Go.

## 9. Criterios mínimos de handoff

- CI en verde.
- Scripts Cloud Run validados.
- Contenedores API/Web construyen correctamente.
- Runbooks disponibles.
- Demo seed disponible.
- Smoke estándar y autenticado documentados.
- Readiness operativo disponible.
- Gate de promoción disponible.
- Responsables definidos para negocio, arquitectura, plataforma y operación.

## 10. Responsables sugeridos

| Rol | Responsabilidad |
|---|---|
| Sponsor ejecutivo | Prioridad, adopción y decisión de inversión |
| Product Owner | Backlog funcional y casos de uso |
| Data Architect | Arquitectura canónica, patrones y excepciones |
| Data Governance Lead | Políticas, ownership y proceso de comité |
| Platform/DevOps Engineer | Cloud Run, Firestore, CI/CD y operación |
| Security/IAM Owner | Identidad, roles, acceso y hardening |
| Support Owner | Incidentes, monitoreo y continuidad Día 2 |

## 11. Riesgos residuales

- El modo `header` no reemplaza un IdP corporativo real.
- La evidencia Cloud Run real debe capturarse por ambiente.
- Firestore debe operar con IAM y backups definidos.
- Falta prueba de carga formal.
- Las políticas/RAG locales deben conectarse a fuentes corporativas para producción extendida.

## 12. Próximo paso recomendado

Cerrar un **release package ejecutivo** con capturas, URLs reales, evidencia de smoke, readiness operativo y decisión formal del promotion gate.
