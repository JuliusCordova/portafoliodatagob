# ATLAS DataGob · Executive demo readiness

## Objetivo

Preparar una demo ejecutiva breve, clara y orientada a valor para mostrar ATLAS DataGob como una plataforma de gobierno de demanda de datos lista para piloto controlado.

## Narrativa ejecutiva

**Mensaje central:** ATLAS DataGob convierte demanda dispersa de datos e IA en un portafolio gobernado, priorizado, trazable y defendible ante comité.

La demo debe mostrar tres cambios clave:

1. **De solicitud informal a intake estructurado**  
   El Data Owner registra una necesidad con contexto de negocio, valor esperado y supuestos económicos.

2. **De revisión manual a validación asistida por agentes**  
   El intake multiagente clasifica la demanda, detecta brechas de política, arquitectura y FinOps, y enruta al comité correcto.

3. **De backlog operativo a portafolio ejecutivo**  
   El comité completa criterios, recalcula score, prioriza por impacto/riesgo/valor y genera trazabilidad para toma de decisiones.

## Guion sugerido de 7 minutos

### 1. Apertura — 45 segundos

Mostrar el ribbon ejecutivo:

- Estado del piloto.
- Usuario/rol propagado.
- Mensaje: demanda gobernada, priorizada y trazable.

Frase sugerida:

> “ATLAS DataGob no es solo un formulario. Es una capa de gobierno para decidir qué demandas de datos e IA deben avanzar, cuáles requieren reformulación y cuáles no deberían consumir capacidad de delivery.”

### 2. Intake negocio — 90 segundos

Mostrar:

- Título, área, dominio, consumo esperado.
- Impacto operativo.
- Impacto estratégico.
- ROI, VAN, TIR y payback.

Mensaje clave:

> “El valor de negocio se captura desde el origen y no se inventa en comité.”

### 3. Comité operativo — 2 minutos

Mostrar:

- Grilla de demandas.
- Filtros por área, dominio, estado y prioridad.
- Panel lateral de edición.
- Validación de Data Owner y Comité.
- Recalcular score.

Mensaje clave:

> “El comité no trabaja sobre opiniones sueltas; trabaja sobre criterios, brechas, evidencia y trazabilidad.”

### 4. Tablero ejecutivo — 2 minutos

Mostrar:

- Score promedio.
- Alta prioridad.
- VAN total.
- Demandas scored.
- Top 5 iniciativas.
- Distribución de prioridades y brechas.

Mensaje clave:

> “El resultado no es solo aprobar o rechazar. Es construir un portafolio defendible.”

### 5. Cierre — 45 segundos

Mostrar:

- Sesión activa.
- Seed demo.
- Evidencia operativa generable.

Mensaje clave:

> “El producto ya tiene flujo funcional, roles, smoke autenticado y evidencia operativa para un piloto controlado.”

## Checklist antes de presentar

- [ ] Ejecutar `make controlled-pilot-execution` en modo seguro o con deploy explícito.
- [ ] Resetear demo desde la UI si se requiere una historia limpia.
- [ ] Verificar `/api/session`.
- [ ] Verificar `/api/demo/cases`.
- [ ] Abrir tres vistas: Intake, Comité, Tablero Ejecutivo.
- [ ] Tener una demanda con score calculado.
- [ ] Tener el paquete de evidencia del piloto generado.

## Señales de preparación

| Dimensión | Señal esperada |
|---|---|
| UI | Ribbon ejecutivo visible |
| Identidad | Usuario/roles visibles |
| Gobierno | Brechas de política, arquitectura y FinOps visibles |
| Priorización | Score y prioridad calculados |
| Evidencia | Smoke estándar y autenticado disponibles |
| Operación | Runbook de piloto controlado documentado |

## Qué no prometer todavía

- Login corporativo completo.
- Administración visual de usuarios.
- OIDC/JWT productivo.
- Observabilidad avanzada de negocio.
- SLA productivo.

Estas capacidades pertenecen a incrementos posteriores del roadmap.
