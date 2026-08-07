# 09 · Arquitectura MVP agéntica

## Decisión

ATLAS DataGob será desarrollado como MVP agéntico en Google Cloud usando **Gemini ADK** para la capa de agentes.

El producto mantiene separación clara frente a DataOps: gobierna demanda, priorización, decisiones y gates; no ejecuta pipelines productivos de datos.

## Diagrama Mermaid · Arquitectura

```mermaid
flowchart TB
  UX["Figma-first Web UX"] --> WEB["Frontend Web"]
  WEB --> API["Demand API on Cloud Run"]
  API --> ORCH["Gemini ADK Agent Orchestrator"]
  ORCH --> A1["Intake Agent"]
  ORCH --> A2["Domain Classifier Agent"]
  ORCH --> A3["Business Case Agent"]
  ORCH --> A4["Scoring Agent"]
  ORCH --> A5["Governance Reviewer Agent"]
  ORCH --> A6["Committee Pack Agent"]
  ORCH --> A7["MVP Gate Agent"]
  ORCH --> A8["Portfolio Insights Agent"]
  ORCH --> GEM["Gemini Models on Vertex AI"]
  API --> FS["Firestore Operational State"]
  API --> BQ["BigQuery Portfolio Analytics"]
  API --> GCS["Cloud Storage Evidence"]
  API --> PS["Pub/Sub Lifecycle Events"]
  SEC["IAM · Secret Manager · Audit Logs"] --> API
  IAC["Terraform + GitHub Actions"] --> WEB
  IAC --> API
  IAC --> ORCH
  IAC --> FS
  IAC --> BQ
```

## Componentes

### Frontend Web

Responsable de:

- Dashboard ejecutivo.
- Registro de demanda.
- Triage asistido.
- Scoring.
- Vista de comités.
- MVP Gate.
- Detalle de iniciativa.
- Configuración.

### Demand API

Responsable de:

- CRUD de demandas.
- Estados del ciclo de vida.
- Scoring persistido.
- Decisiones de comité.
- Registro de evidencias.
- Integración con agentes.

### Agent Orchestrator

Servicio construido con Gemini ADK para coordinar agentes especializados.

### Persistencia

- Firestore: estado operacional y documentos del ciclo de vida.
- BigQuery: analítica de portafolio y métricas ejecutivas.
- Cloud Storage: adjuntos, actas, evidencias y exportaciones.
- Pub/Sub: eventos desacoplados.

## Flujo Mermaid · Gestión de demanda

```mermaid
flowchart LR
  A["Solicitud por correo o formulario"] --> B["Intake Agent"]
  B --> C["Registro de demanda"]
  C --> D["Domain Classifier Agent"]
  D --> E["Caso de uso estructurado"]
  E --> F["Governance Reviewer Agent"]
  F --> G{"Cumple mínimos"}
  G -- "No" --> H["Reformular"]
  H --> B
  G -- "Sí" --> I["Scoring Agent"]
  I --> J["Committee Pack Agent"]
  J --> K["Comité Operativo recomienda"]
  K --> L["Comité Estratégico decide"]
  L --> M{"Resultado"}
  M -- "Ejecutar" --> N["Plan de ejecución"]
  M -- "Backlog" --> O["Backlog priorizado"]
  M -- "Descartar" --> P["Cierre trazable"]
  M -- "Condicionado" --> Q["Condiciones de aprobación"]
  N --> R["MVP Gate Agent"]
  R --> S{"Pase a producción"}
  S -- "GO" --> T["Producción"]
  S -- "GO condicionado" --> U["Remediación"]
  S -- "Pivotar" --> H
  S -- "NO GO" --> P
```

## Estados del ciclo de vida

```mermaid
stateDiagram-v2
  [*] --> Recibido
  Recibido --> EnTriage
  EnTriage --> RequiereInformacion
  RequiereInformacion --> EnTriage
  EnTriage --> CasoEstructurado
  CasoEstructurado --> EvaluacionOperativa
  EvaluacionOperativa --> Priorizado
  Priorizado --> DecisionEstrategica
  DecisionEstrategica --> Aprobado
  DecisionEstrategica --> Backlog
  DecisionEstrategica --> Reformular
  DecisionEstrategica --> Descartado
  Aprobado --> EnEjecucion
  EnEjecucion --> EnMVP
  EnMVP --> EvaluacionProduccion
  EvaluacionProduccion --> Produccion
  EvaluacionProduccion --> GoCondicionado
  EvaluacionProduccion --> Pivotar
  EvaluacionProduccion --> NoGo
  GoCondicionado --> EvaluacionProduccion
  Pivotar --> Reformular
  NoGo --> Cerrado
  Produccion --> Cerrado
  Descartado --> Cerrado
  Backlog --> Priorizado
```
