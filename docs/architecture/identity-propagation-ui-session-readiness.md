# ATLAS DataGob · Identity propagation and UI session readiness

## Objetivo

Preparar la UI y los proxies Next.js para propagar identidad hacia la API sin acoplar el producto a un proveedor de identidad específico.

Este incremento conecta el modelo de autorización del Sprint 23 con la experiencia Web:

- La UI muestra una sesión visible.
- Next.js resuelve la identidad server-side.
- Los proxies Next.js propagan `X-ATLAS-USER` y `X-ATLAS-ROLES` hacia FastAPI.
- La demo local sigue funcionando con identidad deshabilitada por default.

## Modos de identidad Web

| Modo | Variable | Uso |
|---|---|---|
| Demo local | `ATLAS_WEB_IDENTITY_MODE=disabled` | No propaga headers. Compatible con `ATLAS_AUTH_MODE=disabled` en API. |
| Piloto controlado | `ATLAS_WEB_IDENTITY_MODE=static` | Propaga usuario y roles definidos por variables de entorno. Útil para demo privada. |
| Integración futura | `ATLAS_WEB_IDENTITY_MODE=passthrough` | Propaga headers recibidos desde gateway, IAP, OIDC proxy o capa corporativa. |

## Variables Web

```bash
ATLAS_WEB_IDENTITY_MODE=disabled
ATLAS_WEB_DEMO_USER=demo.operator@atlas.local
ATLAS_WEB_DEMO_ROLES=data_steward,committee_member,executive
```

## Headers propagados

Cuando el modo Web es `static` o `passthrough`, los proxies Next.js envían:

```http
X-ATLAS-USER: <usuario>
X-ATLAS-ROLES: <rol1>,<rol2>,<rol3>
```

La API consume estos headers cuando `ATLAS_AUTH_MODE=header`.

## Resolución de identidad

### Modo disabled

No se envían headers hacia la API. La UI muestra una sesión demo local.

### Modo static

Next.js usa:

- `ATLAS_WEB_DEMO_USER`.
- `ATLAS_WEB_DEMO_ROLES`.

Este modo es recomendado para un piloto ejecutivo cerrado sin login visual.

### Modo passthrough

Next.js intenta resolver identidad desde:

1. `X-ATLAS-USER`.
2. `X-Goog-Authenticated-User-Email`.
3. `ATLAS_WEB_DEMO_USER` como fallback explícito.

Los roles se resuelven desde:

1. `X-ATLAS-ROLES`.
2. `ATLAS_WEB_DEMO_ROLES`.
3. `viewer` como fallback mínimo.

## Endpoint de sesión Web

```http
GET /api/session
```

Respuesta esperada:

```json
{
  "session": {
    "mode": "static",
    "user": "demo.operator@atlas.local",
    "roles": ["committee_member", "data_steward", "executive"],
    "authenticated": true,
    "source": "static",
    "propagated_headers": ["x-atlas-user", "x-atlas-roles"]
  }
}
```

## Rutas proxy cubiertas

Los siguientes proxies propagan identidad:

- `GET /api/demands/backlog`.
- `POST /api/intake/validate`.
- `PATCH /api/demands/update`.
- `PATCH /api/demands/status`.
- `POST /api/demands/score`.
- `GET /api/demo/cases`.
- `POST /api/demo/reset`.

## Gobierno

Este sprint no implementa:

- Login visual.
- Administración de usuarios.
- JWT verification.
- OAuth/OIDC completo.
- Asignación dinámica de roles desde directorio corporativo.

La decisión de arquitectura es mantener ATLAS preparado para conectarse después a IAP, Cloud Run IAM, API Gateway, OIDC o un IdP corporativo sin reescribir los endpoints funcionales.

## Modos recomendados por ambiente

| Ambiente | API | Web |
|---|---|---|
| Local / Cloud Shell | `ATLAS_AUTH_MODE=disabled` | `ATLAS_WEB_IDENTITY_MODE=disabled` |
| Demo privada | `ATLAS_AUTH_MODE=header` | `ATLAS_WEB_IDENTITY_MODE=static` |
| Piloto con gateway/IAP | `ATLAS_AUTH_MODE=header` | `ATLAS_WEB_IDENTITY_MODE=passthrough` |

## Validación esperada

1. Web build pasa sin errores TypeScript.
2. API tests se mantienen en verde.
3. Container build API/Web se mantiene en verde.
4. `GET /api/session` devuelve sesión visible.
5. En modo `static`, los proxies propagan usuario/roles hacia la API.
6. En modo `disabled`, la demo local sigue funcionando sin cambios.
