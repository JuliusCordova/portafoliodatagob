# 03 · Domain Model

## Entidad principal: DemandRequest

Representa una solicitud de proyecto de datos desde su captura hasta su decisión o cierre.

### Campos mínimos

- id
- title
- description
- requesting_area
- requester_name
- sponsor_name
- domain
- subdomain
- demand_type
- urgency
- expected_value
- status
- priority
- score_total
- decision
- decision_date
- committee_owner
- created_at
- updated_at

## Entidad: BusinessCase

- demand_id
- business_problem
- objective
- expected_benefit
- north_star_metric
- success_criteria
- data_sources
- affected_processes
- risks
- dependencies
- assumptions
- estimated_effort
- estimated_ttm

## Entidad: ScoringAssessment

- demand_id
- value_business_score
- strategic_alignment_score
- data_availability_quality_score
- technical_feasibility_score
- effort_ttm_score
- risk_compliance_score
- reusability_scalability_score
- financial_score
- score_total
- scoring_rationale
- assessed_by
- assessed_at

## Entidad: CommitteeDecision

- demand_id
- committee_type
- decision
- decision_summary
- decision_rationale
- conditions
- next_step
- responsible
- decision_date
- minutes_uri

## Entidad: MvpProductionGate

- demand_id
- mvp_name
- business_value_validated
- adoption_validated
- data_quality_validated
- security_validated
- architecture_validated
- operational_readiness_validated
- support_model_defined
- monitoring_defined
- cost_model_validated
- risk_accepted
- gate_score
- gate_decision
- conditions

## Dominios iniciales de referencia

### Clientes y Partes Comerciales

Subdominios:

- Maestro de Clientes.
- Contactabilidad del Cliente.
- Ubicación Geográfica y Direcciones.
- Perfil Comercial del Cliente.
- Relacionamiento Comercial del Cliente.

### Comercial Order-to-Cash

Subdominios:

- Cotizaciones y Ofertas Comerciales.
- Pedidos de Venta.
- Despacho y Entrega.
- Crédito Comercial y Límites de Cliente.
- Accesos y Control Comercial.

### Productos y Catálogo Comercial

Subdominios:

- Maestro de Productos.
- Familias de Productos.
- Lista de Precios.
- Promociones y Descuentos.
- Equivalencias y Presentaciones.

### Logística, Despacho y Entrega

Subdominios:

- Rutas de Entrega.
- Programación de Despacho.
- Cobertura Geográfica.
- Tracking de Entrega.

### Finanzas y Crédito Comercial

Subdominios:

- Cuentas por Cobrar.
- Crédito Comercial.
- Límites de Cliente.
- Condiciones de Pago.

### Gobierno y Calidad de Datos

Subdominios:

- Catálogo.
- Linaje.
- Calidad.
- Políticas de Acceso.
- Clasificación de Datos.
