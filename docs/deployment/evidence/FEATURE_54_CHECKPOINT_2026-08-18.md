# Feature 54 — Checkpoint de evidencia

**Fecha:** 2026-08-18  
**Feature:** Conversational Governed Intake with Gemini ADK  
**Repositorio:** `JuliusCordova/portafoliodatagob`  
**Rama:** `feature/54-conversational-governed-intake-adk`  
**PR:** #59 — Draft  
**Baseline de Feature 54 antes de este checkpoint:** `4fd57a20b5e5f99d59bd86d8dbbdc48065c85059`  

> Este documento registra únicamente evidencia validada hasta el punto de pausa del 18 de agosto de 2026. No declara completado el E2E visual de registro ni autoriza merge/deploy a los servicios estables.

## 1. Estado ejecutivo

Feature 54 tiene validado el núcleo funcional y arquitectónico del Intake Conversacional Gobernado:

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
- El head validado tuvo CI 4/4 verde.
- El Web preview de Feature 54 fue desplegado de forma aislada y `/intake` respondió HTTP 200.

**Pendiente:** ejecutar el último E2E visual desde `/intake`: conversación → Business Case 100% → confirmación explícita → registro → persistencia en Firestore preview → ingreso al Comité Operativo.

## 2. Evidencia de pruebas unitarias y contratos

Último gate local informado antes del hardening durable:

```text
Ran 133 tests in 0.156s
OK
contract artifacts OK
policy architecture smoke OK
TEST_RC=0
```

Posteriormente, con los cambios de sesiones durables y fallback, la suite CI creció a aproximadamente 141 tests. El head `4fd57a2` quedó validado en GitHub Actions con:

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

Aunque el Business Case quedó listo para registro, los controles de gobierno permanecieron visibles:

```text
GOVERNANCE_REQUIREMENTS = [
  'Proposed architecture does not yet evidence all mandatory lifecycle components.',
  'audit_logging',
  'budget',
  'business_owner',
  'certified_consumption',
  'cost_monitoring',
  'cost_owner',
  'data_classification',
  'data_owner',
  'data_steward',
  'drift_monitoring',
  'evaluation_metrics',
  'governed_silver_gold',
  'labels',
  'least_privilege',
  'lineage',
  'managed_identity',
  'model_registry',
  'quality_controls',
  'secret_manager',
  'training_data_version'
]
```

Decisión validada:

- `definition_gaps` bloquea la definición/registro.
- `governance_requirements` no bloquea el registro cuando el Business Case está suficientemente definido.
- Los requisitos de gobierno continúan hacia Comité, diseño, delivery y producción.

## 5. Catálogos de gobierno reales en GCS

La fuente real de gobierno fue validada previamente con fail-closed habilitado.

Configuración:

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

Variables de runtime previstas para modo durable:

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

Proceso A:

```text
[PASS] PROCESS A
```

Proceso B recuperó el estado persistido del proceso A y agregó nueva evidencia:

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

La misma prueba se repitió y volvió a pasar con el mismo `session_id` durable.

Conclusión: la continuidad de conversación ya no depende de que ambos turnos lleguen a la misma instancia/proceso de Cloud Run.

## 7. Hardening de respuesta vacía

Durante el E2E v5 se observó un turno donde el estado gobernado avanzó correctamente pero Gemini no devolvió texto final visible.

Se implementó un fallback determinístico que:

- nunca modifica scoring, lifecycle, clasificación ni gobierno;
- materializa el Business Case después del turno;
- devuelve un mensaje de negocio basado en `ready_to_register` y `definition_gaps` si el texto ADK final está vacío;
- expone `response_fallback_used` para trazabilidad.

También se corrigió el warning `Event from an unknown agent: atlas_business_fact_extractor` atribuyendo el `state_delta` persistido al Orchestrator registrado, manteniendo `atlas_business_fact_extractor` en la traza funcional.

## 8. Preview aislado de Cloud Run

Se decidió no tocar los servicios estables de Feature 53 antes del E2E final.

Servicios preview definidos:

```text
atlas-datagob-api-f54-preview
atlas-datagob-web-f54-preview
```

Para evitar contaminar el backlog estable, el diseño de preview usa una colección Firestore aislada:

