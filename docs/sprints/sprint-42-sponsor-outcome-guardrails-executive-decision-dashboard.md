# Sprint 42 · Sponsor outcome guardrails and executive decision dashboard

## Objetivo

Convertir la captura de resultado sponsor en una lectura ejecutiva accionable, con KPIs, filtros y guardrails para la siguiente acción.

## Implementación

Se actualizó `/sponsor-review` para incluir:

- Dashboard de resultados sponsor.
- KPIs por estado ejecutivo.
- Filtros por resultado sponsor.
- Guardrail ejecutivo dinámico por demanda.
- Próxima acción sugerida según resultado sponsor.
- Guardrail persistido dentro de `committee_inputs` al registrar revisión.
- Paquete Markdown enriquecido con guardrail y próxima acción.

## Resultados soportados

- `sponsor_acknowledged`
- `sponsor_observation`
- `sponsor_adjustment_requested`
- `sponsor_paused`
- Pendiente de sponsor review

## Guardrails

| Resultado | Guardrail |
| --- | --- |
| Visto bueno | Continuar con priorización, planificación o ejecución |
| Observaciones | Convertir observaciones en acciones trazables |
| Ajuste requerido | No promover hasta actualizar alcance/evidencia/condiciones |
| Pausa ejecutiva | No avanzar inversión u operación hasta nueva decisión |
| Pendiente | Registrar acknowledgement antes de cerrar paquete |

## Archivos modificados

- `apps/web/src/app/sponsor-review/page.tsx`
- `docs/operations/sponsor-outcome-guardrails.md`
- `docs/sprints/sprint-42-sponsor-outcome-guardrails-executive-decision-dashboard.md`

## Validación esperada

- API tests.
- Web build.
- Container build API/Web.
- Deploy scripts validation.

## Decisiones de diseño

- No se crea workflow engine.
- No se cambia el esquema core del backend.
- No se crea endpoint server-side específico de sponsor.
- Se reutiliza `PATCH /api/demands/update`.
- Se mantiene el patrón pragmático de evidencia sobre `committee_inputs`.

## Próximo sprint recomendado

Sprint 43 · Sponsor SLA and portfolio follow-up queue.
