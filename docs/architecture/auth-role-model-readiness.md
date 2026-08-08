# ATLAS DataGob · Auth and Role Model Readiness

## Objetivo

Preparar ATLAS DataGob para operar en piloto con control de acceso por rol sin acoplar todavía el producto a un proveedor específico de identidad.

Este sprint no implementa login visual, OAuth completo ni administración de usuarios. Define una frontera de autorización que puede conectarse luego con:

- Google Cloud Identity-Aware Proxy.
- Cloud Run IAM.
- OAuth/OIDC corporativo.
- Un gateway de API.
- Un IdP empresarial.

## Modos de autenticación

| Variable | Valor | Uso |
|---|---|---|
| `ATLAS_AUTH_MODE` | `disabled` | Default para desarrollo local, demo y CI. No cambia comportamiento actual. |
| `ATLAS_AUTH_MODE` | `header` | Modo piloto. Exige headers de identidad y roles. |

## Headers del modo piloto

Cuando `ATLAS_AUTH_MODE=header`, cada request protegida debe incluir:

```http
X-ATLAS-USER: usuario@empresa.com
X-ATLAS-ROLES: data_owner,data_steward
```

Este modo no reemplaza a un IdP real. Es una capa transitoria para validar el modelo de roles, rutas protegidas y permisos antes de conectar autenticación corporativa.

## Roles oficiales

| Rol | Propósito |
|---|---|
| `viewer` | Consulta básica de metadata, políticas y backlog. |
| `data_owner` | Crea solicitudes e inicia intake desde negocio. |
| `data_steward` | Completa, edita y prepara solicitudes para evaluación. |
| `data_architect` | Valida arquitectura, estados y decisiones técnicas. |
| `committee_member` | Revisa, ajusta y decide en comité operativo. |
| `executive` | Consume información ejecutiva y priorización. |
| `platform_admin` | Administración completa del piloto. |

## Permisos principales

| Permiso | Descripción |
|---|---|
| `auth:read` | Ver configuración segura del modelo de roles. |
| `metadata:read` | Consultar dominios, diccionario y modelo ER. |
| `policy:read` | Consultar políticas disponibles. |
| `demo:read` | Consultar casos sintéticos de demo. |
| `demo:reset` | Resetear backlog demo. |
| `intake:classify` | Clasificar solicitudes. |
| `intake:validate` | Validar solicitud contra políticas y arquitectura. |
| `demand:create` | Crear una demanda gobernada. |
| `demand:read` | Consultar backlog y detalle de demanda. |
| `demand:update` | Editar datos de una demanda. |
| `demand:status:update` | Actualizar estado/lifecycle. |
| `demand:score` | Calcular o recalcular score gobernado. |
| `scoring:calculate` | Calcular scoring simple. |

## Rutas protegidas

| Ruta | Método | Permiso |
|---|---:|---|
| `/auth/permissions` | GET | `auth:read` |
| `/metadata/*` | GET | `metadata:read` |
| `/policies` | GET | `policy:read` |
| `/demo/cases` | GET | `demo:read` |
| `/demo/reset` | POST | `demo:reset` |
| `/intake/classify` | POST | `intake:classify` |
| `/intake/policy-architecture-validate` | POST | `intake:validate` |
| `/demands/validate-and-create` | POST | `demand:create` |
| `/demands/backlog` | GET | `demand:read` |
| `/demands/{id}` | GET | `demand:read` |
| `/demands/{id}` | PATCH | `demand:update` |
| `/demands/{id}/status` | PATCH | `demand:status:update` |
| `/demands/{id}/score` | POST | `demand:score` |
| `/scoring/calculate` | POST | `scoring:calculate` |

Rutas públicas:

- `/health`.
- `/docs`.
- `/redoc`.
- `/openapi.json`.

## Comportamiento esperado

### Desarrollo local

```bash
export ATLAS_AUTH_MODE=disabled
make dev-api
```

El sistema mantiene el comportamiento actual. Internamente resuelve un contexto `platform_admin` no autenticado para no romper la demo.

### Piloto con headers

```bash
export ATLAS_AUTH_MODE=header
curl http://localhost:8000/demands/backlog \
  -H "X-ATLAS-USER: steward@example.com" \
  -H "X-ATLAS-ROLES: data_steward"
```

Si el rol no tiene el permiso requerido, el API devuelve `403`. Si falta identidad o roles, devuelve `401`.

## Decisiones de diseño

1. **No introducir login visual todavía.** El frontend actual no debe bloquear la demo.
2. **No acoplar a un IdP específico.** La frontera se mantiene reusable.
3. **Fail fast.** Un `ATLAS_AUTH_MODE` inválido devuelve error explícito.
4. **Principio de mínimo privilegio.** Data Owner no puede cambiar estados; Ejecutivo no puede editar.
5. **Admin explícito.** `platform_admin` concentra permisos de operación del piloto.

## Próximo endurecimiento

El siguiente paso para exposición real debería incluir:

- Integración con Identity-Aware Proxy, OAuth/OIDC o Cloud Run IAM.
- Propagación de identidad desde frontend hacia API.
- Sesiones de usuario en UI.
- Auditoría de actor real en eventos de demanda.
- Separación de permisos por dominio de datos.
- Pruebas E2E con roles reales.
