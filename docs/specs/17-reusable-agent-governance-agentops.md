# SPEC-059 — Reusable Agent Governance & AgentOps Framework

Status: Draft / Development
Baseline: `main@d5dabf174cb70830732eeecaf9d867fddf35abcd`
Feature branch: `feature/59-reusable-agent-governance-agentops`

## 1. Visión

ATLAS DataGob incorporará un componente reusable de Gobierno de Agentes + AgentOps inspirado en el governance dashboard de Business Rules Silver. El objetivo no es crear un tablero específico para ATLAS, sino un contrato y una experiencia visual reutilizables por múltiples productos agénticos.

Principio rector:

> Un agente nuevo no debe requerir que su gobierno, observabilidad, FinOps y trazabilidad se diseñen nuevamente desde cero.

## 2. Golden reference visual

Referencia oficial de diseño: `JuliusCordova/bussinesrulessilver/preview/governance-dashboard`.

Se preservan los patrones de producto que demostraron valor:

- sidebar persistente;
- resumen ejecutivo con KPIs;
- FinOps IA;
- Calidad & Evaluación;
- catálogo de agentes;
- ejecuciones y drill-down;
- calidad/salud de plataforma;
- artefactos;
- alertas;
- gobierno, arquitectura y controles.

La semántica del dominio es configurable. Por ejemplo, Business Rules usa calidad de datos; ATLAS usa calidad de evaluación del Intake, especialistas y decisiones gobernadas.

## 3. Alcance V1

Primer consumidor: `ATLAS-DATAGOB`.

Runtime V1: Google Gemini + ADK sobre GCP.

Agentes iniciales ATLAS:

- `atlas_intake_orchestrator`
- `atlas_business_fact_extractor`
- `atlas_data_readiness_agent`
- `atlas_architecture_validation_agent`
- `atlas_policy_controls_agent`

El contrato debe permitir incorporar posteriormente Business Rules, Reconciliation, Profiling/Quality y nuevos sistemas sin cambiar el esquema base.

## 4. Modelo conceptual canónico

```text
AgentSystem
   │
   ├── GovernedAgent
   │      ├── GovernanceProfile
   │      └── DeploymentBinding
   │              └── ObservedDeployment
   │
   └── AgentRun
          ├── AgentRunStep
          ├── LLMUsage
          ├── Artifact
          ├── EvaluationEvidence
          ├── Finding
          └── Alert
```

Identificadores transversales:

- `agent_system_id`
- `agent_id`
- `deployment_id`
- `run_id`
- `trace_id`
- `environment`
- `event_timestamp`

## 5. Separación de planos

### 5.1 Control Plane — Firestore

Colecciones V1:

- `atlas_agent_systems`
- `atlas_agents`
- `atlas_agent_deployments`
- `atlas_agent_deployment_bindings`
- `atlas_agent_governance`
- `atlas_agent_findings`
- `atlas_agent_governance_events`

Responsabilidad: identidad, ownership, risk posture, autonomía, bindings, findings y evidencia de gobierno de baja/moderada volumetría.

### 5.2 Observability Plane — BigQuery

Tablas V1:

- `agent_runs`
- `agent_run_steps`
- `agent_llm_usage`
- `agent_artifacts`
- `agent_evaluation_evidence`
- `agent_alerts`
- `agent_health_snapshots`
- `agent_cost_attribution`

Responsabilidad: histórico de alta volumetría, agregaciones ejecutivas, análisis temporal, FinOps y drill-down.

## 6. Contrato AgentOps V1

Los productores instrumentados deben poder emitir como mínimo:

```text
register_agent()
start_run()
record_step()
record_llm_usage()
record_artifact()
record_evaluation()
record_finding()
record_alert()
record_health()
finish_run()
```

V1 no obliga a que cada agente implemente todos los eventos; las capacidades ausentes deben mostrarse como `not_available`, nunca inventarse.

## 7. Semántica FinOps

Se separan explícitamente:

- `billed`: costo real proveniente de Cloud Billing Export;
- `attributed`: costo asignado con una regla de atribución gobernada y evidencia suficiente;
- `unattributed`: costo real compartido que aún no puede distribuirse responsablemente.

Nunca se mostrará un costo por agente o run como real si solo existe una estimación sintética.

## 8. Calidad & Evaluación

El framework expone una vista común, pero el perfil es configurable:

- `data_quality`: reglas, quality score, quarantine, block load;
- `agent_evaluation`: completitud, evaluación de respuesta, decisión gobernada, specialist delegation, policy/architecture compliance;
- futuros perfiles podrán añadirse sin cambiar las tablas core.

