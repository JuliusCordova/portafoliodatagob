# ATLAS DataGob · Governed Demand-to-Production Platform

ATLAS DataGob es una plataforma piloto para gobernar la demanda de proyectos de datos desde la solicitud inicial hasta la decisión de comité, priorización, demo ejecutiva, validación operativa, release candidate y plan de servicio gestionado.

Nació como parte del portafolio Ayniq y evolucionó hacia un acelerador reusable, multi-cliente y orientado a gobierno de datos empresarial.

---

## 1. Qué problema resuelve

En muchas organizaciones, la demanda de datos, analítica e IA se gestiona con correos, hojas de cálculo, comités manuales y criterios poco trazables. Esto genera tres problemas:

1. Las iniciativas compiten sin una priorización transparente.
2. El cumplimiento de gobierno, arquitectura, seguridad y valor de negocio se revisa tarde.
3. El paso de MVP a producción queda débilmente documentado.

ATLAS DataGob propone un flujo gobernado para convertir demanda dispersa en un backlog priorizado, auditable y defendible ante comité.

---

## 2. Flujo funcional

```text
Solicitud de negocio
  → Intake asistido por agentes
  → Validación de política y arquitectura
  → Revisión de comité operativo
  → Validación final de arquitectura de datos
  → Scoring financiero y estratégico
  → Backlog priorizado
  → Demo ejecutiva
  → Smoke tests y evidencia
  → Gate de release candidate
  → Plan de operación gestionada
```

---

## 3. Capacidades principales

| Capa | Capacidades |
| --- | --- |
| Intake | Registro de demanda, clasificación, señales de negocio y dominio. |
| Gobierno | Validación de políticas, brechas, controles y trazabilidad. |
| Arquitectura | Validación contra patrón canónico GCP, excepciones y roles requeridos. |
| Priorización | Scoring estratégico, financiero, operativo y técnico. |
| Comité | Estados de decisión, aprobación, reformulación, rechazo y scoring. |
| Persistencia | JSON local para demo y adaptador Firestore para piloto Cloud Run. |
| Seguridad | Modelo de roles, permisos y propagación de identidad. |
| UI | Cockpit por roles: intake, comité operativo y tablero ejecutivo. |
| Demo | Dataset sintético curado, reset controlado y guion ejecutivo. |
| Operación | Smoke tests, evidencia, readiness operativo, runbooks e incidentes. |
| Release | Gate Go / Conditional Go / No-Go para promoción a release candidate. |
| Servicio gestionado | Backlog de hardening, modelo SLO, soporte y roadmap productivo. |

---

## 4. Cómo empezar según tu rol

| Rol | Empieza aquí |
| --- | --- |
| Sponsor ejecutivo | [`docs/product-landing/start-here.md`](docs/product-landing/start-here.md) |
| Equipo técnico | [`docs/product-landing/repository-navigation.md`](docs/product-landing/repository-navigation.md) |
| Operador de demo | [`docs/product-landing/demo-run-consolidation.md`](docs/product-landing/demo-run-consolidation.md) |
| Equipo de piloto Cloud Run | [`docs/deployment/controlled-cloud-run-pilot-execution.md`](docs/deployment/controlled-cloud-run-pilot-execution.md) |
| Comité de release | [`docs/deployment/release-candidate-checklist.md`](docs/deployment/release-candidate-checklist.md) |
| Servicio gestionado | [`docs/managed-service/managed-service-plan.md`](docs/managed-service/managed-service-plan.md) |

---

## 5. Ejecución local

### API

```bash
cd portafoliodatagob
make dev-api
```

Health check:

```bash
curl http://localhost:8000/health
```

### Web

```bash
cd portafoliodatagob/apps/web
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

Abrir la URL expuesta por el entorno local o Cloud Shell.

---

## 6. Demo local recomendada

Seed/reset de datos demo:

```bash
cd portafoliodatagob
make seed-demo
curl -X POST http://localhost:8000/demo/reset
curl http://localhost:8000/demands/backlog
```

Validación web proxy:

```bash
curl -X POST http://localhost:3000/api/demo/reset
curl http://localhost:3000/api/demo/cases
```

Guía consolidada:

```text
docs/product-landing/demo-run-consolidation.md
```

---

## 7. Despliegue y piloto Cloud Run

El piloto Cloud Run está documentado como ejecución controlada, con despliegue opcional y evidencia generada por scripts.

Documentos clave:

```text
docs/deployment/cloud-run.env.example
docs/deployment/controlled-cloud-run-pilot-execution.md
docs/deployment/authenticated-cloud-run-smoke.md
docs/deployment/pilot-operations-evidence-runbook.md
docs/deployment/production-promotion-gate.md
```

Comando orquestador:

```bash
make controlled-pilot-execution
```

Gate de release candidate:

```bash
make production-promotion-gate
```

---

## 8. Validación técnica

```bash
make test
make lint-local
make validate-deploy-scripts
make validate-cloud-smoke-script
make validate-authenticated-cloud-smoke-script
make validate-pilot-evidence-script
make validate-production-promotion-gate-script
```

Build containers:

```bash
make docker-build
```

---

## 9. Estructura relevante del repositorio

```text
apps/api/                  API FastAPI, servicios de gobierno, scoring, auth y persistencia
apps/web/                  UI Next.js para intake, comité, tablero ejecutivo y demo
scripts/cloud_run/         Scripts de deploy, smoke, evidencia, pilot execution y release gate
data/demo/                 Dataset sintético curado para demo ejecutiva
data/runtime/              Backlog runtime local
docs/demo/                 Guiones y readiness de demo
docs/deployment/           Runbooks Cloud Run, smoke, evidencia y release candidate
docs/managed-service/      Backlog productivo, servicio gestionado, SLO y roadmap
docs/product-landing/      Entrada única del producto y consolidación de navegación
docs/release-package/      One-pager, handoff y capability map ejecutivo
docs/sprints/              Documentación incremental por sprint
```

---

## 10. Estado del producto

ATLAS DataGob se encuentra en estado piloto avanzado:

```text
Prototipo funcional local:        99%
MVP demo funcional:               98%
Piloto controlado Cloud Run:      95%
Producto enterprise piloto-ready: 96%
Producción gestionada completa:   90%
Roadmap total ATLAS DataGob:      93%
```

---

## 11. Principios de diseño

- Spec-Driven Development como fuente de verdad.
- Gobierno proporcional al riesgo, valor e impacto operativo.
- Arquitectura canónica reusable, no acoplada a un cliente.
- Demo curada y repetible.
- Seguridad, identidad y permisos desde el piloto.
- Evidencia operativa antes de promoción.
- Release candidate con decisión Go / Conditional Go / No-Go.
- Servicio gestionado como camino natural hacia producción.

---

## 12. Próximo paso recomendado

Ejecutar una demo ejecutiva de 7 minutos usando el dataset curado, capturar evidencia operativa y correr el gate de release candidate para determinar si el piloto puede promoverse a una validación productiva controlada.
