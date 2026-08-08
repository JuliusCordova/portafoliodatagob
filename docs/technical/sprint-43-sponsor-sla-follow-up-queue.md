# Sprint 43 · Sponsor SLA and portfolio follow-up queue

## Objetivo

Agregar una cola ejecutiva de seguimiento para paquetes de decisión con foco en SLA sponsor, vencimientos y próximas acciones de portafolio.

## Cambios incluidos

- Nueva ruta web `/sponsor-followup`.
- Cálculo dinámico de SLA sponsor en frontend.
- Cola de seguimiento ordenada por criticidad y vencimiento.
- Filtros ejecutivos por estado de seguimiento.
- KPIs de seguimiento sponsor.
- Guardrails y próximas acciones por demanda.
- Navegación global hacia Sponsor follow-up.
- Documento operativo de uso.

## Archivos modificados

```text
apps/web/src/app/sponsor-followup/page.tsx
apps/web/src/app/components/ProductNavigation.tsx
docs/operations/sponsor-sla-follow-up-queue.md
docs/technical/sprint-43-sponsor-sla-follow-up-queue.md
```

## Política SLA implementada

La política se calcula en frontend a partir de `committee_inputs`:

- Pendiente sponsor: 2 días desde decisión del comité.
- Con observaciones: 3 días desde revisión sponsor.
- Solicita ajuste: 2 días desde revisión sponsor.
- Pausa ejecutiva: 7 días desde revisión sponsor.
- Visto bueno: cerrado.

## Estados derivados

```text
overdue
 due_soon
 pending_sponsor
 adjustment
 observed
 paused
 acknowledged
```

## Decisiones técnicas

- No se introduce endpoint backend nuevo.
- No se introduce workflow engine.
- No se cambia esquema core.
- La vista reutiliza `GET /api/demands/backlog`.
- El registro del resultado sponsor permanece en `/sponsor-review`.
- La navegación reutiliza el modelo de roles existente.

## Validación esperada

- API tests.
- Web build.
- Container build API/Web.
- Deploy scripts validation.

## Próximo incremento sugerido

Sprint 44 · Portfolio follow-up actions and owner assignment capture.
