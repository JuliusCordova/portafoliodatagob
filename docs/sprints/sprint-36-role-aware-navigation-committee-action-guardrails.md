# Sprint 36 · Role-aware navigation and committee action guardrails

## Objetivo

Agregar una primera capa funcional de experiencia y control por rol para la navegación del producto y las decisiones sensibles del Comité Operativo.

Este sprint continúa el enfoque pragmático de los Sprints 34 y 35: primero conectar y proteger lo que ya funciona; luego evolucionarlo hacia una experiencia más completa.

## Alcance implementado

### 1. Navegación consciente de roles

El componente global `ProductNavigation` ahora consulta:

```text
GET /api/session
```

y muestra:

- Usuario resuelto.
- Rol principal de lectura rápida.
- Estado visual de acceso para Comité Operativo.
- Mensaje de restricción cuando el usuario no tiene rol suficiente.

### 2. Estados visuales de acceso

Se agregaron estilos para distinguir:

- Acción habilitada.
- Acceso restringido.
- Rol/usuario visible en navegación.

### 3. Guardrail técnico en proxy de comité

El endpoint web:

```text
PATCH /api/demands/committee-decision
```

ahora valida que el usuario tenga alguno de estos roles:

- `committee_member`
- `data_architect`
- `platform_admin`

Cuando no cumple, responde `403` antes de invocar el backend.

### 4. Evidencia adicional en decisión

El envelope de decisión registra:

- Usuario que registró la decisión.
- Roles con los que operó.
- Timestamp.
- Versión del esquema de decisión.

### 5. Documentación operativa

Se agregó:

```text
docs/security/role-aware-navigation-committee-guardrails.md
```

con casos permitidos, casos restringidos y límites conocidos.

## Archivos modificados

```text
apps/web/src/app/components/ProductNavigation.tsx
apps/web/src/app/components/ProductNavigation.module.css
apps/web/src/app/api/demands/committee-decision/route.ts
docs/security/role-aware-navigation-committee-guardrails.md
docs/sprints/sprint-36-role-aware-navigation-committee-action-guardrails.md
```

## Decisión de diseño

No se implementó todavía un sistema completo de permisos en UI ni un workflow engine. El sprint agrega una capa mínima útil:

- El usuario ve si su rol habilita acciones sensibles.
- El proxy impide registrar decisiones si el rol no corresponde.
- La decisión queda auditada con usuario y roles.

## Validación esperada

- API tests.
- Web build.
- Container build API/Web.
- Deploy scripts validation.

## Próximo incremento sugerido

Sprint 37 · Committee decision UX polish and action feedback

Objetivo sugerido: mejorar la pantalla `/committee` para que los botones, mensajes y estados de decisión sean más claros según rol y resultado de acción.
