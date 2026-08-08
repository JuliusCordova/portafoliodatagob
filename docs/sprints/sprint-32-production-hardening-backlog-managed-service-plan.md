# Sprint 32 · Production Hardening Backlog and Managed Service Plan

## Objetivo

Ordenar el camino final desde piloto controlado hacia producción gestionada, documentando el backlog de hardening, el modelo de servicio administrado, SLO/soporte y roadmap de readiness productivo.

## Contexto

Los sprints previos dejaron ATLAS DataGob con:

- Piloto funcional Web/API.
- Persistencia configurable.
- Cloud Run readiness.
- Smoke estándar y autenticado.
- Evidencia operativa.
- Readiness operativo.
- Production promotion gate.
- Release package ejecutivo.
- Handoff técnico y operativo.

Sprint 32 agrega la capa de gestión necesaria para decidir cómo sostener ATLAS más allá del piloto.

## Entregables

| Archivo | Propósito |
|---|---|
| `docs/managed-service/production-hardening-backlog.md` | Backlog priorizado P0/P1/P2 para endurecimiento productivo |
| `docs/managed-service/managed-service-plan.md` | Modelo de servicio gestionado, roles, cadencias y responsabilidades |
| `docs/managed-service/slo-support-model.md` | SLO inicial, severidades, atención y métricas operativas |
| `docs/managed-service/production-readiness-roadmap.md` | Roadmap por fases hacia producción gestionada |

## Decisiones de diseño

- Mantener el sprint documental para no introducir riesgo técnico después del release package.
- Separar backlog técnico, modelo operativo y roadmap para distintos públicos.
- Mantener una línea clara entre piloto controlado, hardening enterprise y servicio gestionado.
- Usar términos operativos accionables: owner, SLO, severidad, evidencia, gate, rollback y FinOps.

## Validación esperada

Aunque el sprint es documental, se mantiene la validación estándar del repositorio:

- API tests.
- Web build.
- Container build API/Web.
- Deploy scripts validation.

## Impacto

Este sprint permite responder tres preguntas clave de sponsor y operación:

1. ¿Qué falta para producción?
2. ¿Quién opera esto y bajo qué reglas?
3. ¿Cuál es el camino para convertirlo en servicio administrado?

## Criterios de aceptación

- Backlog productivo priorizado existe.
- Plan de servicio gestionado existe.
- Modelo SLO/soporte existe.
- Roadmap de producción gestionada existe.
- CI se mantiene en verde.

## Próximo incremento sugerido

**Sprint 33 · Product landing documentation and demo run consolidation**

Objetivo sugerido: consolidar un punto único de entrada para demo, instalación, ejecución local, despliegue Cloud Run, release package y servicio gestionado.
