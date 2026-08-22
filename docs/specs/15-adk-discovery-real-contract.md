# Feature 56 — Contrato real de Discovery ADK

## 1. Propósito

Este documento complementa `14-adk-agent-governance.md` y congela el modelo de dominio después de ejecutar el spike de discovery contra el entorno real de Google Cloud.

La evidencia demuestra que un recurso `ReasoningEngine` observado por Google **representa un deployment/release administrado**, y no debe equipararse automáticamente con un agente lógico gobernado por ATLAS.

## 2. Evidencia real

Ejecución: 2026-08-22T00:08:57Z

Entorno observado:

- Project: `proyectopersonal-480420`
- Region: `us-central1`
- Fuente: Agent Platform / Reasoning Engines
- Total Reasoning Engines: **24**
- Total con `spec.agentFramework=google-adk`: **23**
- Recursos no ADK filtrados: **1**
- Operación: read-only
- Resultado: **PASS**

Archivos generados por el spike:

- `/tmp/atlas-f56-agent-engines-20260822T000857Z.json`
- `/tmp/atlas-f56-observed-agents-20260822T000857Z.json`

El spike finalizó con:

```text
[PASS] Discovery completed. No agent was modified.
```

## 3. Hallazgo principal

Los 23 recursos ADK no representan 23 agentes de negocio distintos.

El estate observado contiene múltiples deployments/candidatos históricos de, al menos, dos familias reconocibles por metadata visible:

### Ayniq

- 19 Reasoning Engines ADK observados.
- Incluyen múltiples candidatos de `Ayniq IaC Agent` y `Ayniq Plan Reviewer`.
- Service Account observada: `ayn-iac-agent-runtime@proyectopersonal-480420.iam.gserviceaccount.com`.
- `deployment_source_kind=package` en todos los recursos observados.

### PrimaDemo

- 4 Reasoning Engines ADK observados.
- Corresponden a múltiples candidatos/versiones de `PrimaDemo Financial Journey`.
- Service Account observada: `primademo-agent-runtime@proyectopersonal-480420.iam.gserviceaccount.com`.
- `deployment_source_kind=package` en todos los recursos observados.

Por tanto, **ReasoningEngine es una entidad operacional de deployment/versionado y no la identidad canónica del agente gobernado**.

## 4. Decisión de dominio

A partir de esta evidencia, Feature 56 separa obligatoriamente:

1. `GovernedAgent` — identidad lógica gobernada por ATLAS.
2. `ObservedDeployment` — deployment/release ADK descubierto desde Google Cloud.
3. `AgentDeploymentBinding` — vínculo explícito entre un deployment observado y un agente lógico.
4. `GovernanceProfile` — metadata de negocio y gobierno perteneciente al `GovernedAgent`, no a una revisión concreta salvo excepciones explícitas.

### 4.1 Principio

> Un deployment ADK descubierto no se convierte automáticamente en un agente lógico gobernado. ATLAS conserva el recurso observado y permite asociarlo a una identidad de agente gobernada.

## 5. Contrato congelado — ObservedDeployment

```json
{
  "deployment_id": "google-adk:8881601491744325632",
  "provider": "google_cloud",
  "framework": "google-adk",
  "provider_deployment_id": "8881601491744325632",
  "resource_name": "projects/.../locations/us-central1/reasoningEngines/8881601491744325632",
  "display_name": "Ayniq IaC Agent candidate 2026.08.10-06",
  "project_id": "proyectopersonal-480420",
  "location": "us-central1",
  "service_account": "ayn-iac-agent-runtime@proyectopersonal-480420.iam.gserviceaccount.com",
  "deployment_source_kind": "package",
  "created_at": "2026-08-10T15:57:08.618713Z",
  "updated_at": "2026-08-10T16:00:21.386065Z",
  "first_seen_at": "...",
  "last_seen_at": "...",
  "discovery_status": "discovered",
  "binding_status": "unbound",
  "governed_agent_id": null,
  "observed_metadata": {}
}
```

### Campos confirmados por el spike

- `provider_deployment_id`
- `display_name`
- `framework=google-adk`
- `created_at`
- `updated_at`
- `service_account`
- `deployment_source_kind=package`
- project y location desde el scope de discovery

### Campos que NO deben asumirse desde este discovery

- Business Owner
- Technical Owner
- propósito de negocio
- criticidad
- riesgo
- autonomía
- Human-in-the-Loop
- clasificación de datos
- modelo LLM exacto
- tools autorizadas
- estado de producción/candidato como verdad canónica
- compliance

