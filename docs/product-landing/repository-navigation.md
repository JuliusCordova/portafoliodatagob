# Repository navigation · ATLAS DataGob

Esta guía consolida la navegación del repositorio para que el producto sea fácil de consumir por perfiles ejecutivos, técnicos y operativos.

---

## 1. Mapa principal

```text
README.md
  ├─ docs/product-landing/start-here.md
  ├─ docs/product-landing/demo-run-consolidation.md
  ├─ docs/release-package/
  ├─ docs/deployment/
  ├─ docs/managed-service/
  ├─ apps/api/
  ├─ apps/web/
  └─ scripts/cloud_run/
```

---

## 2. Documentos por propósito

### Producto y narrativa

| Documento | Uso |
| --- | --- |
| `README.md` | Landing principal del producto. |
| `docs/product-landing/start-here.md` | Entrada rápida por rol. |
| `docs/release-package/executive-product-one-pager.md` | One-pager ejecutivo. |
| `docs/release-package/executive-three-minute-pitch.md` | Pitch de 3 minutos. |
| `docs/release-package/capability-map.md` | Mapa de capacidades por capa. |

### Demo y adopción

| Documento | Uso |
| --- | --- |
| `docs/product-landing/demo-run-consolidation.md` | Flujo consolidado de demo. |
| `docs/demo/executive-demo-readiness.md` | Guion ejecutivo de demo. |
| `docs/demo/executive-demo-script.md` | Script narrativo de demo. |
| `docs/demo/demo-readiness.md` | Readiness del dataset demo. |

### Despliegue y piloto

| Documento | Uso |
| --- | --- |
| `docs/deployment/cloud-run.env.example` | Variables de entorno para Cloud Run y smoke. |
| `docs/deployment/cloud-run-deployment-readiness.md` | Preparación de despliegue. |
| `docs/deployment/cloud-run-deploy-scripts.md` | Scripts de despliegue. |
| `docs/deployment/cloud-run-smoke-deployment-guide.md` | Smoke estándar. |
| `docs/deployment/authenticated-cloud-run-smoke.md` | Smoke autenticado. |
| `docs/deployment/controlled-cloud-run-pilot-execution.md` | Orquestación del piloto controlado. |

### Operación y evidencia

| Documento | Uso |
| --- | --- |
| `docs/deployment/pilot-operations-evidence-runbook.md` | Recolección de evidencia de piloto. |
| `docs/deployment/operational-observability-runbook.md` | Readiness y observabilidad operativa. |
| `docs/deployment/incident-response-runbook.md` | Respuesta a incidentes. |
| `docs/deployment/production-promotion-gate.md` | Gate formal Go/No-Go. |
| `docs/deployment/release-candidate-checklist.md` | Checklist release candidate. |

### Servicio gestionado

| Documento | Uso |
| --- | --- |
| `docs/managed-service/production-hardening-backlog.md` | Backlog priorizado de hardening. |
| `docs/managed-service/managed-service-plan.md` | Modelo de servicio gestionado. |
| `docs/managed-service/slo-support-model.md` | SLO y soporte. |
| `docs/managed-service/production-readiness-roadmap.md` | Roadmap hacia producción gestionada. |

---

## 3. Código y runtime

| Ruta | Contenido |
| --- | --- |
| `apps/api/` | API FastAPI, dominio, servicios y pruebas. |
| `apps/web/` | UI Next.js, cockpit y proxies. |
| `scripts/` | Scripts de seed y smoke funcional. |
| `scripts/cloud_run/` | Deploy, smoke, evidencia, ejecución piloto y release gate. |
| `data/demo/` | Dataset demo curado. |
| `data/runtime/` | Backlog local runtime. |
| `data/canonical/` | Contratos canónicos de datos. |

---

## 4. Comandos clave

### Validación local

```bash
make test
make lint-local
```

### API y Web local

```bash
make dev-api
make dev-web
```

### Docker

```bash
make docker-build
```

### Demo data

```bash
make seed-demo
curl -X POST http://localhost:8000/demo/reset
```

### Cloud Run / piloto

```bash
make deploy-validate
make controlled-pilot-execution
make cloud-smoke
make authenticated-cloud-smoke
make collect-pilot-evidence
make production-promotion-gate
```

---

## 5. Flujo recomendado para revisar el repo

```text
README.md
  → docs/product-landing/start-here.md
  → docs/product-landing/demo-run-consolidation.md
  → docs/release-package/release-package-index.md
  → docs/deployment/controlled-cloud-run-pilot-execution.md
  → docs/deployment/production-promotion-gate.md
  → docs/managed-service/production-readiness-roadmap.md
```
