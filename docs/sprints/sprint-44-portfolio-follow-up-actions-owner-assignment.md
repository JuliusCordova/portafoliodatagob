# Sprint 44 · Portfolio follow-up actions and owner assignment capture

## Objetivo

Agregar captura de seguimiento de portafolio sobre la cola sponsor follow-up.

## Alcance implementado

- Actualización de `/sponsor-followup`.
- Captura de responsable de seguimiento.
- Captura de fecha compromiso.
- Captura de acción de portafolio.
- Captura de comentario ejecutivo.
- Persistencia del seguimiento en `committee_inputs` usando `PATCH /api/demands/update`.
- Visualización de evidencia de seguimiento registrada.
- Conservación de KPIs, filtros, cálculo dinámico de SLA, guardrail y próxima acción.

## Campos nuevos

- `portfolio_followup_owner`
- `portfolio_followup_due_date`
- `portfolio_followup_action`
- `portfolio_followup_comment`
- `portfolio_followup_status`
- `portfolio_followup_sla_label`
- `portfolio_followup_guardrail`
- `portfolio_followup_next_action`
- `portfolio_followup_recorded_at`
- `portfolio_followup_version`

## Decisiones técnicas

- No se crea endpoint backend nuevo.
- No se modifica esquema core.
- No se introduce workflow engine.
- Se reutiliza el mecanismo de actualización existente del backlog.

## Validación esperada

- API tests.
- Web build.
- Container build API/Web.
- Deploy scripts validation.

## Próximo incremento recomendado

Sprint 45 · Release candidate, version tag and final exit checklist.
