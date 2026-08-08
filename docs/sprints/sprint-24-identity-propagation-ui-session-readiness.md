# Sprint 24 · Identity propagation and UI session readiness

## Estado

Implementado en rama `sprint/24-identity-propagation-ui-session-readiness`.

## Objetivo

Conectar la preparación de roles/autorización del Sprint 23 con la experiencia Web, permitiendo que Next.js resuelva identidad, la muestre en UI y la propague hacia FastAPI por headers.

## Incluye

- Helper server-side `apps/web/src/app/api/_lib/identity.ts`.
- Endpoint `GET /api/session`.
- Componente `SessionBanner` visible en el layout.
- Propagación de identidad en proxies Next.js.
- Variables de entorno Web:
  - `ATLAS_WEB_IDENTITY_MODE`.
  - `ATLAS_WEB_DEMO_USER`.
  - `ATLAS_WEB_DEMO_ROLES`.
- Actualización de `apps/web/.env.example`.
- Actualización de `docs/deployment/cloud-run.env.example`.
- Actualización de `scripts/cloud_run/deploy_web.sh`.
- Ajuste de delimitador seguro en deploy API/Web para variables con comas.
- Documento `docs/architecture/identity-propagation-ui-session-readiness.md`.

## Decisiones

1. `disabled` sigue siendo el modo default para no romper demo local ni Cloud Shell.
2. `static` permite un piloto cerrado sin login visual.
3. `passthrough` prepara integración futura con IAP, gateway, OIDC o IdP corporativo.
4. La API sigue siendo la fuente de autorización por permisos; Web solo propaga identidad.
5. La UI muestra sesión y roles para hacer visible el contexto operativo del piloto.

## No incluido

- Login visual.
- JWT validation.
- OAuth/OIDC completo.
- Gestión de usuarios.
- Mapeo dinámico de grupos corporativos a roles ATLAS.

## Validación esperada

- API tests.
- Web build.
- Container build API.
- Container build Web.
- Deploy scripts syntax.
- Smoke script compile.

## Próximo incremento recomendado

Sprint 25 · Authenticated smoke and pilot hardening:

- Smoke test con headers de identidad.
- Validación controlada de `ATLAS_AUTH_MODE=header` + `ATLAS_WEB_IDENTITY_MODE=static`.
- Evidencia de autorización positiva/negativa.
- Ajustes de roles antes del piloto real.
