# 11 · Criterios de aceptación del MVP

## CA-01 · Spec-first

El MVP no puede iniciar desarrollo funcional si no existen specs versionadas para producto, arquitectura, requerimientos, diseño Figma y criterios de aceptación.

### Validación

- Existen documentos en `docs/specs`.
- Las decisiones aprobadas están registradas.
- El prototipo Figma está referenciado.

## CA-02 · Identidad neutral ATLAS

El producto debe usar identidad ATLAS neutral, sin dependencia de marcas externas.

### Validación

- El prototipo usa logo ATLAS.
- El fondo principal es blanco.
- No hay logos de clientes o empresas externas en el core.

## CA-03 · Flujo end-to-end

El MVP debe permitir demostrar un flujo completo de demanda.

### Validación

- Crear demanda.
- Ejecutar intake asistido.
- Clasificar dominio/subdominio.
- Estructurar caso de uso.
- Calcular scoring.
- Registrar recomendación operativa.
- Registrar decisión estratégica.
- Enviar a ejecución, backlog, reformulación o descarte.
- Evaluar MVP Gate.

## CA-04 · Agentes Gemini ADK

Los agentes deben desarrollarse con Gemini ADK.

### Validación

- Existe orquestador de agentes.
- Cada agente tiene prompt/versionado.
- Cada agente devuelve recomendación y justificación.
- Ningún agente toma decisión final.

## CA-05 · Control humano

Toda recomendación agéntica debe poder ser revisada por un humano.

### Validación

- El usuario puede aceptar, editar o rechazar sugerencias.
- La edición humana queda registrada.
- La decisión final queda asociada a usuario o comité.

## CA-06 · Scoring trazable

El scoring debe ser explicable y auditable.

### Validación

- Cada criterio tiene puntaje 1 a 5.
- Cada puntaje tiene justificación.
- El score total se calcula por pesos configurables.
- Se guarda histórico de cambios.

## CA-07 · MVP Gate

El pase a producción debe evaluarse con matriz formal.

### Validación

- Evalúa valor, adopción, datos, seguridad, arquitectura, operación, costos y riesgos.
- Permite GO, GO condicionado, pivotar o detener.
- Condiciones y responsables quedan registrados.

## CA-08 · Tablero ejecutivo

Debe existir tablero del portafolio.

### Validación

- Muestra total de demandas.
- Muestra distribución por prioridad.
- Muestra decisiones pendientes.
- Muestra top iniciativas.
- Muestra estado de MVP gates.

## CA-09 · Auditoría

Cada cambio relevante debe quedar trazado.

### Validación

- Registra actor, fecha, acción y objeto afectado.
- Diferencia recomendación agéntica de decisión humana.
- Permite consultar timeline de iniciativa.

## CA-10 · Infraestructura reproducible

La infraestructura debe poder recrearse con Terraform.

### Validación

- Existen módulos o scaffold Terraform.
- No hay secretos en repositorio.
- Los servicios GCP mínimos están definidos.
- Existe separación por ambientes al menos conceptual.
