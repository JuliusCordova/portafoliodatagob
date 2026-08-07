# 01 · Product Spec

## Visión

Una plataforma agéntica de gobierno de demanda que permita a QROMA transformar solicitudes de datos en un portafolio priorizado, trazable y orientado a valor.

## Usuarios objetivo

- Data Owner / Sponsor de negocio.
- Equipo de Gobierno de Datos.
- Data Steward.
- Comité Operativo de Gobierno.
- Comité Estratégico de Gobierno.
- Arquitectura de Datos.
- Equipo de Ejecución.

## Journey principal

### 1. Solicitud

El usuario registra o carga una solicitud que puede provenir de correo. La plataforma captura necesidad, área solicitante, sponsor, dominio tentativo, urgencia y problema de negocio.

### 2. Triage

El sistema clasifica la solicitud por dominio, subdominio, tipo de demanda y completitud mínima.

### 3. Caso de uso

Se estructura un resumen ejecutivo con objetivo, beneficio esperado, datos requeridos, stakeholders, riesgos, dependencias y criterios de éxito.

### 4. Evaluación operativa

El Comité Operativo revisa datos, disponibilidad, viabilidad técnica, arquitectura, riesgos, cumplimiento y esfuerzo.

### 5. Priorización

La plataforma calcula un score ponderado con criterios comunes.

### 6. Decisión

El Comité Estratégico decide: ejecutar, backlog, reformular o descartar.

### 7. Seguimiento

Las iniciativas aprobadas pasan a ejecución con estado, responsable, hito, evidencia y valor esperado.

### 8. MVP a producción

Un MVP solo escala si supera criterios de valor, adopción, riesgo, operación, datos, seguridad y soporte.

## Estados de una demanda

- Recibido.
- En análisis.
- En triage.
- Caso de uso estructurado.
- Pendiente Comité Operativo.
- Priorizado.
- Pendiente Comité Estratégico.
- Aprobado.
- En backlog.
- En ejecución.
- En MVP.
- Evaluación producción.
- Producción.
- Reformular.
- Descartado.
- Cerrado.

## Decisiones posibles

- **Ejecutar**: aprobada y asignada a cartera.
- **Backlog**: válida, pero sin capacidad o prioridad suficiente.
- **Reformular**: requiere mayor definición, sponsor, datos o alcance.
- **Descartar**: no cumple criterios mínimos de valor, viabilidad o alineamiento.

## Criterios de éxito de la demo

- Registrar una demanda desde una solicitud textual.
- Clasificarla en dominio y subdominio QROMA.
- Generar caso de uso resumido con ayuda de agente.
- Calcular score de priorización.
- Simular decisión de comité.
- Visualizar backlog y tablero de portafolio.
- Evaluar un MVP para pase a producción.
