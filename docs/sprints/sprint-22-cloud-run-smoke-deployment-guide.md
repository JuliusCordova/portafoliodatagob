# Sprint 22 · Cloud Run smoke deployment guide

## Objetivo

Preparar la ejecución controlada de ATLAS DataGob en Cloud Run, validando API, Web, proxy Next.js y persistencia Firestore mediante un smoke test repetible y no destructivo por defecto.

## Incluye

- `scripts/cloud_run/smoke_test_cloud_run.py`.
- Target `make cloud-smoke`.
- Target `make validate-cloud-smoke-script`.
- Actualización del workflow `Deploy scripts` para compilar el smoke test Python.
- Guía `docs/deployment/cloud-run-smoke-deployment-guide.md`.
- Template `docs/deployment/cloud-run-smoke-record-template.md`.

## Decisiones de diseño

1. **Smoke no destructivo por defecto**: el reset de demo queda omitido salvo que se configure `ATLAS_SMOKE_ALLOW_DEMO_RESET=true`.
2. **Validación API + Web**: se prueba `/health`, `/demo/cases`, Web root y proxy `/api/demo/cases`.
3. **Registro formal de evidencia**: se agrega template para capturar URL, revisión, variables, resultados y decisión.
4. **Sin despliegue automático en CI**: CI solo valida sintaxis y build. La ejecución real queda manual y controlada.

## Variables del smoke

```bash
export ATLAS_API_URL="https://<api-service-url>"
export ATLAS_WEB_URL="https://<web-service-url>"
export ATLAS_SMOKE_ALLOW_DEMO_RESET=false
```

Para validar escritura Firestore vía reset de demo:

```bash
export ATLAS_SMOKE_ALLOW_DEMO_RESET=true
```

## Validación CI

Deben pasar:

- API tests.
- Web build.
- Container build API.
- Container build Web.
- Deploy scripts syntax.
- Smoke script compile.

## Próximo incremento sugerido

Sprint 23 · Auth and role model readiness: preparar autenticación, roles y protección de endpoints antes de exponer el piloto a usuarios reales.
