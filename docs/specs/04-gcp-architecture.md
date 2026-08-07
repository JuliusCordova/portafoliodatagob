# 04 · GCP Architecture

## Decisión arquitectónica

La demo se construye separada de DataOps. Su responsabilidad es gobernar la demanda, no ejecutar pipelines de calidad, profiling o reconciliación.

## Arquitectura lógica

```text
Usuario / Gobierno / Comités
        ↓
Frontend Web en Cloud Run
        ↓
Backend API en Cloud Run
        ↓
Servicios de agentes en Cloud Run
        ↓
Firestore / BigQuery / Cloud Storage
        ↓
Dashboards y auditoría
```

## Componentes GCP propuestos

### Cloud Run

- `demand-web`: UI web de backlog, evaluación y comité.
- `demand-api`: API backend para ciclo de vida.
- `agent-orchestrator`: servicio para invocar agentes y registrar resultados.

### Firestore

Persistencia operacional de demandas, scoring, decisiones y estados.

### BigQuery

Modelo analítico del portafolio para tableros ejecutivos.

Tablas sugeridas:

- `demand_requests`
- `business_cases`
- `scoring_assessments`
- `committee_decisions`
- `mvp_production_gates`
- `portfolio_metrics`

### Cloud Storage

Almacenamiento de artefactos:

- correos adjuntos,
- documentos de caso de uso,
- actas de comité,
- evidencia MVP,
- exportaciones del portafolio.

### Pub/Sub

Eventos del ciclo de vida:

- `demand.received`
- `demand.classified`
- `demand.scored`
- `committee.decision_recorded`
- `mvp.gate_evaluated`

### Vertex AI

Uso de Gemini para agentes de clasificación, generación de caso de uso, scoring asistido y preparación de comité.

### Secret Manager

Gestión de secretos y credenciales.

### Cloud Logging / Monitoring

Observabilidad, auditoría técnica y seguimiento operacional.

## Infraestructura como código

Terraform debe provisionar:

- proyecto o configuración base,
- APIs habilitadas,
- service accounts,
- Cloud Run,
- Firestore,
- BigQuery dataset y tablas,
- buckets,
- topics Pub/Sub,
- Secret Manager,
- IAM mínimo necesario.

## Ambientes

- `dev`: demo y pruebas.
- `qa`: validación funcional.
- `prod`: opcional para demo estabilizada.

## Seguridad mínima

- Autenticación vía Identity-Aware Proxy o autenticación app-level.
- Service accounts separadas por componente.
- Principio de mínimo privilegio.
- Registro de decisiones y cambios.
- Clasificación de información sensible.

## Separación frente a DataOps

Esta plataforma no implementa reglas de calidad de datos productivas ni pipelines medallion. Puede consumir métricas o resultados de DataOps en una fase futura, pero su foco inicial es gestión de demanda y gobierno del portafolio.
