# Sprint 23 · Auth and Role Model Readiness

## Objetivo

Preparar ATLAS DataGob para una exposición controlada de piloto mediante un modelo inicial de roles, permisos y autorización por ruta, sin romper la demo local ni acoplar todavía el producto a un proveedor de identidad específico.

## Alcance implementado

- Nuevo módulo `apps/api/src/atlas_datagob/services/authz.py`.
- Modelo oficial de roles:
  - `viewer`.
  - `data_owner`.
  - `data_steward`.
  - `data_architect`.
  - `committee_member`.
  - `executive`.
  - `platform_admin`.
- Matriz de permisos por rol.
- Modo `ATLAS_AUTH_MODE=disabled` por default.
- Modo `ATLAS_AUTH_MODE=header` para piloto controlado.
- Headers:
  - `X-ATLAS-USER`.
  - `X-ATLAS-ROLES`.
- Middleware de autorización por ruta.
- Endpoint seguro de inspección:
  - `GET /auth/permissions`.
- API version bump a `0.6.3`.
- Tests unitarios del modelo de auth.
- Documentación de arquitectura del modelo de roles.
- `.env.example` actualizado.
- Plantilla Cloud Run actualizada con `ATLAS_AUTH_MODE`.
- Script `deploy_api.sh` actualizado para propagar `ATLAS_AUTH_MODE`.

## Fuera de alcance

Este sprint no implementa:

- Login visual en frontend.
- OAuth/OIDC completo.
- Google Identity-Aware Proxy.
- Administración de usuarios.
- JWT verification.
- Propagación de identidad desde la UI.
- Autorización por dominio de datos.

## Decisión de diseño

La autorización se implementa como middleware por ruta para evitar cambios extensivos en firmas de endpoints y mantener compatibilidad con la UI y pruebas existentes.

`ATLAS_AUTH_MODE=disabled` mantiene el comportamiento actual. Internamente resuelve un contexto `platform_admin` no autenticado para permitir demo, CI y desarrollo local.

`ATLAS_AUTH_MODE=header` habilita enforcement transitorio para pruebas controladas usando headers.

## Permisos por flujo

| Flujo | Permiso |
|---|---|
| Consulta de metadata | `metadata:read` |
| Consulta de políticas | `policy:read` |
| Intake clasificación | `intake:classify` |
| Intake validación | `intake:validate` |
| Crear demanda | `demand:create` |
| Leer backlog/detalle | `demand:read` |
| Editar demanda | `demand:update` |
| Actualizar estado | `demand:status:update` |
| Recalcular score | `demand:score` |
| Reset demo | `demo:reset` |

## Validación esperada

En CI deben pasar:

- API tests.
- Web build.
- Container build API.
- Container build Web.
- Deploy scripts syntax.
- Smoke script compile.

## Pruebas manuales sugeridas

### Modo local sin auth

```bash
export ATLAS_AUTH_MODE=disabled
make dev-api
curl http://localhost:8000/auth/permissions
```

### Modo header con rol permitido

```bash
export ATLAS_AUTH_MODE=header
curl http://localhost:8000/demands/backlog \
  -H "X-ATLAS-USER: steward@example.com" \
  -H "X-ATLAS-ROLES: data_steward"
```

### Modo header con rol insuficiente

```bash
curl -X PATCH http://localhost:8000/demands/DEM-DEMO-001/status \
  -H "X-ATLAS-USER: owner@example.com" \
  -H "X-ATLAS-ROLES: data_owner" \
  -H "Content-Type: application/json" \
  -d '{"status":"scored"}'
```

Resultado esperado: `403`.

## Próximo sprint recomendado

Sprint 24 · Identity propagation and UI session readiness:

- Header forwarding desde Next.js proxy hacia API.
- Modelo de sesión visible en UI.
- Selector de rol controlado para demo interna.
- Preparación para IAP/OIDC.
- Auditoría de actor real en eventos de demanda.
