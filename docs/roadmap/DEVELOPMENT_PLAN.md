# ATLAS DataGob · Plan Vivo de Desarrollo

## Propósito

Este documento define el plan de desarrollo vivo del producto **ATLAS DataGob**. Debe actualizarse junto con el avance del software, las decisiones de arquitectura, el prototipo Figma, los agentes Gemini ADK, la infraestructura como código y los entregables funcionales.

El plan sigue un enfoque **spec-first**: primero se versionan decisiones, arquitectura, requerimientos, UX y criterios de aceptación; luego se desarrolla software.

## Reglas de trabajo

1. Todo desarrollo debe partir de la última versión de `main`.
2. Toda funcionalidad debe estar respaldada por una spec vigente.
3. Todo cambio relevante debe ingresar por Pull Request.
4. Toda desviación técnica debe registrarse como ADR o actualización de spec.
5. El prototipo Figma debe mantenerse alineado con el frontend implementado.
6. El diccionario de datos y el diagrama entidad-relación forman parte de la arquitectura canónica.
7. Los agentes recomiendan, estructuran y explican; las decisiones finales son humanas.
8. El producto debe mantenerse neutral y reusable, sin acoplarse a una organización específica.

## Estado actual

| Sprint | Estado | Resultado |
|---|---|---|
| Sprint 00 | Completado | Fundación spec-first y repositorio base. |
| Sprint 01 | En PR | Specs de producto, arquitectura, UX Figma-first, clasificación, RAG liviano y arquitectura canónica. |
| Sprint 02 | Próximo | Scaffold técnico frontend/backend/agentes. |

## Roadmap de desarrollo

### Sprint 00 · Spec foundation

**Objetivo:** inicializar el repositorio como producto reusable del portafolio ATLAS DataGob.

**Estado:** completado.

**Entregables:**

- README base.
- Specs iniciales.
- Separación frente a DataOps.
- Principios de producto.
- Arquitectura GCP inicial.

### Sprint 01 · Specs, arquitectura y UX Figma-first

**Objetivo:** congelar decisiones antes de desarrollar.

**Estado:** en Pull Request.

**Entregables:**

- Decisiones de producto e identidad ATLAS.
- Requerimientos funcionales.
- Requerimientos no funcionales.
- Arquitectura MVP Gemini ADK + GCP.
- Flujo de demanda en Mermaid.
- Estado de ciclo de vida.
- Prototipo Figma-first.
- Clasificación de iniciativas: ingeniería de datos, gobierno, machine learning y agentes.
- RAG liviano contra proyectos existentes y dominios de datos.
- Arquitectura canónica: diccionario de datos + diagrama ER.
- Criterios de aceptación MVP.

**Criterio de salida:** no iniciar construcción hasta que el PR sea aprobado y mergeado a `main`.

### Sprint 02 · Scaffold técnico del producto

**Objetivo:** crear la estructura base del software.

**Alcance:**

- Estructura monorepo.
- Frontend base.
- Backend API base.
- Carpeta de agentes Gemini ADK.
- Configuración local de desarrollo.
- CI inicial.
- Contratos OpenAPI iniciales.
- Convenciones de commits, ramas y PR.

**Entregables esperados:**

```text
apps/
  web/
  api/
  agents/
packages/
  shared/
  contracts/
infra/
  terraform/
docs/
  specs/
  roadmap/
  adr/
```

**Criterios de aceptación:**

- El proyecto puede instalar dependencias.
- El frontend levanta una pantalla base.
- El backend expone health check.
- La carpeta de agentes contiene estructura Gemini ADK inicial.
- CI valida lint/test básico.
- No hay secretos versionados.

### Sprint 03 · Modelo canónico y datos sintéticos

**Objetivo:** implementar el modelo lógico-operacional inicial y datos sintéticos.

**Alcance:**

- Diccionario de datos versionado.
- Diagrama ER en Mermaid.
- Entidades principales: DemandRequest, BusinessCase, ScoringAssessment, CommitteeDecision, MvpProductionGate, DomainCatalog, ProjectReference.
- Seed de dominios de datos.
- Seed de proyectos existentes.
- Seed de criterios de scoring.

**Criterios de aceptación:**

- El modelo tiene trazabilidad con la spec.
- Los datos sintéticos permiten probar el ciclo end-to-end.
- El frontend puede consumir datos demo.
- El intake puede clasificar contra dominios demo.

### Sprint 04 · Intake Chatbot con Gemini ADK

**Objetivo:** construir el primer agente conversacional de intake.

**Alcance:**

- Intake Chatbot.
- Clasificación de tipo de iniciativa.
- Preguntas guiadas por categoría.
- Extracción de campos estructurados.
- Generación de resumen ejecutivo.
- JSON de salida normalizado.

**Categorías:**

- Ingeniería de datos.
- Gobierno de datos.
- Machine Learning.
- Agentes IA.
- Híbrida.

**Criterios de aceptación:**

- El chatbot transforma una idea ambigua en una demanda estructurada.
- El usuario puede corregir o confirmar la clasificación.
- El agente no crea la demanda final sin confirmación humana.
- Toda recomendación guarda justificación.

### Sprint 05 · Gestión de demanda end-to-end

**Objetivo:** implementar el ciclo básico desde registro hasta priorización inicial.

**Alcance:**

- Registro de demanda.
- Edición de demanda.
- Estados del ciclo de vida.
- Vista de detalle.
- Timeline de cambios.
- Persistencia operacional.

