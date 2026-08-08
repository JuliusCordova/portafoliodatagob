# Sprint 34 · Committee workflow and decision automation

## Objetivo

Fortalecer el flujo funcional del Comité Operativo sin buscar perfección de producto todavía.

La intención de este sprint es dejar una capacidad utilizable para registrar decisiones de comité con trazabilidad básica:

- recomendación inicial del intake/agente,
- decisión final del comité,
- justificación,
- condiciones o próximos pasos,
- actualización de estado,
- auditoría visible en eventos.

## Criterio pragmático

Este sprint no intenta rediseñar toda la experiencia principal ni cerrar el modelo final de producción. Se prioriza dejar una primera versión funcional, simple y demostrable.

## Implementación

### Proxy Next.js

Nuevo endpoint:

```text
PATCH /api/demands/committee-decision
```

Este endpoint orquesta dos llamadas existentes al backend:

1. `PATCH /demands/{demand_id}` para registrar metadata de decisión en `committee_inputs` y `validation_state`.
2. `PATCH /demands/{demand_id}/status` para actualizar el estado oficial de la demanda.

### Nueva pantalla funcional

Nueva ruta web:

```text
/committee
```

Permite operar una sesión simple de comité:

1. cargar backlog,
2. seleccionar demanda,
3. revisar recomendación,
4. escoger decisión final,
5. registrar justificación,
6. registrar condiciones,
7. guardar decisión,
8. revisar trazabilidad reciente.

## Decisiones soportadas

| Decisión final | Estado resultante |
|---|---|
| `approved_for_scoring` | `approved_for_scoring` |
| `reformulation_required` | `reformulation_required` |
| `rejected` | `rejected` |
| `architecture_exception` | `operative_committee_review` |

## Alcance incluido

- Workspace mínimo de comité.
- Registro de recomendación vs decisión final.
- Justificación y condiciones.
- Actualización de estado usando lifecycle existente.
- Trazabilidad mediante eventos existentes.
- Sin modificación invasiva de la UI principal.

## Fuera de alcance

- Workflow multiusuario en tiempo real.
- Votación formal por miembro de comité.
- Aprobaciones paralelas.
- Gestión avanzada de excepción arquitectónica.
- Notificaciones.
- Diseño visual final.

## Validación esperada

- API tests.
- Web build.
- Container build API/Web.
- Deploy scripts validation.

## Próximo incremento sugerido

Sprint 35 · Committee workflow v2 and main dashboard integration.

Ese sprint podría integrar esta funcionalidad en la pantalla principal, agregar filtros de cola de comité, mejorar estados visuales y diferenciar acciones por rol.
