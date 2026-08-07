# 07 · Requerimientos funcionales

## RF-01 · Captura de demanda

Como usuario solicitante o equipo de gobierno, quiero registrar una demanda de proyecto de datos desde texto libre, formulario o contenido copiado de un correo, para convertir una solicitud dispersa en una iniciativa trazable.

### Criterios de aceptación

- Permite registrar título, descripción, área, solicitante, sponsor, urgencia y valor esperado.
- Permite guardar borrador.
- Permite enviar a triage.
- Genera un identificador único de demanda.
- Registra fecha, usuario y estado inicial.

## RF-02 · Intake Agent

Como equipo de gobierno, quiero que un agente estructure automáticamente una solicitud textual, para reducir trabajo manual y mejorar completitud.

### Criterios de aceptación

- Extrae problema, objetivo, área, sponsor tentativo, urgencia, datos mencionados y restricciones.
- Muestra los campos sugeridos como recomendación editable.
- Permite aceptar, corregir o rechazar sugerencias.
- Guarda trazabilidad de cambios humanos.

## RF-03 · Clasificación de dominio y subdominio

Como gobierno de datos, quiero que la demanda sea clasificada por dominio y subdominio, para asignar ownership y priorización adecuada.

### Criterios de aceptación

- Sugiere dominio y subdominio.
- Muestra nivel de confianza y justificación.
- Permite ajuste manual.
- Requiere dominio confirmado antes de pasar a priorización.

## RF-04 · Estructuración de caso de uso

Como sponsor de negocio, quiero contar con un caso de uso resumido, para que los comités evalúen la iniciativa con información consistente.

### Criterios de aceptación

- Genera objetivo, problema, beneficio esperado, métrica de éxito, datos requeridos, stakeholders, dependencias y riesgos.
- Permite editar narrativa ejecutiva.
- Marca campos incompletos.
- Permite enviar a evaluación operativa.

## RF-05 · Evaluación de gobierno

Como equipo de gobierno, quiero validar mínimos de gobierno antes de priorizar, para evitar iniciativas sin sponsor, datos o owner.

### Criterios de aceptación

- Verifica sponsor, dominio, subdominio, owner, steward, clasificación de datos y sensibilidad.
- Identifica brechas.
- Recomienda pasar, reformular o solicitar información.
- No bloquea sin mostrar causa explícita.

## RF-06 · Scoring y priorización

Como comité operativo, quiero aplicar un scoring ponderado, para comparar iniciativas con criterios comunes.

### Criterios de aceptación

- Califica criterios de 1 a 5.
- Aplica pesos configurables.
- Calcula score total.
- Asigna banda sugerida: alta, media, backlog, reformular o descartar.
- Guarda justificación por criterio.

## RF-07 · Paquete de comité

Como comité operativo o estratégico, quiero recibir un paquete ejecutivo de decisión, para evaluar la iniciativa con evidencia.

### Criterios de aceptación

- Incluye resumen, score, riesgos, dependencias, recomendación, valor esperado y decisión sugerida.
- Permite exportar o visualizar en pantalla.
- Mantiene trazabilidad de generación y versión.

## RF-08 · Decisión de comité

Como comité estratégico, quiero registrar una decisión formal, para que cada demanda tenga una salida clara y auditable.

### Criterios de aceptación

- Permite decisiones: ejecutar, backlog, reformular, descartar o condicionado.
- Registra justificación, responsable, fecha y próximo paso.
- Cambia el estado de la demanda según decisión.
- Genera evento de auditoría.

## RF-09 · Seguimiento de ejecución

Como equipo de gobierno, quiero monitorear las iniciativas aprobadas, para seguir avance, responsables y valor.

### Criterios de aceptación

- Permite registrar estado, hitos, responsable, evidencias y bloqueos.
- Muestra timeline de la iniciativa.
- Mantiene historial de cambios.

## RF-10 · MVP Gate a producción

Como comité o equipo responsable, quiero evaluar si un MVP puede pasar a producción, para evitar escalar soluciones sin valor, operación o riesgo controlado.

### Criterios de aceptación

- Evalúa dimensiones: valor, adopción, datos, seguridad, arquitectura, operación, costos y riesgos.
- Permite decisión: GO, GO condicionado, pivotar o detener.
- Registra condiciones obligatorias.
- No permite cerrar GO sin responsable de producción.

## RF-11 · Tablero ejecutivo

Como líder de gobierno, quiero visualizar el portafolio, para entender prioridades, estados, valor y decisiones pendientes.

### Criterios de aceptación

- Muestra score promedio, total de demandas, distribución por prioridad, decisiones pendientes y MVP gates.
- Permite filtrar por dominio, estado, sponsor y prioridad.
- Muestra top iniciativas priorizadas.

## RF-12 · Configuración reusable

Como administrador, quiero parametrizar dominios, pesos, estados y reglas, para reutilizar ATLAS DataGob en distintos contextos.

### Criterios de aceptación

- Permite definir dominios y subdominios.
- Permite configurar pesos de scoring.
- Permite definir miembros de comités.
- Permite configurar reglas de MVP Gate.