```text
atlas_demands_f54_preview
```

### Web preview — desplegado

Resultado informado:

```text
Service: atlas-datagob-web-f54-preview
Revision: atlas-datagob-web-f54-preview-00001-fxr
Traffic: 100%
WEB_DEPLOY_RC=0
```

URL de prueba utilizada:

```text
https://atlas-datagob-web-f54-preview-mkqutd4koq-uc.a.run.app/intake
```

Health visual del endpoint:

```text
=== /intake HTTP ===
HTTP 200
```

**Importante:** HTTP 200 sobre `/intake` valida que el Web preview está desplegado y sirve la pantalla. No constituye todavía evidencia del flujo completo Web → API → sesión → registro → Firestore → Comité.

## 9. PR #59

Estado al checkpoint:

```text
PR #59
Title: Feature 54 · Conversational Governed Intake with Gemini ADK
State: open
Draft: true
Mergeable: true
```

La descripción del PR ya fue actualizada con:

- extractor semántico obligatorio;
- especialistas ADK;
- readiness gobernado;
- catálogos GCS;
- E2E v5;
- sesiones durables cross-process;
- fallback anti-respuesta-vacía;
- CI 4/4 verde;
- deuda técnica no bloqueante.

El PR debe permanecer **Draft** hasta terminar el E2E visual/registro.

## 10. Deuda técnica no bloqueante observada

Warnings conocidos del SDK, sin impacto funcional demostrado en los gates actuales:

1. `context_cache_config` no configurado para transferencias multiagente; oportunidad de optimización de tokens/costo.
2. `VertexAiSessionService` emite `FutureWarning` porque internamente todavía usa `vertexai.Client`; migrar cuando el SDK exponga el nuevo cliente en el servicio de sesiones.
3. Warning AFC: el SDK recomienda `AsyncChat.send_message` sobre invocación directa de automatic function calling.
4. `JSON_SCHEMA_FOR_FUNC_DECL` aparece como feature experimental del SDK.

No se consideran bloqueantes para completar Feature 54 mientras los contratos y E2E permanezcan verdes.

## 11. Punto exacto de reanudación

Al retomar el trabajo:

1. Confirmar que la rama local está sincronizada con el head remoto de Feature 54.
2. Verificar CI del head exacto.
3. Abrir el Web preview `/intake`.
4. Ejecutar el caso de quiebres de stock ya usado en E2E v5.
5. Verificar visualmente:
   - Machine Learning / Forecasting.
   - Data Engineering + Dashboard/Analytics como capacidades secundarias.
   - Data Readiness 100 / ready.
   - GCP-ML-001.
   - Políticas DATA-001, DATA-002, SEC-001, ML-001 y FINOPS-001.
   - `definition_gaps=[]`.
   - completitud 100%.
   - listo para registrar.
6. Pulsar **Confirmar y registrar requerimiento** y aceptar la confirmación explícita.
7. Capturar el `DEM-...` generado.
8. Verificar el documento en `atlas_demands_f54_preview`:
   - Canonical Business Case persistido.
   - confirmación explícita persistida.
   - GCP-ML-001 preservado.
   - policy references preservadas.
   - lifecycle gobernado iniciado.
   - ingreso a Comité Operativo cuando corresponda.
9. Si todo pasa, actualizar evidencia y PR #59.
10. Marcar PR #59 Ready for review.
11. Squash merge en un único commit lógico de Feature 54.
12. Solo después del merge evaluar despliegue a los servicios estables.

## 12. No hacer al retomar

- No mover, borrar ni reutilizar tags RC1/RC2.
- No incluir `docs/deployment/evidence/generated/20260809T174613Z/` en commits.
- No hacer merge antes del E2E visual/registro.
- No desplegar sobre `atlas-datagob-api` o `atlas-datagob-web` estables antes del cierre del preview.
- No confundir `ready_to_register=true` con controles de producción ya implementados.

---

**Checkpoint:** Feature 54 está funcional y arquitectónicamente validado hasta sesiones durables + Web preview HTTP 200. El último gate pendiente es el E2E visual con confirmación y persistencia real del requerimiento en la colección Firestore de preview.
