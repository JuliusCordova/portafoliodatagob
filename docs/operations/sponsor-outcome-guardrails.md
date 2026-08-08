# Sponsor outcome guardrails

## Objetivo

Ordenar la lectura ejecutiva de paquetes de decisión en ATLAS DataGob después de la revisión del sponsor.

El Sprint 42 agrega un dashboard de resultados sponsor y guardrails de próxima acción dentro de `/sponsor-review`.

## Resultados ejecutivos soportados

| Resultado | Lectura ejecutiva | Guardrail |
| --- | --- | --- |
| Visto bueno | El sponsor permite continuar | Avanzar al siguiente gate del portafolio |
| Con observaciones | El sponsor deja comentarios para seguimiento | Resolver observaciones antes del siguiente comité |
| Solicita ajuste | El sponsor requiere reformular evidencia, alcance o condiciones | No promover sin reformular |
| Pausa ejecutiva | El sponsor detiene la demanda temporalmente | Evitar inversión adicional hasta nueva decisión |
| Pendiente sponsor | Aún no existe acknowledgement ejecutivo | Registrar resultado antes de cerrar evidencia |

## Uso operativo

1. Abrir `/sponsor-review`.
2. Revisar KPIs superiores.
3. Filtrar por resultado sponsor.
4. Seleccionar una demanda.
5. Revisar el guardrail ejecutivo.
6. Registrar o actualizar resultado sponsor.
7. Descargar Markdown o imprimir/guardar PDF desde navegador.

## Persistencia

El resultado sponsor se guarda en `committee_inputs` usando `PATCH /api/demands/update`.

Campos principales:

- `sponsor_review_outcome`
- `sponsor_review_label`
- `sponsor_review_comment`
- `sponsor_reviewed_by`
- `sponsor_reviewed_at`
- `sponsor_review_guardrail`
- `sponsor_review_next_action`
- `sponsor_review_version`

## Alcance actual

El Sprint 42 no introduce todavía:

- Workflow engine.
- Firma digital.
- Repositorio inmutable de evidencia.
- Aprobación sponsor con control transaccional server-side.
- SLA automático por resultado sponsor.

## Siguiente incremento recomendado

Sprint 43 · Sponsor SLA and portfolio follow-up queue.