Si no existe una fuente oficial adicional, estos campos son administrados por ATLAS o permanecen `null/not_assessed`.

## 6. Contrato — GovernedAgent

```json
{
  "agent_id": "AGT-...",
  "canonical_name": "Ayniq IaC Agent",
  "description": null,
  "business_owner": null,
  "technical_owner": null,
  "business_purpose": null,
  "business_area": null,
  "environment_scope": [],
  "business_criticality": "not_assessed",
  "autonomy_level": "not_assessed",
  "risk_level": "not_assessed",
  "data_classification": [],
  "human_oversight": "not_assessed",
  "writes_to_systems": null,
  "governance_status": "not_assessed",
  "created_at": "...",
  "updated_at": "..."
}
```

El `GovernedAgent` es la unidad que ATLAS reporta como **agente gobernado**.

## 7. Contrato — AgentDeploymentBinding

```json
{
  "binding_id": "ADB-...",
  "agent_id": "AGT-...",
  "deployment_id": "google-adk:8881601491744325632",
  "environment": "candidate",
  "lifecycle_status": "active",
  "is_current": true,
  "binding_source": "human_confirmed",
  "bound_by": "...",
  "bound_at": "..."
}
```

### Regla crítica

V1 puede **sugerir** una agrupación por similitud de display name, labels, service account u otra metadata observada, pero ninguna heurística puede convertirse automáticamente en identidad gobernada.

La asociación final debe ser explícita o provenir de una fuente canónica aprobada.

## 8. Cambio de KPIs

La pantalla no utilizará `23` como "23 agentes".

Los KPIs se separan:

### Estate operacional

- `ADK deployments observed`
- `Unbound deployments`
- `Current deployments`
- `Not observed deployments`

### Estate gobernado

- `Governed agents`
- `Not assessed agents`
- `High-risk agents`
- `Agents with findings`
- `Review required`

En el primer refresh real, antes de crear bindings:

```text
ADK deployments observed = 23
Unbound deployments       = 23
Governed agents            = 0
```

Esto es correcto y evita inflar el número corporativo de agentes.

## 9. Persistencia revisada

Colecciones propuestas:

```text
atlas_agent_deployments
atlas_agents
atlas_agent_deployment_bindings
atlas_agent_governance
atlas_agent_governance_events
atlas_agent_findings
```

`atlas_agent_deployments` conserva cada Reasoning Engine observado, incluso cuando deja de aparecer en un refresh posterior.

`atlas_agents` contiene las identidades lógicas administradas por ATLAS.

## 10. UX derivada de la evidencia

La pantalla `Gobierno de Agentes` tendrá dos niveles:

### A. Agents

Vista principal de entidades lógicas gobernadas.

Columnas sugeridas:

| Agente | Current deployment | Owner | Riesgo | Autonomía | Gobierno | Findings |
|---|---|---|---|---|---|---|

### B. Deployments

Vista operacional/discovery.

Columnas sugeridas:

| Deployment | Agent | Framework | Service Account | Source | Created | Binding |
|---|---|---|---|---|---|---|

Un deployment `unbound` debe ser accionable desde UI mediante `Asociar a agente` o `Crear identidad gobernada`.

## 11. Criterios de aceptación adicionales

- AC56-D01: Un Reasoning Engine no incrementa automáticamente el KPI `Governed agents`.
- AC56-D02: El refresh real de `proyectopersonal-480420/us-central1` puede representar los 23 deployments ADK sin pérdida de identidad provider.
- AC56-D03: Los 23 deployments inicialmente descubiertos pueden permanecer `unbound` sin inventar agentes lógicos.
- AC56-D04: Un usuario autorizado puede asociar uno o más deployments a un `GovernedAgent`.
- AC56-D05: Múltiples deployments/versiones pueden pertenecer al mismo agente lógico.
- AC56-D06: Un deployment antiguo no se elimina al dejar de observarse; conserva historia/evidencia.
- AC56-D07: Service account y display name pueden ayudar al usuario a asociar recursos, pero no constituyen por sí solos una identidad de gobierno.
- AC56-D08: Los campos de gobierno no observables desde Google permanecen nulos/not_assessed hasta su registro explícito.

## 12. Conclusión

El discovery real valida la viabilidad técnica de Feature 56 y mejora el modelo inicial: ATLAS no gobernará una lista plana de Reasoning Engines, sino un **estate lógico de agentes con trazabilidad completa hacia sus deployments ADK reales**.

Este modelo permite administrar release candidates, múltiples versiones, promociones y decommission sin perder evidencia ni inflar el inventario corporativo.