# Role-aware navigation and committee action guardrails

## Objetivo

Este documento describe el comportamiento funcional introducido para que ATLAS DataGob empiece a reflejar permisos de usuario en la navegación y en las acciones sensibles del Comité Operativo.

El objetivo no es implementar un IAM completo dentro del frontend, sino agregar guardrails pragmáticos que mejoran la claridad, reducen acciones accidentales y preparan el producto para una operación piloto más controlada.

## Roles relevantes

Para decisiones de comité, los roles habilitados son:

- `committee_member`
- `data_architect`
- `platform_admin`

Otros roles pueden seguir navegando y consultando información según el modelo de autorización existente, pero no deberían registrar decisiones finales de comité.

## Navegación consciente de roles

La navegación global lee la sesión web desde:

```text
GET /api/session
```

Luego muestra:

- Usuario actual.
- Rol dominante de lectura rápida.
- Estado visual de acceso para el cockpit de Comité Operativo.
- Mensaje de restricción cuando el usuario no tiene rol de comité, arquitectura o administración.

Esto no reemplaza el control del backend. Es una señal de experiencia para orientar al usuario antes de ejecutar acciones.

## Guardrail técnico del proxy de decisión

El proxy:

```text
PATCH /api/demands/committee-decision
```

ahora resuelve la sesión web y valida roles antes de actualizar la demanda.

Si el usuario no tiene rol habilitado, responde:

```text
HTTP 403
ATLAS_COMMITTEE_DECISION_FORBIDDEN
```

La respuesta incluye:

- Usuario resuelto.
- Roles actuales.
- Roles requeridos.

## Evidencia registrada

Cuando la decisión sí es aceptada, el envelope de decisión agrega:

- `committee_decision_recorded_by`
- `committee_decision_recorded_roles`
- `committee_decision_recorded_at`
- `committee_decision_version`

Esto permite auditar quién registró la decisión y bajo qué rol operativo.

## Validación rápida

### Caso permitido

Configurar el web en modo estático con rol de comité:

```bash
export ATLAS_WEB_IDENTITY_MODE=static
export ATLAS_WEB_DEMO_USER="committee.operator@atlas.local"
export ATLAS_WEB_DEMO_ROLES="committee_member,data_steward,executive"
```

Resultado esperado:

- Navegación muestra acceso habilitado a Comité Operativo.
- El cockpit `/committee` puede registrar decisiones.

### Caso restringido

Configurar el web con rol viewer:

```bash
export ATLAS_WEB_IDENTITY_MODE=static
export ATLAS_WEB_DEMO_USER="viewer@atlas.local"
export ATLAS_WEB_DEMO_ROLES="viewer"
```

Resultado esperado:

- Navegación muestra acceso restringido para Comité Operativo.
- `PATCH /api/demands/committee-decision` responde `403`.

## Límites conocidos

Este sprint no implementa todavía:

- Ocultamiento completo de pantallas por rol.
- Votaciones multiusuario.
- Aprobaciones paralelas.
- Workflow engine formal.
- Matriz visual completa de permisos por acción.

El foco es dejar un guardrail funcional y fácil de validar.
