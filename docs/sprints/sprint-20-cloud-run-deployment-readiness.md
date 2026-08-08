# Sprint 20 · Cloud Run deployment readiness

## Objetivo

Preparar ATLAS DataGob para despliegue en Cloud Run mediante contenedores separados para API y frontend, sin ejecutar todavía despliegue automático ni crear infraestructura GCP real.

## Incluye

- `apps/api/Dockerfile`.
- `apps/web/Dockerfile`.
- `apps/api/requirements.txt` actualizado con runtime Firestore.
- Script `start` en `apps/web/package.json`.
- `.dockerignore` raíz.
- `apps/web/.dockerignore`.
- Workflow `.github/workflows/container-build.yml`.
- Guía `docs/deployment/cloud-run-deployment-readiness.md`.
- Ejemplos de variables para API y Web.
- Checklist `docs/deployment/firestore-service-account-checklist.md`.

## Decisiones

- API y Web se empaquetan por separado.
- El API escucha el puerto definido por `PORT`, con default `8080`.
- El frontend Next.js ejecuta `next start` en contenedor.
- Firestore no es obligatorio para CI; se activa solo por variables de entorno.
- El workflow de contenedores solo valida build, no despliega.

## Validación esperada

En CI deben pasar:

- API tests.
- Web build.
- Container build API.
- Container build Web.

## Fuera de alcance

- Crear Artifact Registry.
- Crear service account real.
- Crear Cloud Run services.
- Configurar dominio o autenticación.
- Automatizar despliegue continuo.

## Próximo incremento recomendado

Sprint 21 · Cloud Run deploy scripts: scripts no destructivos para build/push/deploy, configuración por ambiente y verificación post-deploy.
