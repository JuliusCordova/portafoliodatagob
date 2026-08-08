# Sprint 21 · Cloud Run deploy scripts

## Objetivo

Agregar scripts no destructivos para construir, publicar y desplegar ATLAS DataGob en Cloud Run, separando API y Web, con verificación posterior al despliegue.

## Alcance implementado

- Validación previa de variables de entorno.
- Deploy script para API.
- Deploy script para Web.
- Verificación post-deploy.
- Plantilla de variables para Cloud Shell.
- Targets Makefile operativos.
- Workflow de validación de sintaxis Bash.
- Runbook operativo de despliegue.

## Decisiones

- Los scripts no crean ni eliminan infraestructura base.
- Se mantiene la separación API/Web.
- Firestore se activa por variables de entorno.
- El acceso público se controla explícitamente con `ATLAS_ALLOW_UNAUTHENTICATED`.
- El Web usa `ATLAS_INTERNAL_API_BASE` para comunicarse con API.

## Validaciones esperadas

- API tests.
- Web build.
- Container build API.
- Container build Web.
- Deploy scripts syntax.

## Pendiente para producción real

- IAM bindings automatizados.
- Secret Manager.
- Domain mapping.
- CI/CD deploy automático.
- Observabilidad y alertas Cloud Run.
- Autenticación de usuarios finales.

## Próximo incremento recomendado

Sprint 22 · Cloud Run smoke deployment guide: ejecución controlada en proyecto GCP, registro de URLs, ajuste CORS y validación funcional con Firestore real.
