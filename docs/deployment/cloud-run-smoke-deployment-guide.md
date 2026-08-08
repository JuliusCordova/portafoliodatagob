# Cloud Run smoke deployment guide · ATLAS DataGob

## Objetivo

Ejecutar una validación controlada de ATLAS DataGob desplegado en Cloud Run, usando API y Web separados, Firestore como persistencia administrada y smoke tests no destructivos por defecto.

Este documento no reemplaza el runbook de despliegue. Parte de que ya existen:

- Proyecto GCP activo.
- Artifact Registry configurado.
- Firestore habilitado.
- Service account de API con permisos sobre Firestore.
- Servicios Cloud Run o permisos para crear nuevas revisiones.

## Secuencia recomendada

```bash
cd ~/portafoliodatagob
git checkout main
git pull origin main
```

Crear archivo local de variables desde la plantilla:

```bash
cp docs/deployment/cloud-run.env.example .cloud-run.env
```

Editar valores reales:

```bash
nano .cloud-run.env
source .cloud-run.env
```

Validar variables:

```bash
make deploy-validate
```

Desplegar API:

```bash
make deploy-api
```

Registrar la URL devuelta como:

```bash
export ATLAS_API_URL="https://<api-service-url>"
export ATLAS_INTERNAL_API_BASE="${ATLAS_API_URL}"
```

Actualizar CORS de API para permitir el origen Web cuando la URL Web ya exista. Para primer despliegue, se puede usar temporalmente el regex Run App documentado en el sprint anterior.

Desplegar Web:

```bash
make deploy-web
```

Registrar la URL devuelta como:

```bash
export ATLAS_WEB_URL="https://<web-service-url>"
```

Ajustar CORS definitivo de API:

```bash
export ATLAS_ALLOWED_ORIGINS="${ATLAS_WEB_URL}"
make deploy-api
```

## Smoke test automatizado

Por defecto no ejecuta reset de demo porque `POST /api/demo/reset` modifica el backlog runtime.

```bash
export ATLAS_API_URL="https://<api-service-url>"
export ATLAS_WEB_URL="https://<web-service-url>"
python scripts/cloud_run/smoke_test_cloud_run.py
```

Para validar también la escritura sobre Firestore mediante demo reset:

```bash
export ATLAS_SMOKE_ALLOW_DEMO_RESET=true
python scripts/cloud_run/smoke_test_cloud_run.py
```

## Validaciones esperadas

| Check | Resultado esperado |
|---|---|
| API `/health` | `status=ok`, producto ATLAS DataGob |
| API `/demo/cases` | count mayor o igual a 10 |
| Web root | HTML accesible |
| Web `/api/demo/cases` | Proxy Next.js conectado a API |
| Web `/api/demo/reset` | Solo si se habilita reset explícito |

## Evidencia obligatoria

Completar:

```text
docs/deployment/cloud-run-smoke-record-template.md
```

Guardar una copia con fecha, por ejemplo:

```text
docs/deployment/records/cloud-run-smoke-YYYYMMDD.md
```

No versionar credenciales ni valores secretos.

## Criterios de éxito

El smoke se considera exitoso cuando:

1. API responde `/health`.
2. Web responde página raíz.
3. Web proxy puede consultar `/api/demo/cases`.
4. Firestore queda configurado como adapter de API.
5. El reset demo se ejecuta correctamente solo si se habilita explícitamente.
6. La evidencia queda registrada.

## Criterios de rollback

El Sprint 22 no automatiza rollback. Si una revisión falla:

1. Identificar revisión previa estable en Cloud Run.
2. Reasignar tráfico desde consola o `gcloud run services update-traffic`.
3. Registrar decisión en el template de smoke.

## Riesgos y controles

| Riesgo | Control |
|---|---|
| CORS bloquea Web → API | Re-desplegar API con `ATLAS_ALLOWED_ORIGINS=<WEB_URL>` |
| Service account sin permisos Firestore | Validar rol antes del smoke |
| Reset demo modifica backlog | Mantener `ATLAS_SMOKE_ALLOW_DEMO_RESET=false` salvo prueba explícita |
| Variables incompletas | Ejecutar `make deploy-validate` antes de deploy |
| API privada no accesible desde Web | Revisar autenticación/ingress antes de smoke |

## Próximo incremento sugerido

Sprint 23 · Auth and role model readiness: preparar autenticación, roles y protección de endpoints antes de exponer el piloto a usuarios reales.
