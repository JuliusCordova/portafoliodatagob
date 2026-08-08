# Sprint 09 · Scoring operativo y modelo financiero

## Objetivo

Activar una primera versión gobernada del scoring operativo y financiero para que ATLAS DataGob pueda priorizar iniciativas con criterios de negocio, riesgo, factibilidad y supuestos económicos explícitos.

## Principio de diseño

ATLAS no inventa VAN, TIR, ROI ni payback desde el texto del requerimiento. Las métricas financieras se calculan únicamente cuando el Comité Operativo, Comité Estratégico o Portfolio Owner registra supuestos económicos explícitos.

## Flujo

1. Negocio registra una solicitud.
2. Los agentes validan política, arquitectura y FinOps.
3. La solicitud entra al backlog.
4. Comité Operativo valida brechas y puede aprobarla para scoring.
5. Portfolio Owner o Comité registra supuestos económicos.
6. ATLAS calcula score, prioridad, VAN, TIR, ROI y payback.
7. El resultado queda persistido en el backlog con evento auditable.

## Endpoint nuevo

```text
POST /demands/{demand_id}/score
```

## Payload

```json
{
  "strategic_alignment": 5,
  "business_value": 5,
  "urgency": 4,
  "data_readiness": 4,
  "governance_risk": 2,
  "technical_feasibility": 4,
  "initial_investment_usd": 75000,
  "annual_benefit_usd": 50000,
  "annual_operating_cost_usd": 5000,
  "time_horizon_years": 3,
  "discount_rate": 0.12,
  "actor": "Portfolio Owner",
  "comment": "Supuestos económicos validados por comité."
}
```

## Métricas calculadas

- Score ponderado 1 a 5.
- Prioridad: Alta, Media o Baja.
- VAN / NPV.
- TIR / IRR estimada con bisección.
- ROI.
- Payback en meses.
- Cashflows usados para la evaluación.
- Señal financiera: positiva, neutral o negativa/pendiente.

## Persistencia

El backlog agrega dos bloques nuevos por demanda:

```json
{
  "scoring": {
    "score": 4.25,
    "priority": "Alta",
    "financial_signal": "positive",
    "model_version": "scoring-financial-v1"
  },
  "financials": {
    "van_usd": 33106.64,
    "tir": 0.3631,
    "roi": 0.8,
    "payback_months": 20.0
  }
}
```

Además se agrega un evento:

```text
scoring_updated
```

## UX pendiente de conexión

La ruta proxy Next.js `POST /api/demands/score` queda lista para conectar el formulario de supuestos económicos desde la vista Comité Operativo o Tablero Ejecutivo.

## Próximo incremento

Sprint 09.1 debe conectar la UI para capturar supuestos económicos desde una vista separada de scoring, evitando saturar el intake de negocio.