**Criterios de aceptación:**

- Se puede crear, consultar, editar y cambiar estado de una demanda.
- Los cambios relevantes quedan auditados.
- La UI refleja claramente el estado actual y próximos pasos.

### Sprint 06 · Validación RAG de bajo costo

**Objetivo:** validar nuevas solicitudes contra proyectos existentes, dominios y decisiones previas.

**Alcance:**

- Repositorio de conocimiento en Cloud Storage.
- Índices vectoriales livianos en JSONL o Parquet.
- Embeddings precomputados.
- Búsqueda de similitud semántica.
- Sección UX: casos similares encontrados.

**Criterios de aceptación:**

- El intake muestra proyectos similares.
- El usuario puede marcar si el caso es duplicado, relacionado o nuevo.
- La recomendación explica la similitud.
- La decisión humana prevalece.

### Sprint 07 · Scoring y priorización

**Objetivo:** calcular y explicar score de priorización.

**Alcance:**

- Criterios ponderados.
- Score por dimensión.
- Justificación del agente.
- Ajuste humano trazable.
- Vista de scoring en frontend.

**Criterios de aceptación:**

- El sistema calcula score total.
- El usuario puede modificar puntajes con justificación.
- La decisión queda auditada.
- El score alimenta backlog y tablero.

### Sprint 08 · Comité Operativo y Comité Estratégico

**Objetivo:** implementar el flujo de recomendación y decisión.

**Alcance:**

- Paquete de comité generado por agente.
- Registro de recomendación operativa.
- Registro de decisión estratégica.
- Decisiones: ejecutar, backlog, reformular, descartar, condicionado.
- Minuta o resumen de decisión.

**Criterios de aceptación:**

- Toda decisión tiene responsable, fecha, justificación y siguiente paso.
- El agente puede preparar el paquete, pero no decidir.
- El histórico queda disponible en timeline.

### Sprint 09 · MVP Gate a producción

**Objetivo:** evaluar iniciativas MVP para decidir pase a producción.

**Alcance:**

- Checklist de valor, adopción, datos, seguridad, arquitectura, operación, costos y riesgo.
- Decisión GO, GO condicionado, pivotar o detener.
- Condiciones de remediación.

**Criterios de aceptación:**

- Se puede evaluar una iniciativa en estado MVP.
- La decisión queda justificada.
- Las condiciones quedan registradas y asignadas.

### Sprint 10 · Tablero ejecutivo y Portfolio Insights

**Objetivo:** entregar visibilidad ejecutiva del portafolio.

**Alcance:**

- Dashboard de demandas.
- Distribución por estado, prioridad, dominio y tipo de iniciativa.
- Valor esperado.
- Cuellos de botella.
- Demandas sin sponsor.
- Insights generados por agente.

**Criterios de aceptación:**

- El usuario visualiza el portafolio en una pantalla ejecutiva.
- Los insights son explicables y trazables.
- Los filtros funcionan por estado, dominio, categoría y prioridad.

### Sprint 11 · Infraestructura como código y despliegue dev

**Objetivo:** desplegar el MVP en GCP de forma reproducible.

**Alcance:**

- Terraform para servicios base.
- Cloud Run frontend/backend/agentes.
- Firestore.
- Cloud Storage.
- BigQuery.
- Secret Manager.
- Logging/Monitoring.
- GitHub Actions.

**Criterios de aceptación:**

- El ambiente dev se puede desplegar desde IaC.
- No hay pasos manuales críticos no documentados.
- Los secretos no están versionados.
- Se puede hacer rollback básico.

### Sprint 12 · Hardening, QA y demo ejecutiva

**Objetivo:** estabilizar el MVP para demostración.

**Alcance:**

- Pruebas funcionales end-to-end.
- Pruebas de agentes.
- Pruebas de UX contra checklist Nielsen.
- Observabilidad.
- Manejo de errores.
- Demo script.
- Documentación de uso.

**Criterios de aceptación:**

- Demo ejecutiva reproducible.
- Flujo demand-to-decision completo.
- Errores principales controlados.
- Documentación suficiente para continuar desarrollo.

## Backlog evolutivo

Futuras capacidades fuera del primer MVP:

- Integración real con Gmail o Google Workspace.
- Integración con Jira.
- Integración con Dataplex o catálogo empresarial.
- BigQuery Vector Search o Vertex AI Vector Search.
- Multi-tenant real.
- Gestión avanzada de roles.
- Exportación automática de actas.
- Métricas de valor realizado.
- Asistente ejecutivo conversacional sobre el portafolio.

## Cadencia de actualización del plan

Este documento debe actualizarse:

- Al crear o cerrar un sprint.
- Al aprobar un Pull Request relevante.
- Al cambiar arquitectura, UX o modelo de datos.
- Al agregar o retirar alcance.
- Al descubrir restricciones técnicas.
- Al terminar una demo funcional.

## Workflow operativo

```bash
git checkout main
git pull origin main
git checkout -b sprint/<numero>-<objetivo>
```

Antes de iniciar cada sprint:

```bash
git status
git branch
git pull origin main
```

Antes de crear PR:

```bash
git status
git diff
git log --oneline -5
```

## Principio rector

ATLAS DataGob debe avanzar como producto, no como colección de scripts. Cada sprint debe dejar una mejora demostrable, versionada, trazable y alineada con las specs.
