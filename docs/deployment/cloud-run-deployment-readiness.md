# Cloud Run deployment readiness

Sprint 20 prepara ATLAS DataGob para empaquetar API y frontend como contenedores desplegables en Cloud Run.

## Objetivo

Separar el runtime local de la preparación cloud:

- API FastAPI en contenedor Python.
- Frontend Next.js en contenedor Node.
- Variables de entorno por ambiente.
- Persistencia `local_json` para demo local.
- Persistencia `firestore` para piloto cloud ligero.
- Validación de build de contenedores en GitHub Actions.

## Imágenes

### API

Dockerfile:

```bash
apps/api/Dockerfile
```

Build local desde la raíz del repo:

```bash
docker build -f apps/api/Dockerfile -t atlas-datagob-api:local .
```

Run local:

```bash
docker run --rm -p 8080:8080 \
  -e ATLAS_DEMAND_REPOSITORY=local_json \
  atlas-datagob-api:local
```

### Web

Dockerfile:

```bash
apps/web/Dockerfile
```

Build local:

```bash
docker build -f apps/web/Dockerfile -t atlas-datagob-web:local apps/web
```

Run local apuntando al API:

```bash
docker run --rm -p 3000:8080 \
  -e ATLAS_INTERNAL_API_BASE=http://host.docker.internal:8080 \
  atlas-datagob-web:local
```

## Variables API

### Demo/local

```bash
ATLAS_DEMAND_REPOSITORY=local_json
ATLAS_DEMAND_BACKLOG_PATH=data/runtime/demand_backlog.json
ATLAS_DEMO_SEED_PATH=data/demo/demand_backlog_seed.json
```

### Cloud Run con Firestore

```bash
ATLAS_DEMAND_REPOSITORY=firestore
ATLAS_FIRESTORE_PROJECT=<gcp-project-id>
ATLAS_FIRESTORE_DATABASE=(default)
ATLAS_FIRESTORE_COLLECTION=atlas_datagob_demands
ATLAS_DEMO_SEED_PATH=data/demo/demand_backlog_seed.json
```

## Variables Web

```bash
ATLAS_INTERNAL_API_BASE=https://<api-cloud-run-url>
```

El frontend usa `ATLAS_INTERNAL_API_BASE` desde sus rutas Next.js server-side para invocar al API sin exponer directamente la URL interna en el navegador.

## Build con Cloud Build

Ejemplo API:

```bash
gcloud builds submit \
  --tag <region>-docker.pkg.dev/<project>/<repo>/atlas-datagob-api:latest \
  --file apps/api/Dockerfile \
  .
```

Ejemplo Web:

```bash
gcloud builds submit apps/web \
  --tag <region>-docker.pkg.dev/<project>/<repo>/atlas-datagob-web:latest \
  --file Dockerfile
```

## Deploy Cloud Run

Ejemplo API:

```bash
gcloud run deploy atlas-datagob-api \
  --image <region>-docker.pkg.dev/<project>/<repo>/atlas-datagob-api:latest \
  --region <region> \
  --service-account atlas-datagob-runtime@<project>.iam.gserviceaccount.com \
  --set-env-vars ATLAS_DEMAND_REPOSITORY=firestore,ATLAS_FIRESTORE_PROJECT=<project>,ATLAS_FIRESTORE_DATABASE='(default)',ATLAS_FIRESTORE_COLLECTION=atlas_datagob_demands,ATLAS_DEMO_SEED_PATH=data/demo/demand_backlog_seed.json
```

Ejemplo Web:

```bash
gcloud run deploy atlas-datagob-web \
  --image <region>-docker.pkg.dev/<project>/<repo>/atlas-datagob-web:latest \
  --region <region> \
  --set-env-vars ATLAS_INTERNAL_API_BASE=https://<api-cloud-run-url>
```

## Service account checklist para Firestore

Service account sugerida:

```bash
atlas-datagob-runtime@<project>.iam.gserviceaccount.com
```

Permisos mínimos para el piloto:

- Acceso de lectura/escritura a Firestore sobre la base/colección objetivo.
- Capacidad de escribir logs del servicio.
- Permiso de invocación si el API queda privado detrás del frontend.

Validaciones antes de demo cloud:

- Firestore creado en el proyecto.
- Colección objetivo definida: `atlas_datagob_demands`.
- Service account asignada al servicio API.
- API desplegado con `ATLAS_DEMAND_REPOSITORY=firestore`.
- Web desplegado con `ATLAS_INTERNAL_API_BASE` apuntando al API.
- Botón de reset demo ejecutado y demandas visibles en Comité Operativo.

## Controles CI

Nuevo workflow:

```bash
.github/workflows/container-build.yml
```

Valida:

- Build imagen API.
- Build imagen Web.

No despliega automáticamente; solo prueba empaquetabilidad.

## Fuera de alcance Sprint 20

- Crear infraestructura GCP real.
- Crear Artifact Registry.
- Configurar IAM real.
- Desplegar automáticamente desde GitHub Actions.
- Exponer dominio custom.
- Autenticación de usuarios finales.
