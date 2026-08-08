# Production promotion gate · ATLAS DataGob

## Objetivo

Definir el gate mínimo para promover ATLAS DataGob desde piloto controlado hacia un release candidate apto para evaluación productiva.

Este gate no despliega, no modifica datos y no consulta secretos. Su función es consolidar evidencia y producir una decisión objetiva: `GO`, `CONDITIONAL-GO` o `NO-GO`.

## Cuándo ejecutar

Ejecutar después de completar:

1. CI en verde.
2. Build de contenedores API/Web exitoso.
3. Deploy controlado Cloud Run ejecutado o validado.
4. Smoke estándar exitoso.
5. Smoke autenticado exitoso.
6. `GET /ops/readiness` revisado.
7. Evidencia de piloto generada.
8. Rollback documentado.
9. Aprobador técnico/de negocio identificado.

## Variables requeridas

```bash
export ATLAS_RC_ID="atlas-datagob-rc-YYYYMMDD"
export ATLAS_API_URL="https://REPLACE_WITH_API_URL"
export ATLAS_WEB_URL="https://REPLACE_WITH_WEB_URL"
export ATLAS_RC_API_REVISION="REPLACE_WITH_API_REVISION"
export ATLAS_RC_WEB_REVISION="REPLACE_WITH_WEB_REVISION"
export ATLAS_RC_CI_STATUS="pass"
export ATLAS_RC_CONTAINER_STATUS="pass"
export ATLAS_RC_STANDARD_SMOKE_STATUS="pass"
export ATLAS_RC_AUTH_SMOKE_STATUS="pass"
export ATLAS_RC_OPS_READINESS_STATUS="pass"
export ATLAS_RC_AUTH_MODE_STATUS="pass"
export ATLAS_RC_PERSISTENCE_STATUS="pass"
export ATLAS_RC_ROLLBACK_PLAN_STATUS="pass"
export ATLAS_RC_EVIDENCE_PATH="docs/deployment/evidence/generated/manual-run"
export ATLAS_RC_APPROVER="name-or-role"
export ATLAS_RC_GATE_OUTPUT="data/runtime/release_candidate_gate_report.md"
```

## Ejecución

```bash
make production-promotion-gate
```

El comando genera un reporte Markdown en `ATLAS_RC_GATE_OUTPUT` y retorna:

- `0` cuando la decisión es `GO`.
- `1` cuando la decisión es `CONDITIONAL-GO` o `NO-GO`.

## Reglas de decisión

| Resultado | Regla | Acción |
|---|---|---|
| `GO` | Todos los checks pasan sin warnings. | Puede promoverse como release candidate. |
| `CONDITIONAL-GO` | No hay blockers, pero hay warnings o fallas mayores. | Requiere aceptación explícita de riesgos. |
| `NO-GO` | Al menos un blocker falla. | No promover. Corregir y repetir gate. |

## Blockers mínimos

- No hay release candidate ID.
- No hay URL de API o Web.
- CI o contenedores no pasaron.
- Smoke estándar o autenticado no pasó.
- Readiness operativo no pasó.
- No existe paquete de evidencia.

## Evidencia esperada

El paquete de evidencia debe contener, como mínimo:

- URLs Cloud Run API/Web.
- Revision IDs API/Web.
- Resultado smoke estándar.
- Resultado smoke autenticado.
- Resultado `/ops/readiness`.
- Variables relevantes sin secretos.
- Evidencia de rollback.
- Aprobación o aceptación de riesgo.

## Principios

- No promover sin trazabilidad.
- No promover con auth débil sin aceptación explícita.
- No promover con persistencia local para un piloto productivo real.
- No promover sin rollback probado o documentado.
- No confundir demo ejecutiva con operación productiva.
