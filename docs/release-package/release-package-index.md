# ATLAS DataGob · Executive Release Package Index

## 1. Objetivo del paquete

Este paquete consolida la historia ejecutiva, técnica y operativa de ATLAS DataGob para facilitar una decisión de piloto, handoff o promoción a release candidate.

## 2. Lectura ejecutiva recomendada

1. `docs/release-package/executive-product-one-pager.md`
2. `docs/release-package/capability-map.md`
3. `docs/release-package/product-handoff.md`
4. `docs/deployment/production-promotion-gate.md`
5. `docs/deployment/release-candidate-checklist.md`

## 3. Lectura técnica recomendada

1. `docs/deployment/cloud-run-deployment.md`
2. `docs/deployment/cloud-run-deploy-scripts.md`
3. `docs/deployment/cloud-run-smoke-deployment-guide.md`
4. `docs/deployment/authenticated-cloud-run-smoke.md`
5. `docs/deployment/controlled-cloud-run-pilot-execution.md`
6. `docs/deployment/pilot-operational-observability.md`
7. `docs/deployment/pilot-incident-response-runbook.md`

## 4. Evidencia y release

1. `docs/deployment/evidence/pilot-operations-evidence-template.md`
2. `docs/deployment/pilot-operations-evidence-runbook.md`
3. `docs/release-notes/pilot-release-notes-template.md`
4. `scripts/cloud_run/collect_pilot_evidence.py`
5. `scripts/cloud_run/production_promotion_gate.py`

## 5. Demo ejecutiva

1. `docs/demo/executive-demo-guide.md`
2. `docs/demo/executive-demo-script.md`
3. `docs/demo/demo-readiness-checklist.md`

## 6. Mensaje para sponsor

ATLAS DataGob permite mostrar una ruta clara desde demanda de negocio hasta priorización ejecutiva y promoción controlada. El producto ya cuenta con UI, API, persistencia configurable, roles, smoke, observabilidad mínima, runbooks y gate formal de release candidate.

La conversación ejecutiva ya no debería centrarse solo en si la demo funciona, sino en qué caso de negocio se quiere pilotear primero, bajo qué sponsor y con qué responsables operativos.

## 7. Decisión sugerida

```text
Decision: Conditional Go to controlled pilot
Condition 1: Ejecutar despliegue real Cloud Run con Firestore.
Condition 2: Capturar evidencia real estándar + autenticada.
Condition 3: Ejecutar /ops/readiness y production promotion gate.
Condition 4: Nombrar responsables de producto, plataforma, gobierno y soporte.
```

## 8. Próxima etapa después del handoff

**Sprint 32 sugerido:** Production hardening backlog and managed service plan.

El objetivo sería convertir los gaps residuales en backlog de producción gestionada: IdP real, SLOs, monitoreo administrado, seguridad, carga, backups, FinOps y soporte Día 2.
