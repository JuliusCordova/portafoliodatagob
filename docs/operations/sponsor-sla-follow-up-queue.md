# Sponsor SLA & follow-up queue

## Objetivo

La vista `/sponsor-followup` permite controlar el seguimiento ejecutivo de paquetes de decisión que ya pasaron por Comité Operativo.

El propósito es que portafolio pueda responder rápidamente:

- Qué demandas están pendientes de sponsor.
- Qué demandas tienen visto bueno.
- Qué demandas tienen observaciones.
- Qué demandas requieren ajuste.
- Qué demandas están pausadas.
- Qué demandas están fuera de SLA o vencen pronto.

## Ruta

```text
/sponsor-followup
```

## Fuente de datos

La vista consume el backlog desde:

```text
GET /api/demands/backlog
```

Solo considera demandas con decisión formal de comité, identificadas por:

- `committee_inputs.committee_final_decision`, o
- `validation_state.committee_decision_recorded`.

## Política SLA aplicada en UI

La vista aplica una política pragmática de seguimiento:

| Resultado sponsor | SLA referencial | Acción esperada |
| --- | ---: | --- |
| Pendiente sponsor | 2 días desde decisión comité | Solicitar revisión sponsor |
| Con observaciones | 3 días desde revisión sponsor | Responder observaciones |
| Solicita ajuste | 2 días desde revisión sponsor | Reformular evidencia/alcance |
| Pausa ejecutiva | 7 días desde revisión sponsor | Confirmar continuidad o cierre temporal |
| Visto bueno | Cerrado | Pasar a priorización o ejecución |

## Estados visuales

- `Fuera de SLA`: fecha de vencimiento ya pasó.
- `Vencen pronto`: vence hoy o mañana.
- `Pendiente sponsor`: no tiene resultado sponsor registrado.
- `Ajuste requerido`: sponsor solicitó cambio o reformulación.
- `Observadas`: sponsor dejó observaciones activas.
- `Pausadas`: sponsor pidió pausa ejecutiva.
- `Con visto bueno`: sponsor habilitó continuar.

## Guardrails

Cada elemento muestra:

- Próxima acción sugerida.
- Guardrail ejecutivo.
- SLA y fecha de vencimiento.
- Owner / sponsor registrado.
- Decisión de comité y estado actual.

## Decisiones de diseño

- No se introduce workflow engine.
- No se crean nuevos endpoints backend.
- No se modifica el esquema core.
- La vista calcula SLA dinámicamente en frontend usando la evidencia persistida.
- Los resultados sponsor siguen registrándose en `/sponsor-review`.

## Uso recomendado en demo

1. Abrir `/sponsor-review`.
2. Registrar resultados sponsor para algunas demandas.
3. Abrir `/sponsor-followup`.
4. Filtrar por fuera de SLA, ajuste requerido, observadas o pausadas.
5. Explicar cómo ATLAS pasa de decisión a gestión activa del portafolio.
