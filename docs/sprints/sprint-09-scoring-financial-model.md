# Sprint 09 · Scoring operativo y modelo financiero

## Objetivo

Activar una primera versión gobernada del scoring operativo y financiero para que ATLAS DataGob pueda priorizar iniciativas con criterios de negocio, riesgo, factibilidad y supuestos económicos explícitos.

## Principio de gobierno

ATLAS no inventa VAN, TIR, ROI, payback ni criterios de prioridad desde el texto libre del requerimiento. El score se calcula únicamente cuando existen datos capturados en checklist y validados por los roles correspondientes.

## Flujo funcional

```text
Usuario de negocio / Data Owner
→ llena intake de solicitud
→ completa checklist de valor de negocio y supuestos económicos
→ envía al Comité Operativo

Comité Operativo
→ consulta la grilla CRUD de demanda
→ filtra por área, dominio, estado y prioridad
→ valida lo llenado por el Data Owner
→ completa datos, viabilidad, esfuerzo, riesgo y reutilización
→ calcula score gobernado
→ deja evento auditable

Comité Estratégico
→ consulta tablero ejecutivo
→ revisa score, prioridad, VAN, brechas y Top 5
```

## Checklist Data Owner

- Justificación de impacto operativo.
- Impacto operativo 1 a 5.
- Justificación de impacto estratégico.
- Impacto estratégico 1 a 5.
- ROI esperado.
- VAN esperado.
- TIR esperada.
- Payback esperado.
- Justificación de alineamiento estratégico.
- Alineamiento estratégico 1 a 5.

## Checklist Comité Operativo

- Disponibilidad, trazabilidad y calidad de datos.
- Viabilidad técnica.
- Esfuerzo de ejecución.
- Riesgo y controles.
- Reutilización potencial.

## Grilla CRUD

La vista de Comité Operativo actúa como una grilla CRUD gobernada:

- Crear: desde Intake negocio.
- Leer: listar y filtrar demanda por área, dominio, estado y prioridad.
- Actualizar: cambiar estado, solicitar reformulación, aprobar o calcular score.
- Eliminar lógico: rechazar/cerrar con evento auditable, sin borrar evidencia.

## Entregables técnicos

- `financial_scoring.py` con score financiero por métricas directas o supuestos detallados.
- `POST /demands/{demand_id}/score`.
- `POST /api/demands/score` como proxy Next.js.
- Persistencia de `scoring`, `financials`, `business_inputs` y `committee_inputs`.
- Evento auditable `scoring_updated`.
- UI con Intake + Comité Operativo + Tablero Ejecutivo.

## Próximo incremento

Sprint 09.1 puede convertir el checklist en una conversación paso a paso real con agente, validación de campos obligatorios y edición persistente individual antes del cálculo final.
