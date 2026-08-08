# Committee decision UX feedback

## Objetivo

Este documento describe la mejora pragmática de experiencia agregada al flujo de Comité Operativo en ATLAS DataGob.

El foco no es perfeccionar el workflow, sino hacer que la decisión del comité sea más clara, operable y defendible durante una demo o piloto controlado.

## Ruta funcional

```text
/committee
```

## Mejoras incluidas

- Panel de feedback con tono contextual:
  - `info`
  - `success`
  - `warning`
  - `error`
- Vista previa del resultado antes de registrar la decisión.
- Mensajes más claros cuando la sesión no tiene permisos.
- Mensajes más claros cuando la decisión no cumple reglas del flujo.
- Botón de decisión bloqueado hasta completar justificación mínima.
- Próximos pasos sugeridos luego de cada tipo de decisión.
- Trazabilidad reciente visible en la misma pantalla.

## Decisiones soportadas

| Decisión | Resultado esperado | Feedback |
|---|---|---|
| `approved_for_scoring` | Demanda lista para scoring | Éxito |
| `reformulation_required` | Demanda vuelve al solicitante | Advertencia |
| `rejected` | Demanda rechazada | Riesgo/Error |
| `architecture_exception` | Demanda queda en revisión por excepción | Advertencia |

## Errores tratados de forma entendible

| Código | Mensaje funcional |
|---|---|
| `400` | La decisión no cumple las reglas del flujo. |
| `401` | No se pudo autenticar la sesión. |
| `403` | El rol actual no puede registrar decisiones del comité. |
| `500+` | El backend no pudo procesar la decisión. |

## Criterio de aceptación

El Sprint 37 se considera válido cuando:

1. La pantalla `/committee` carga el backlog.
2. Permite seleccionar una demanda.
3. Muestra recomendación, decisión final, riesgo, justificación y condiciones.
4. Bloquea la acción si falta justificación mínima.
5. Muestra feedback de éxito o error entendible.
6. Mantiene trazabilidad reciente visible.
7. No rompe el dashboard principal ni la navegación global.

## Limitaciones conscientes

Este sprint no implementa todavía:

- Workflow multiusuario.
- Votación por miembros del comité.
- Comentarios paralelos por rol.
- Historial comparativo de decisiones.
- Edición visual avanzada del timeline.

Estas capacidades quedan como posibles incrementos posteriores.
