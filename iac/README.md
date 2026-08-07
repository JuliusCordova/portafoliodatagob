# IaC · Google Cloud

Esta carpeta contendrá la infraestructura como código para la demo **QROMA Data Demand Governance**.

## Objetivo

Provisionar en Google Cloud los componentes mínimos para operar la demo de gestión de demanda de datos.

## Componentes esperados

- Cloud Run para frontend.
- Cloud Run para backend API.
- Cloud Run para orquestador de agentes.
- Firestore para persistencia operacional.
- BigQuery para tablero y analítica de portafolio.
- Cloud Storage para artefactos.
- Pub/Sub para eventos del ciclo de vida.
- Secret Manager para secretos.
- Service Accounts e IAM mínimo necesario.
- Logging y Monitoring.

## Estructura sugerida

```text
iac/
  environments/
    dev/
    qa/
    prod/
  modules/
    cloud-run-service/
    firestore/
    bigquery/
    storage/
    pubsub/
    iam/
  README.md
```

## Principio

La infraestructura debe poder recrearse desde cero sin configuración manual, manteniendo separación clara frente a cualquier demo DataOps existente.
