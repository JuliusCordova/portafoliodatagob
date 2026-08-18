# Feature 54 — Checkpoint de evidencia

**Fecha:** 2026-08-18  
**Feature:** Conversational Governed Intake with Gemini ADK  
**Repositorio:** `JuliusCordova/portafoliodatagob`  
**Rama:** `feature/54-conversational-governed-intake-adk`  
**PR:** #59 — Draft  
**Baseline funcional antes de la evidencia final:** `4fd57a20b5e5f99d59bd86d8dbbdc48065c85059`  

> Este documento registra la evidencia validada de Feature 54 hasta el cierre del E2E de preview del 18 de agosto de 2026. No autoriza por sí mismo el merge ni el despliegue sobre los servicios estables.

## 1. Estado ejecutivo

Feature 54 tiene validado el núcleo funcional, arquitectónico y operativo del Intake Conversacional Gobernado:

- Gemini ADK ejecuta conversación real sobre Vertex AI.
- Existe extracción semántica obligatoria y estructurada de hechos del negocio por turno.
- El Orchestrator clasifica la necesidad y delega en especialistas ADK de Data Readiness, Architecture Validation y Policy & Controls.
- La clasificación semántica se mapea determinísticamente a la taxonomía oficial.
- La arquitectura se valida contra patrones GCP gobernados.
- Las políticas se cargan desde Cloud Storage real con fail-closed.
- El Canonical Business Case diferencia `definition_gaps` de `governance_requirements`.
- Un Business Case puede quedar `ready_to_register=true` aunque existan controles de delivery pendientes.
- Las sesiones conversacionales se persisten fuera del proceso mediante Agent Platform Sessions / `VertexAiSessionService`.
- Se validó continuidad de estado entre dos procesos Python separados.
- Existe fallback determinístico para evitar respuestas vacías del asistente.
- El head funcional validado tuvo CI 4/4 verde.
- El Web preview de Feature 54 fue desplegado de forma aislada y `/intake` respondió HTTP 200.
- El E2E visual/funcional de preview fue completado hasta registro real en Firestore.
- La demanda resultante ingresó correctamente a `operative_committee_review`.

**Estado del gate funcional:** PASS.

## 2. Evidencia de pruebas unitarias y contratos

Gate local previo al hardening durable:

```text
Ran 133 tests in 0.156s
OK
contract artifacts OK
policy architecture smoke OK
TEST_RC=0
```

Posteriormente, con los cambios de sesiones durables y fallback, la suite CI creció a aproximadamente 141 tests. El head funcional `4fd57a2` quedó validado en GitHub Actions con:

- API tests: PASS
- Web build: PASS
- Container build: PASS
- Deploy scripts: PASS

Resultado: **CI 4/4 PASS**.

El working tree local se mantuvo limpio salvo este directorio histórico no relacionado, que debe seguir sin incluirse en commits:

```text
?? docs/deployment/evidence/generated/20260809T174613Z/
```

## 3. Extractor semántico obligatorio

Se validó el extractor ADK `atlas_business_fact_extractor` en ejecución real contra Vertex AI.

Entrada:

```text
Tenemos quiebres de stock y Comercial se entera demasiado tarde.
Queremos anticiparlos para actuar antes.
```

Salida validada:

```json
{
  "business_problem": "Tenemos quiebres de stock y Comercial se entera demasiado tarde",
  "desired_outcome": "Anticipar los quiebres de stock para actuar antes",
  "business_area": null,
  "impacted_process": null,
  "current_situation": null,
  "stakeholders": ["Comercial"],
  "success_metrics": [],
  "data_sources": []
}
```

Gate:

```text
[PASS] MANDATORY BUSINESS FACT EXTRACTION
FACT_RC=0
```

Este cambio corrige el defecto observado en E2E anteriores donde Gemini comprendía el problema, pero `business_problem` no quedaba persistido en el estado canónico.

## 4. E2E conversacional v5 — PASS

Caso probado: anticipación de quiebres de stock con ventas e inventarios SAP.

### Resultado final

```text
PRIMARY_TYPE = machine_learning
SUBTYPE = forecasting
SECONDARY = ['dashboard_analytics', 'data_engineering']
DATA_INTEGRATION = True
DATA_READINESS_STATUS = ready
DATA_READINESS_SCORE = 100
ARCHITECTURE_PATTERN = GCP-ML-001
POLICY_STATUS = controls_required
POLICY_REFERENCES = ['DATA-001@1.0', 'DATA-002@1.0', 'SEC-001@1.0', 'ML-001@1.0', 'FINOPS-001@1.0']
BUSINESS_PROBLEM = productos tienen riesgo de quedarse sin stock
DESIRED_OUTCOME = reducir los quiebres de stock
BUSINESS_AREA = Planificación Comercial
IMPACTED_PROCESS = Planificación y reposición de inventario
SUCCESS_METRICS = ['Reducir los quiebres de stock al menos 20%']
DATA_SOURCES = ['SAP ventas', 'SAP inventario']
DEFINITION_GAPS = []
COMPLETENESS = 100
READY = True
```

Gate:

