# Sponsor follow-up actions and owner assignment

## Objetivo

Guía operativa para usar `/sponsor-followup` como cola ejecutiva de seguimiento posterior a la revisión sponsor.

## Flujo

1. Abrir `Sponsor follow-up` desde la navegación global.
2. Revisar KPIs de SLA y estado de seguimiento.
3. Filtrar por fuera de SLA, vencen pronto, pendiente sponsor, ajuste, observación, pausa o asignadas.
4. Seleccionar una demanda.
5. Revisar guardrail y próxima acción sugerida.
6. Registrar responsable, fecha compromiso, acción de portafolio y comentario.
7. Guardar el seguimiento.

## Datos guardados

La captura se guarda en `committee_inputs` con campos de owner, fecha compromiso, acción, comentario, estado de seguimiento, SLA, guardrail, próxima acción, fecha de registro y versión.

## Uso esperado

La vista convierte decisiones sponsor en acciones trazables para portafolio. Es útil para demo ejecutiva, piloto controlado y operación inicial sin requerir todavía un motor formal de workflow.
