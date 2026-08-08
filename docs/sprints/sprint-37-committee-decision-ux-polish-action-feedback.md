# Sprint 37 · Committee decision UX polish and action feedback

## Objetivo

Mejorar la experiencia funcional del flujo de decisión del Comité Operativo, manteniendo el enfoque pragmático del producto: hacer que funcione bien para piloto sin buscar todavía una implementación perfecta de workflow enterprise.

## Contexto

Los Sprints 34 a 36 dejaron:

- Ruta funcional `/committee`.
- Proxy `PATCH /api/demands/committee-decision`.
- Navegación global.
- Guardrails de rol para acciones sensibles.

El Sprint 37 mejora la usabilidad de ese flujo.

## Cambios implementados

### 1. Feedback contextual

Se agregó un panel de feedback con tonos:

- `info`
- `success`
- `warning`
- `error`

Esto permite mostrar claramente si la acción está en progreso, fue exitosa, requiere atención o falló.

### 2. Mensajes de error accionables

La pantalla ahora traduce errores HTTP comunes a mensajes entendibles:

- `400`: reglas del flujo o payload inválido.
- `401`: sesión no autenticada.
- `403`: rol sin permiso para decidir.
- `500+`: problema backend/persistencia/logs.

### 3. Vista previa de resultado

Antes de registrar una decisión, el usuario ve el resultado esperado:

- aprobado para scoring,
- reformulación requerida,
- rechazado,
- excepción arquitectónica.

### 4. Botón con validación visual

La acción se bloquea cuando no hay demanda seleccionada o la justificación es insuficiente.

### 5. Próximos pasos posteriores a la decisión

Después de registrar una decisión se muestran próximos pasos sugeridos según el resultado.

### 6. Trazabilidad más legible

Se mantiene visible la trazabilidad reciente para que el comité pueda ver qué ocurrió antes y después de la decisión.

## Archivos modificados

```text
apps/web/src/app/committee/page.tsx
docs/demo/committee-decision-ux-feedback.md
docs/sprints/sprint-37-committee-decision-ux-polish-action-feedback.md
```

## Criterios de validación

- La pantalla `/committee` compila.
- El build web pasa.
- Los tests API se mantienen en verde.
- Los containers API/Web construyen correctamente.
- El flujo no modifica endpoints backend ni rompe la navegación global.

## Decisiones conscientes

No se implementó todavía:

- Motor de workflow.
- Votación multiusuario.
- Aprobaciones paralelas.
- Timeline avanzado.
- Control granular por cada botón de la pantalla.

Estas capacidades se mantienen para futuros incrementos.

## Próximo incremento sugerido

```text
Sprint 38 · Committee timeline and decision history enrichment
```

Ese sprint podría enriquecer la línea de tiempo y hacer más explícita la historia completa de decisiones por demanda.