```text
[PASS] FEATURE 54 E2E V5
SESSION_ID = INTAKE-DBA26AAE9BE6
GEMINI_RC=0
```

### Gobierno preservado

Aunque el Business Case quedó listo para registro, los controles de gobierno permanecieron visibles. La decisión validada es:

- `definition_gaps` bloquea la definición/registro.
- `governance_requirements` no bloquea el registro cuando el Business Case está suficientemente definido.
- Los requisitos de gobierno continúan hacia Comité, diseño, delivery y producción.

## 5. Catálogos de gobierno reales en GCS

Configuración validada:

```text
Project: proyectopersonal-480420
Region: us-central1
Bucket: atlas-datagob-governance-proyectopersonal-480420
Prefix: atlas-governance
ATLAS_GOVERNANCE_REQUIRE_GCS=true
```

Resultado:

```json
{
  "source": "gcs",
  "bucket": "atlas-datagob-governance-proyectopersonal-480420",
  "prefix": "atlas-governance",
  "gcs_required": true,
  "policy_count": 7,
  "architecture_pattern_count": 5
}
```

Políticas disponibles:

- DATA-001 v1.0 — Data ownership and traceability
- DATA-002 v1.0 — Certified consumption layer
- SEC-001 v1.0 — Identity, secrets and least privilege
- ML-001 v1.0 — Machine Learning production readiness
- GENAI-001 v1.0 — Grounded Generative AI
- AGENT-001 v1.0 — Governed agent actions
- FINOPS-001 v1.0 — Cloud cost accountability

Patrones disponibles:

- GCP-DE-001
- GCP-BI-001
- GCP-ML-001
- GCP-GENAI-001
- GCP-AGENT-001

## 6. Sesiones ADK durables — PASS

El backend principal dejó de depender exclusivamente de `InMemorySessionService` para producción y admite Agent Platform Sessions mediante `VertexAiSessionService`.

Variables de runtime validadas:

```text
ATLAS_ADK_SESSION_BACKEND=vertex_ai
ATLAS_ADK_REQUIRE_DURABLE_SESSIONS=true
GOOGLE_CLOUD_AGENT_ENGINE_ID=<session store id>
```

Los nuevos IDs de sesión se normalizaron para Agent Platform Sessions:

```text
intake-<hex>
```

### Cross-process E2E

Se ejecutaron dos procesos Python separados usando el mismo `session_id`.

```text
PROCESS=B
SESSION_ID= intake-a58c3566fa71
BUSINESS_PROBLEM= quiebres de stock y Comercial se entera demasiado tarde
DESIRED_OUTCOME= anticiparlos para actuar antes
DATA_SOURCES= ['SAP']
RESPONSE_FALLBACK_USED= False

[PASS] FEATURE 54 DURABLE CROSS-PROCESS SESSION
DURABLE_RC=0
```

La prueba fue repetida y volvió a pasar con el mismo `session_id` durable.

Conclusión: la continuidad de conversación ya no depende de que ambos turnos lleguen a la misma instancia/proceso de Cloud Run.

## 7. Hardening de respuesta vacía

Se implementó un fallback determinístico que:

- nunca modifica scoring, lifecycle, clasificación ni gobierno;
- materializa el Business Case después del turno;
- devuelve un mensaje de negocio basado en `ready_to_register` y `definition_gaps` si el texto ADK final está vacío;
- expone `response_fallback_used` para trazabilidad.

También se corrigió el warning `Event from an unknown agent: atlas_business_fact_extractor` atribuyendo el `state_delta` persistido al Orchestrator registrado, manteniendo `atlas_business_fact_extractor` en la traza funcional.

## 8. Preview aislado de Cloud Run

Se decidió no tocar los servicios estables de Feature 53 antes del E2E final.

Servicios preview:

```text
atlas-datagob-api-f54-preview
atlas-datagob-web-f54-preview
```

Colección Firestore aislada:

```text
atlas_demands_f54_preview
```

### Web preview

```text
Service: atlas-datagob-web-f54-preview
Revision: atlas-datagob-web-f54-preview-00001-fxr
Traffic: 100%
WEB_DEPLOY_RC=0
```

URL de prueba:

```text
https://atlas-datagob-web-f54-preview-mkqutd4koq-uc.a.run.app/intake
```

```text
=== /intake HTTP ===
HTTP 200
```

## 9. E2E visual + registro Firestore — PASS

La UI `/intake` completó el flujo conversacional y registró el requerimiento real de preview:

```text
DEMAND_ID = DEM-20260818-65855457
```

La consulta directa a Firestore sobre `atlas_demands_f54_preview` confirmó:

```text
EXISTS = True
STATUS = operative_committee_review
```

### Lifecycle persistido

Eventos:

1. `demand_created`
   - `to_status = intake_validated`
   - `decision = operative_committee_review`
2. `demand_updated`
   - comentario: Caso de negocio confirmado por el usuario y registrado desde Gemini ADK Conversational Intake.
3. `status_changed`
   - `from_status = intake_validated`
   - `to_status = operative_committee_review`
   - `decision = business_case_confirmed_for_committee`
   - comentario: Caso de Negocio confirmado; demanda enviada al Comité Operativo para evaluación gobernada.

