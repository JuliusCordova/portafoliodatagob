# 02 · Agent Map

## Enfoque

Los agentes no reemplazan la decisión de gobierno. Actúan como copilotos para estructurar información, recomendar clasificación, explicar scoring y preparar evidencia para comités.

## Agentes propuestos

### 1. Intake Agent

**Objetivo:** convertir correos o textos libres en solicitudes estructuradas.

**Entrada:** correo, texto, archivo adjunto o formulario.

**Salida:** demanda registrada con problema, solicitante, sponsor tentativo, urgencia, área y resumen.

### 2. Domain Classifier Agent

**Objetivo:** clasificar la demanda en dominio y subdominio QROMA.

**Dominios iniciales:**

- Clientes y Partes Comerciales.
- Comercial Order-to-Cash.
- Productos y Catálogo Comercial.
- Logística, Despacho y Entrega.
- Finanzas y Crédito Comercial.
- Gobierno y Calidad de Datos.

**Salida:** dominio sugerido, subdominio, owner sugerido y confianza.

### 3. Business Case Agent

**Objetivo:** estructurar el caso de uso de negocio.

**Salida:** objetivo, beneficio esperado, métrica de éxito, datos necesarios, riesgo, dependencia y narrativa ejecutiva.

### 4. Scoring Agent

**Objetivo:** sugerir puntajes de priorización con justificación.

**Criterios base:**

- Valor para el negocio.
- Alineamiento estratégico.
- Disponibilidad / calidad de datos.
- Viabilidad técnica.
- Esfuerzo / time to market.
- Riesgo / cumplimiento.
- Reusabilidad / escalabilidad.

**Regla:** el usuario o comité puede ajustar el puntaje sugerido. Todo ajuste debe quedar trazado.

### 5. Governance Reviewer Agent

**Objetivo:** revisar si la iniciativa cumple mínimos de gobierno de datos.

**Valida:** dominio, subdominio, Data Owner, Data Steward, clasificación de datos, sensibilidad, acceso, trazabilidad, catálogo, privacidad y riesgos.

### 6. Committee Pack Agent

**Objetivo:** preparar paquete para comité.

**Salida:** resumen ejecutivo, score, recomendación, riesgos, dependencias, decisión sugerida y puntos para discusión.

### 7. MVP Gate Agent

**Objetivo:** evaluar si un MVP puede pasar a producción.

**Valida:** valor demostrado, adopción, calidad de datos, arquitectura, seguridad, operación, soporte, monitoreo, costos y riesgos.

### 8. Portfolio Insights Agent

**Objetivo:** generar insights del portafolio.

**Salida:** distribución por prioridad, áreas solicitantes, dominios con mayor demanda, cuellos de botella, iniciativas sin sponsor, demandas detenidas y valor potencial.

## Principio de control humano

Toda recomendación agéntica debe quedar marcada como recomendación, no como decisión final. Las decisiones finales corresponden al Comité Operativo y Comité Estratégico según el caso.
