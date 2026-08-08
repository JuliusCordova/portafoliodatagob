# Start here · ATLAS DataGob

Esta guía es la puerta de entrada rápida para entender ATLAS DataGob según el rol de quien revise el repositorio.

---

## 1. Lectura ejecutiva en 5 minutos

ATLAS DataGob es una plataforma piloto para gobernar la demanda de datos, analítica e IA desde la solicitud inicial hasta la priorización, comité, validación operativa y promoción a release candidate.

El objetivo no es reemplazar al comité, sino darle trazabilidad, criterios de decisión y evidencia.

Flujo principal:

```text
Demanda → Intake → Validación de política/arquitectura → Comité → Scoring → Demo → Evidencia → Release gate → Servicio gestionado
```

---

## 2. Qué revisar primero

### Sponsor ejecutivo

1. `docs/release-package/executive-product-one-pager.md`
2. `docs/release-package/executive-acceptance-checklist.md`
3. `docs/release-package/executive-three-minute-pitch.md`
4. `docs/deployment/release-candidate-checklist.md`
5. `docs/managed-service/managed-service-plan.md`

### Equipo técnico

1. `README.md`
2. `docs/product-landing/repository-navigation.md`
3. `docs/architecture/identity-propagation-ui-session-readiness.md`
4. `docs/deployment/controlled-cloud-run-pilot-execution.md`
5. `docs/deployment/production-promotion-gate.md`

### Operador de demo

1. `docs/product-landing/demo-run-consolidation.md`
2. `docs/demo/executive-demo-readiness.md`
3. `docs/deployment/authenticated-cloud-run-smoke.md`
4. `docs/deployment/pilot-operations-evidence-runbook.md`

### Equipo de operación

1. `docs/deployment/operational-observability-runbook.md`
2. `docs/deployment/incident-response-runbook.md`
3. `docs/managed-service/slo-support-model.md`
4. `docs/managed-service/production-hardening-backlog.md`

---

## 3. Rutas rápidas

| Necesidad | Ruta |
| --- | --- |
| Entender el producto | `README.md` |
| Preparar demo ejecutiva | `docs/product-landing/demo-run-consolidation.md` |
| Ejecutar piloto controlado | `docs/deployment/controlled-cloud-run-pilot-execution.md` |
| Revisar evidencia | `docs/deployment/pilot-operations-evidence-runbook.md` |
| Validar readiness operativo | `docs/deployment/operational-observability-runbook.md` |
| Promover release candidate | `docs/deployment/production-promotion-gate.md` |
| Planificar producción completa | `docs/managed-service/production-readiness-roadmap.md` |

---

## 4. Criterio de madurez actual

ATLAS DataGob ya tiene:

- API y UI funcional.
- Dataset sintético curado.
- Persistencia local y adapter Firestore.
- Modelo de roles y permisos.
- Propagación de identidad desde Web.
- Scripts Cloud Run.
- Smoke estándar y autenticado.
- Recolección de evidencia.
- Readiness operativo.
- Gate de release candidate.
- Handoff ejecutivo/técnico.
- Plan de servicio gestionado.

Todavía requiere para producción completa:

- Integración con identidad corporativa real.
- Observabilidad avanzada con métricas de negocio/operación.
- Gestión formal de secretos y entornos.
- Pruebas de carga y resiliencia.
- Modelo de soporte acordado.
- SLAs/SLOs validados con el sponsor.

---

## 5. Recomendación de uso

Para una revisión ejecutiva, usar este orden:

```text
One-pager → Demo ejecutiva → Readiness operativo → Release gate → Plan de servicio gestionado
```

Para una revisión técnica, usar este orden:

```text
README → Arquitectura/Auth → Cloud Run → Smoke → Evidencia → Gate → Backlog productivo
```