Estado final:

```text
status = operative_committee_review
current_stage = operative_committee_review
decision = business_case_confirmed_for_committee
```

### Comité Operativo

El documento persistió:

```text
committee_stage = operative_committee_review
required_review_roles = [Data Owner, Data Steward, Data Architect]
rejection_allowed = true
```

Resumen de comité:

```text
Tipo: machine_learning · Data Readiness: 100% (ready) · Arquitectura: GCP-ML-001@1.0 · Políticas: DATA-001@1.0, DATA-002@1.0, SEC-001@1.0, ML-001@1.0, FINOPS-001@1.0
```

### Canonical Business Case persistido

La persistencia correcta está bajo:

```text
business_inputs.canonical_business_case
```

y la confirmación explícita bajo:

```text
business_inputs.business_case_confirmed = true
validation_state.business_case_confirmed = true
validation_state.business_case_defined = true
validation_state.business_case_completeness = 100
```

Por ello, el output auxiliar:

```text
CONFIRMED = None
BUSINESS_CASE_PRESENT = False
```

no representa una falla funcional; ese script buscó `business_case_confirmation` / `confirmed` y `business_case` en el nivel raíz, mientras el contrato real los persiste dentro de `business_inputs` y `validation_state`.

### Gobierno y arquitectura preservados

Persistidos correctamente:

```text
classification.initiative_type = machine_learning
classification.subtype = forecasting
classification.secondary_types = [dashboard_analytics, data_engineering]
architecture.pattern_id = GCP-ML-001
architecture.pattern_version = 1.0
business_inputs.canonical_business_case.data_readiness.score = 100
business_inputs.canonical_business_case.data_readiness.status = ready
business_inputs.canonical_business_case.completeness = 100
business_inputs.canonical_business_case.ready_to_register = true
business_inputs.canonical_business_case.definition_gaps = []
```

Policy references preservadas:

```text
DATA-001@1.0
DATA-002@1.0
SEC-001@1.0
ML-001@1.0
FINOPS-001@1.0
```

Los controles pendientes permanecen como obligaciones gobernadas en `governance_requirements` / `policy_gaps` y no bloquearon indebidamente el registro.

### Trazabilidad agentic

El documento persistió la traza:

```text
ATLAS Intake Orchestrator
Data Readiness Agent
Architecture Validation Agent
Policy & Controls Agent
Deterministic Business Case Registration Adapter
```

Conclusión: **el E2E visual y funcional de Feature 54 queda PASS desde conversación hasta Firestore y Comité Operativo**.

## 10. PR #59

Estado tras completar el gate funcional:

```text
PR #59
Title: Feature 54 · Conversational Governed Intake with Gemini ADK
State: open
Draft: true
Mergeable: true
```

El PR permanece Draft únicamente hasta decisión explícita de cierre/merge.

## 11. Deuda técnica no bloqueante observada

1. `context_cache_config` no configurado para transferencias multiagente; oportunidad de optimización de tokens/costo.
2. `VertexAiSessionService` emite `FutureWarning` porque internamente todavía usa `vertexai.Client`; migrar cuando el SDK exponga el nuevo cliente en el servicio de sesiones.
3. Warning AFC: el SDK recomienda `AsyncChat.send_message` sobre invocación directa de automatic function calling.
4. `JSON_SCHEMA_FOR_FUNC_DECL` aparece como feature experimental del SDK.

No se consideran bloqueantes para completar Feature 54 mientras los contratos y E2E permanezcan verdes.

## 12. Punto exacto de reanudación

El gate funcional ya está cerrado. Próximos pasos, solo con aprobación explícita:

1. Sincronizar rama local con el último head remoto de Feature 54.
2. Verificar CI del head exacto que contiene esta evidencia.
3. Marcar PR #59 Ready for review.
4. Squash merge en un único commit lógico de Feature 54.
5. Registrar el SHA exacto resultante en `main`.
6. Solo después del merge evaluar despliegue controlado a `atlas-datagob-api` y `atlas-datagob-web` estables.
7. Mantener el preview hasta completar smoke de producción y luego retirarlo deliberadamente.

## 13. No hacer al retomar

- No mover, borrar ni reutilizar tags RC1/RC2.
- No incluir `docs/deployment/evidence/generated/20260809T174613Z/` en commits.
- No hacer merge sin aprobación explícita.
- No desplegar sobre `atlas-datagob-api` o `atlas-datagob-web` estables antes del cierre controlado del PR.
- No confundir `ready_to_register=true` con controles de producción ya implementados.
- No interpretar `CONFIRMED=None` / `BUSINESS_CASE_PRESENT=False` del script auxiliar como falla: el contrato persistido está anidado en `business_inputs` y `validation_state`.

---

**Checkpoint final de preview:** Feature 54 está funcional, arquitectónica y operacionalmente validado de punta a punta: Gemini ADK → especialistas → Canonical Business Case → confirmación explícita → Firestore preview → Comité Operativo. El merge y despliegue estable quedan pendientes de aprobación explícita.
