# 08 · Requerimientos no funcionales

## RNF-01 · Usabilidad

El producto debe seguir principios de usabilidad de Nielsen y priorizar claridad ejecutiva.

### Criterios

- Estado visible en todo momento.
- Lenguaje alineado a negocio y gobierno de datos.
- Acciones principales claramente diferenciadas.
- Validaciones preventivas antes de errores.
- Recuperación simple ante errores.
- Consistencia visual y funcional entre pantallas.

## RNF-02 · Diseño Figma-first

Toda pantalla debe diseñarse en Figma antes de desarrollo.

### Criterios

- Cada flujo funcional debe tener pantalla o wireframe asociado.
- Cada pantalla debe mapearse a requerimientos funcionales.
- El diseño debe usar identidad ATLAS neutral.
- El fondo base debe ser blanco.
- No debe depender de logos de clientes o marcas corporativas externas.

## RNF-03 · Seguridad

La solución debe operar bajo mínimo privilegio y trazabilidad.

### Criterios

- Service accounts separadas por componente.
- Secretos fuera del código fuente.
- Acceso controlado por roles.
- Registro de decisiones y cambios.
- Auditoría de acciones críticas.

## RNF-04 · Trazabilidad

Cada recomendación, edición y decisión debe quedar registrada.

### Criterios

- Registrar actor, fecha, acción, estado previo y estado nuevo.
- Distinguir recomendación agéntica de decisión humana.
- Mantener histórico de cambios en scoring.
- Mantener histórico de decisiones de comité.

## RNF-05 · Reusabilidad

El core debe ser multi-contexto.

### Criterios

- No acoplar lógica a una organización específica.
- Dominios, subdominios, pesos, comités y reglas deben ser configurables.
- El branding debe ser sustituible.
- Los datos demo deben estar separados del core.

## RNF-06 · Escalabilidad inicial

El MVP debe soportar crecimiento progresivo sin sobredimensionarse.

### Criterios

- Cloud Run para escalar servicios bajo demanda.
- Firestore para estado operacional.
- BigQuery para analítica de portafolio.
- Pub/Sub para desacoplar eventos.

## RNF-07 · Observabilidad

El sistema debe permitir diagnóstico y monitoreo operacional.

### Criterios

- Logs estructurados por request_id y demand_id.
- Métricas básicas de agentes y API.
- Registro de errores de agente.
- Eventos de ciclo de vida trazables.

## RNF-08 · Calidad de agentes

Los agentes deben operar con control, explicación y límites.

### Criterios

- Toda respuesta agéntica debe incluir justificación.
- Toda recomendación debe ser editable por humano autorizado.
- No se permiten decisiones finales automáticas.
- Deben existir prompts versionados.
- Deben existir pruebas de comportamiento mínimo por agente.

## RNF-09 · Mantenibilidad

El desarrollo debe seguir estructura modular y spec-driven.

### Criterios

- Specs versionadas en repositorio.
- Separación frontend, backend, agentes e infraestructura.
- Contratos API definidos antes de implementación.
- Terraform organizado por módulos y ambientes.

## RNF-10 · Performance MVP

El MVP debe ser suficientemente fluido para demo ejecutiva.

### Criterios

- Carga inicial objetivo menor a 3 segundos en entorno demo estable.
- Operaciones de consulta de backlog menores a 2 segundos para dataset demo.
- Respuestas agénticas asincrónicas cuando puedan tardar más de 5 segundos.
- Feedback visual durante procesamiento.
