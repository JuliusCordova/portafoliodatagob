# ATLAS DataGob · Production Hardening Backlog

## Objetivo

Este backlog consolida los pendientes necesarios para evolucionar ATLAS DataGob desde un piloto controlado hacia una operación productiva gestionada. No reemplaza el release candidate gate; lo complementa con una visión de endurecimiento por dominios.

## Principios de priorización

1. **Seguridad antes de escala.** Ninguna exposición productiva debe operar con autenticación simulada o controles débiles.
2. **Operación antes de adopción masiva.** El producto debe poder ser monitoreado, diagnosticado y recuperado antes de crecer usuarios.
3. **Evidencia antes de aprobación.** Cada capacidad productiva debe dejar artefactos verificables: smoke, readiness, logs, rollback, owners y decisión.
4. **Costo gobernado desde el inicio.** Todo ambiente productivo debe tener owner, presupuesto, alertas y revisión FinOps.
5. **Gobierno proporcional al riesgo.** Mayor criticidad, sensibilidad, autonomía o impacto requiere más controles.

## Backlog priorizado

| Prioridad | Épica | Resultado esperado | Criterio de aceptación | Estado |
|---|---|---|---|---|
| P0 | Identidad empresarial | Integración con IdP/IAP/OIDC real | Usuario y roles no dependen de headers manuales de demo | Pendiente |
| P0 | Autorización reforzada | Matriz de permisos validada por rol | Pruebas positivas y negativas por rol crítico | Parcial |
| P0 | Secret management | Secrets fuera de variables planas sensibles | Variables críticas pasan por Secret Manager o mecanismo equivalente | Pendiente |
| P0 | Firestore productivo | Persistencia gestionada con colección y proyecto productivo | Smoke confirma lectura/escritura controlada y rollback | Parcial |
| P0 | Rollback operacional | Procedimiento probado para API/Web | Evidencia de revisión anterior y comandos de rollback | Parcial |
| P0 | Observabilidad mínima | Logs, errores, latencia y disponibilidad visibles | Tablero o consultas operativas documentadas | Parcial |
| P1 | Alertas | Alertas para caídas, errores y costos | Alertas probadas con severidad y owner | Pendiente |
| P1 | Auditoría | Trazabilidad de acciones críticas | Eventos de demanda, scoring, estado y reset quedan auditados | Parcial |
| P1 | FinOps | Presupuesto, labels, alertas y revisión mensual | Owner de costo definido y umbrales documentados | Pendiente |
| P1 | Gestión de incidentes | Runbook y matriz de severidad | Incidente simulado con tiempos y responsables | Parcial |
| P1 | Datos sensibles | Política de datos y pruebas de no exposición | No hay datos sensibles en seeds, logs ni demos | Parcial |
| P1 | DR/continuidad | Estrategia de recuperación de datos | RPO/RTO propuestos y prueba de recuperación | Pendiente |
| P2 | Métricas de adopción | Uso por rol, flujo y etapa | Dashboard de adopción y valor | Pendiente |
| P2 | Hardening UI | Estados de error y mensajes operativos | UX controlada ante API caída, auth fallida o datos vacíos | Parcial |
| P2 | Empaquetado comercial | Oferta de servicio gestionado | Catálogo de servicio, alcance y exclusiones | Pendiente |
| P2 | Multi-tenant readiness | Separación por cliente/dominio | Estrategia documentada antes de múltiples clientes | Pendiente |

## P0 · Seguridad y control

### Identidad empresarial

**Problema:** el piloto soporta modo `header` y propagación de identidad, pero para producción se requiere integración confiable con un proveedor de identidad o capa de acceso empresarial.

**Resultado esperado:**

- Usuarios autenticados por IdP/IAP/OIDC.
- Roles resueltos desde grupos, claims o asignaciones controladas.
- Headers no manipulables por clientes finales.
- Evidencia de pruebas por rol.

### Secret management

**Problema:** las variables de entorno del piloto son suficientes para demo y Cloud Run controlado, pero producción requiere gestión formal de secretos y separación de configuración sensible.

**Resultado esperado:**

- Secret Manager o mecanismo equivalente.
- Rotación definida.
- Acceso mínimo por service account.
- No exposición de secretos en logs, docs o scripts.

## P0 · Persistencia y rollback

### Firestore productivo

**Resultado esperado:**

- Proyecto y colección productiva definidos.
- Reglas de IAM revisadas.
- Smoke con operación controlada.
- Estrategia de backup/export.
- Separación clara entre seed demo y backlog real.

### Rollback operacional

**Resultado esperado:**

- Revisión Cloud Run anterior identificada.
- Procedimiento de rollback documentado.
- Evidencia de prueba no destructiva.
- Dueño de aprobación de rollback.

## P1 · Observabilidad y soporte

### Observabilidad

ATLAS ya cuenta con `/health` y `/ops/readiness`. Para producción, estos deben complementarse con:

- Latencia API.
- Errores 4xx/5xx.
- Disponibilidad Web.
- Errores de proxy Web/API.
- Errores de persistencia.
- Eventos críticos por rol.
- Consumo y costo.

### Alertas

Alertas mínimas sugeridas:

- API health falla.
- Web no responde.
- Error rate mayor al umbral.
- Latencia sostenida alta.
- Fallos de Firestore.
- Errores de autorización anómalos.
- Presupuesto o consumo fuera de umbral.

## P2 · Gestión del servicio

### Métricas de adopción

Indicadores propuestos:

- Solicitudes creadas por semana.
- Solicitudes por área/dominio.
- Tiempo promedio de intake a scoring.
- Porcentaje con brechas de política, arquitectura o FinOps.
- Demandas aprobadas, rechazadas y reformuladas.
- VAN total del portafolio priorizado.
- Usuarios activos por rol.

### Oferta gestionada

El paso a servicio administrado debe definir:

- Alcance del soporte.
- Horario de atención.
- SLA/SLO.
- Responsables por capa.
- Frecuencia de releases.
- Mecanismo de priorización de mejoras.
- Modelo de costos.

## Criterio de salida del backlog

El backlog se considera listo para transición productiva cuando:

- Todos los P0 están cerrados o formalmente aceptados con excepción.
- Los P1 tienen plan, owner y fecha objetivo.
- El release candidate gate arroja `GO` o `CONDITIONAL_GO` aprobado por sponsor.
- Existe evidencia operativa generada y almacenada.
- El handoff técnico y ejecutivo está aprobado.