Para ATLAS V1 se consideran métricas candidatas:

- Business Case completeness;
- Definition of Ready;
- ejecución ADK de especialistas;
- frecuencia de `runtime_guard`;
- policy assessment success;
- architecture assessment success;
- DOCX generation success;
- governed registration success;
- latencia y tokens por agente.

## 9. Vistas UI V1

Ruta objetivo: `/agent-governance`.

Navegación reusable:

1. Resumen ejecutivo
2. FinOps IA
3. Calidad & Evaluación
4. Agentes
5. Ejecuciones
6. Calidad & Salud
7. Artefactos
8. Alertas
9. Gobierno

El primer incremento implementa el shell visual del Resumen Ejecutivo. Las siguientes iteraciones conectarán datos reales.

## 10. Requerimientos funcionales

- RF-059-01: registrar sistemas agénticos independientemente de sus deployments.
- RF-059-02: registrar agentes lógicos y vincularlos a uno o más deployments observados.
- RF-059-03: conservar historial cuando un deployment deja de observarse.
- RF-059-04: persistir runs y pasos correlacionados por `run_id`/`trace_id`.
- RF-059-05: registrar consumo LLM por agente, modelo y run.
- RF-059-06: exponer artefactos producidos por los runs sin almacenar binarios en BigQuery.
- RF-059-07: registrar findings y eventos de gobierno de forma append-preserving.
- RF-059-08: soportar health snapshots y alertas.
- RF-059-09: distinguir costo facturado, atribuido y no atribuible.
- RF-059-10: ofrecer vistas de resumen, agentes, ejecuciones, FinOps, salud, alertas y gobierno.
- RF-059-11: permitir que cada producto configure su perfil de Calidad & Evaluación.
- RF-059-12: ATLAS debe registrar sus cinco agentes iniciales bajo `ATLAS-DATAGOB`.

## 11. Requerimientos no funcionales

- RNF-059-01: append-preserving para evidencia histórica y findings.
- RNF-059-02: ninguna métrica debe inventarse cuando la fuente no existe.
- RNF-059-03: Firestore y BigQuery deben usar IDs estables y correlacionables.
- RNF-059-04: control plane y observability plane deben poder evolucionar de forma independiente.
- RNF-059-05: el framework debe ser reusable sin depender de conceptos específicos de ATLAS.
- RNF-059-06: accesos de gobierno deberán aplicar least privilege.
- RNF-059-07: la UI deberá conservar navegación y lenguaje visual coherentes entre productos.
- RNF-059-08: PII/prompts/responses no se persistirán por defecto; cualquier captura deberá ser explícita y gobernada.
- RNF-059-09: tablas BigQuery deberán particionarse por tiempo y clusterizarse por las claves de consulta más frecuentes.
- RNF-059-10: cambios F59 deberán validarse en preview aislado antes de promoción.

## 12. Seguridad y privacidad

Por defecto el framework registra metadata operacional, no contenido conversacional completo.

Campos de payload sensibles se representarán mediante referencias, hashes o URIs gobernadas cuando corresponda. La captura de prompts/responses requerirá una decisión explícita de producto y política de retención.

## 13. Criterios de aceptación del primer incremento

- CA-059-01: branch F59 parte del SHA productivo aprobado.
- CA-059-02: contrato V1 documenta entidades comunes e identificadores transversales.
- CA-059-03: DDL BigQuery define las ocho tablas analíticas V1.
- CA-059-04: modelos Python validan las entidades core sin depender de un dominio específico.
- CA-059-05: existe test de contrato básico.
- CA-059-06: `/agent-governance` compila sin dependencias adicionales.
- CA-059-07: la pantalla se identifica como preview de diseño hasta conectarse a datos reales.
- CA-059-08: visualmente adopta el patrón Business Rules sin copiar su semántica específica.

## 14. Fuera de alcance del primer incremento

- promoción a producción;
- multicloud runtime discovery;
- cálculo definitivo de atribución de costos;
- persistencia de prompts/responses completos;
- migración automática del histórico Business Rules;
- merge directo de la rama histórica F56.

## 15. Estrategia de evolución

F59 rescata el modelo validado de F56 (`GovernedAgent → DeploymentBinding → ObservedDeployment`) y lo generaliza. No se mergeará F56 de forma ciega porque fue desarrollada antes del baseline F57+F58. La incorporación se hará por capacidades y contratos explícitos.