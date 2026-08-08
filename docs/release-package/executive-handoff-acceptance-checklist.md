# ATLAS DataGob · Executive Handoff Acceptance Checklist

## 1. Propósito

Este checklist permite aceptar formalmente el handoff de ATLAS DataGob como producto piloto / release candidate candidate.

## 2. Aceptación ejecutiva

| Criterio | Estado | Evidencia |
|---|---|---|
| El problema de negocio está claramente definido | Pendiente | One-pager ejecutivo |
| La propuesta de valor está descrita | Pendiente | One-pager ejecutivo |
| El flujo end-to-end está documentado | Pendiente | Capability map |
| La demo ejecutiva tiene guion | Pendiente | Executive demo guide/script |
| Los criterios de piloto están claros | Pendiente | Release package index |
| Existe decisión recomendada Go/Conditional Go/No-Go | Pendiente | Production promotion gate |

## 3. Aceptación técnica

| Criterio | Estado | Evidencia |
|---|---|---|
| API y Web tienen CI en verde | Pendiente | GitHub Actions |
| Contenedores API/Web construyen | Pendiente | Container build |
| Scripts Cloud Run validan sintaxis | Pendiente | Deploy scripts workflow |
| Smoke estándar disponible | Pendiente | smoke_test_cloud_run.py |
| Smoke autenticado disponible | Pendiente | authenticated_smoke_test_cloud_run.py |
| Readiness operativo disponible | Pendiente | GET /ops/readiness |
| Gate RC disponible | Pendiente | production_promotion_gate.py |

## 4. Aceptación operativa

| Criterio | Estado | Evidencia |
|---|---|---|
| Runbook de despliegue disponible | Pendiente | Deployment docs |
| Runbook de smoke disponible | Pendiente | Smoke docs |
| Runbook de evidencia disponible | Pendiente | Evidence docs |
| Runbook de observabilidad disponible | Pendiente | Operational observability docs |
| Runbook de incidentes disponible | Pendiente | Incident response runbook |
| Rollback plan documentado | Pendiente | Production promotion gate docs |

## 5. Aceptación de seguridad

| Criterio | Estado | Evidencia |
|---|---|---|
| Roles y permisos documentados | Pendiente | Auth role docs + /auth/permissions |
| Propagación de identidad documentada | Pendiente | Identity propagation docs |
| Smoke negativo de permisos disponible | Pendiente | Authenticated smoke |
| Brecha de IdP real explicitada | Pendiente | Product handoff |

## 6. Aceptación de continuidad

| Criterio | Estado | Evidencia |
|---|---|---|
| Responsables sugeridos definidos | Pendiente | Product handoff |
| Riesgos residuales documentados | Pendiente | Product handoff |
| Siguientes sprints sugeridos | Pendiente | Release package index |
| Backlog de producción pendiente identificado | Pendiente | Sprint 32 sugerido |

## 7. Firma sugerida

```text
Sponsor ejecutivo: ______________________
Product Owner: __________________________
Data Architect: _________________________
Governance Lead: ________________________
Platform/DevOps Owner: __________________
Security/IAM Owner: _____________________
Support Owner: __________________________
Fecha: __________________________________
Decisión: Go / Conditional Go / No-Go
```
