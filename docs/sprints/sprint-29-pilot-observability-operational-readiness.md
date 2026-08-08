# Sprint 29 · Pilot observability and operational readiness

## Objetivo

Agregar una base mínima de observabilidad operativa para ejecutar el piloto controlado de ATLAS DataGob con mayor confianza.

## Alcance

- Servicio `operational_readiness.py`.
- Endpoint `GET /ops/readiness`.
- Permiso `ops:read` en el modelo de autorización.
- API version `0.6.4`.
- Pruebas unitarias del snapshot operativo.
- Smoke autenticado extendido con validación de readiness.
- Runbook de observabilidad operativa.
- Runbook de respuesta a incidentes.

## No incluye

- Integración con Cloud Monitoring.
- Dashboards reales de GCP.
- Alertas automáticas.
- Métricas Prometheus/OpenTelemetry.
- Gestión formal de on-call.

## Diseño

El endpoint `/ops/readiness` es read-only y no modifica datos. Resume:

- Estado general del piloto.
- Auth mode activo.
- Persistencia activa.
- Población del backlog.
- Brechas de gobierno.
- Eventos de auditoría.
- Recomendaciones operativas.

## Criterios de aceptación

- El endpoint `/ops/readiness` responde con `snapshot_type=pilot_operational_readiness`.
- El endpoint está protegido por `ops:read` cuando `ATLAS_AUTH_MODE=header`.
- El smoke autenticado valida `/ops/readiness` con identidad permitida.
- Las pruebas API siguen pasando.
- El build Web y los contenedores siguen pasando.

## Próximo incremento recomendado

Sprint 30 · Production promotion gate and release candidate checklist.

Objetivo: definir la frontera formal entre piloto, release candidate y producción gestionada.
