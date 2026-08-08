# Sprint 30 · Production promotion gate and release candidate checklist

## Objetivo

Convertir la evidencia del piloto controlado de ATLAS DataGob en un gate formal de promoción hacia release candidate.

## Resultado

El sprint agrega una capacidad no destructiva para evaluar si una versión puede promoverse como release candidate con una decisión objetiva:

- `GO`.
- `CONDITIONAL-GO`.
- `NO-GO`.

## Artefactos agregados

- `scripts/cloud_run/production_promotion_gate.py`.
- Target `make production-promotion-gate`.
- Target `make validate-production-promotion-gate-script`.
- Validación CI del gate.
- Variables de release candidate en `docs/deployment/cloud-run.env.example`.
- Runbook `docs/deployment/production-promotion-gate.md`.
- Checklist `docs/release-notes/release-candidate-checklist.md`.

## Criterios evaluados

- Identificación del release candidate.
- URLs reales API/Web.
- Revision IDs API/Web.
- Estado CI.
- Estado de contenedores.
- Smoke estándar.
- Smoke autenticado.
- Readiness operativo.
- Postura de autenticación.
- Postura de persistencia.
- Rollback plan.
- Paquete de evidencia.
- Aprobador técnico/de negocio.

## Guardrails

- No ejecuta deploy.
- No llama APIs externas.
- No toca Cloud Run.
- No modifica datos.
- No requiere secretos.
- Falla con `NO-GO` ante blockers.

## Validación esperada

- API tests.
- Web build.
- Container build API/Web.
- Deploy scripts validation.
- Smoke/evidence/gate scripts compile.

## Próximo incremento recomendado

Sprint 31 · Executive release package and product handoff.

Ese sprint debería empaquetar la historia final del producto: arquitectura, demo, operación, evidencias, release candidate y roadmap de producción gestionada.
