# Documentation index · ATLAS DataGob

Este índice consolida la documentación principal de ATLAS DataGob por etapa de madurez.

---

## 1. Entrada de producto

| Documento | Propósito |
| --- | --- |
| `README.md` | Landing principal del producto. |
| `docs/product-landing/start-here.md` | Guía rápida por rol. |
| `docs/product-landing/repository-navigation.md` | Mapa de navegación del repositorio. |
| `docs/product-landing/demo-run-consolidation.md` | Flujo consolidado de demo. |

---

## 2. Release package ejecutivo

| Documento | Propósito |
| --- | --- |
| `docs/release-package/release-package-index.md` | Índice del paquete de entrega. |
| `docs/release-package/executive-product-one-pager.md` | Resumen ejecutivo del producto. |
| `docs/release-package/capability-map.md` | Capacidades por capa. |
| `docs/release-package/product-handoff.md` | Handoff técnico/operativo. |
| `docs/release-package/executive-acceptance-checklist.md` | Criterios de aceptación ejecutiva. |
| `docs/release-package/executive-three-minute-pitch.md` | Pitch ejecutivo breve. |

---

## 3. Arquitectura y seguridad

| Documento | Propósito |
| --- | --- |
| `docs/architecture/auth-role-model-readiness.md` | Modelo de roles y permisos. |
| `docs/architecture/identity-propagation-ui-session-readiness.md` | Propagación de identidad Web/API. |
| `docs/architecture/managed-persistence-readiness.md` | Preparación de persistencia gestionada. |
| `docs/architecture/persistence-configuration.md` | Configuración de repositorio. |
| `docs/architecture/firestore-persistence-adapter.md` | Adaptador Firestore. |

---

## 4. Demo y UX

| Documento | Propósito |
| --- | --- |
| `docs/demo/demo-readiness.md` | Preparación del dataset demo. |
| `docs/demo/executive-demo-script.md` | Guion narrativo. |
| `docs/demo/executive-demo-readiness.md` | Readiness de demo ejecutiva. |
| `docs/demo/ui-demo-controls.md` | Controles de demo en UI. |

---

## 5. Despliegue y piloto

| Documento | Propósito |
| --- | --- |
| `docs/deployment/cloud-run.env.example` | Variables de entorno. |
| `docs/deployment/cloud-run-deployment-readiness.md` | Preparación de despliegue. |
| `docs/deployment/cloud-run-deploy-scripts.md` | Scripts de despliegue. |
| `docs/deployment/cloud-run-smoke-deployment-guide.md` | Smoke estándar. |
| `docs/deployment/authenticated-cloud-run-smoke.md` | Smoke autenticado. |
| `docs/deployment/controlled-cloud-run-pilot-execution.md` | Orquestador de piloto. |

---

## 6. Operación, evidencia y release

| Documento | Propósito |
| --- | --- |
| `docs/deployment/pilot-operations-evidence-runbook.md` | Evidencia operativa. |
| `docs/deployment/pilot-operations-evidence-template.md` | Plantilla de evidencia. |
| `docs/deployment/operational-observability-runbook.md` | Readiness operativo. |
| `docs/deployment/incident-response-runbook.md` | Respuesta a incidentes. |
| `docs/deployment/production-promotion-gate.md` | Gate Go/No-Go. |
| `docs/deployment/release-candidate-checklist.md` | Checklist RC. |

---

## 7. Servicio gestionado

| Documento | Propósito |
| --- | --- |
| `docs/managed-service/production-hardening-backlog.md` | Backlog productivo. |
| `docs/managed-service/managed-service-plan.md` | Plan de servicio gestionado. |
| `docs/managed-service/slo-support-model.md` | SLO y soporte. |
| `docs/managed-service/production-readiness-roadmap.md` | Roadmap a producción. |

---

## 8. Historial incremental

| Ruta | Propósito |
| --- | --- |
| `docs/sprints/` | Documentos de entrega por sprint. |
| `.github/workflows/` | Validaciones CI. |
| `scripts/cloud_run/` | Automatización de deploy, smoke, evidencia y gate. |

---

## 9. Lecturas recomendadas por escenario

### Preparar una demo ejecutiva

```text
README.md
→ docs/product-landing/demo-run-consolidation.md
→ docs/demo/executive-demo-readiness.md
→ docs/release-package/executive-three-minute-pitch.md
```

### Validar piloto Cloud Run

```text
docs/deployment/cloud-run.env.example
→ docs/deployment/controlled-cloud-run-pilot-execution.md
→ docs/deployment/authenticated-cloud-run-smoke.md
→ docs/deployment/pilot-operations-evidence-runbook.md
```

### Revisar pase a release candidate

```text
docs/deployment/operational-observability-runbook.md
→ docs/deployment/production-promotion-gate.md
→ docs/deployment/release-candidate-checklist.md
```

### Planificar producción gestionada

```text
docs/managed-service/production-hardening-backlog.md
→ docs/managed-service/managed-service-plan.md
→ docs/managed-service/slo-support-model.md
→ docs/managed-service/production-readiness-roadmap.md
```
