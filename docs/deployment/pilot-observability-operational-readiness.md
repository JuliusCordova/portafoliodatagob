# ATLAS DataGob · Pilot observability and operational readiness

## Objetivo

Definir una base operativa mínima para ejecutar un piloto controlado de ATLAS DataGob con señales claras de salud, configuración, trazabilidad y gobierno.

Este runbook no reemplaza una plataforma completa de observabilidad. Establece el estándar mínimo para saber si el piloto puede ser mostrado, operado y revisado con evidencia.

## Endpoint operativo

```bash
curl -H "X-ATLAS-USER: steward@example.com" \
  -H "X-ATLAS-ROLES: data_steward,committee_member,executive" \
  "${ATLAS_API_URL}/ops/readiness"
```

El endpoint devuelve:

- Estado general: `ok`, `warning` o `critical`.
- Checks operativos.
- Configuración segura de autenticación y persistencia.
- Conteo de demandas por estado y prioridad.
- Brechas de gobierno abiertas.
- Eventos de auditoría disponibles.
- Recomendaciones accionables.

## Interpretación ejecutiva

| Estado | Lectura | Acción recomendada |
|---|---|---|
| `ok` | El piloto tiene condiciones mínimas para demostración controlada. | Ejecutar demo y capturar evidencia. |
| `warning` | El piloto funciona, pero existen brechas operativas o de gobierno. | Aceptar explícitamente para demo o resolver antes de piloto. |
| `critical` | Hay errores de configuración o lectura operacional. | No ejecutar demo ejecutiva hasta corregir. |

## Checks mínimos

1. **api_runtime**: confirma que el API puede generar el snapshot operativo.
2. **auth_mode**: advierte si `ATLAS_AUTH_MODE=disabled`.
3. **persistence**: advierte si el repositorio es `local_json`.
4. **backlog_population**: valida si hay al menos 10 demandas representativas.
5. **governance_gaps**: resume brechas de política, arquitectura y FinOps.
6. **audit_trail**: valida presencia mínima de eventos de auditoría.

## Smoke autenticado

El smoke autenticado valida el endpoint operativo como parte de la revisión cloud:

```bash
make authenticated-cloud-smoke
```

Resultado esperado:

```text
api_operational_readiness_positive: ok
```

## Evidencia recomendada

Guardar en el paquete del piloto:

- Output de `/health`.
- Output de `/ops/readiness`.
- Output de `make cloud-smoke`.
- Output de `make authenticated-cloud-smoke`.
- URLs API/Web.
- Revision IDs de Cloud Run.
- Variables activas no sensibles.
- Decisión de go/no-go.

## Criterio mínimo para demo ejecutiva

Para una demo ejecutiva se puede aceptar `warning` si la brecha está documentada y no impide la narrativa del piloto. Para piloto con usuarios reales, se recomienda apuntar a `ok`, especialmente en autenticación y persistencia.
