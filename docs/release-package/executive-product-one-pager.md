# ATLAS DataGob · Executive Product One-Pager

## 1. Resumen ejecutivo

**ATLAS DataGob** es una plataforma agéntica para gobernar la demanda de datos desde el intake hasta la priorización ejecutiva y la preparación para piloto controlado.

El producto ayuda a convertir solicitudes ambiguas de negocio en demandas estructuradas, validadas por políticas, arquitectura, comité operativo, scoring financiero y evidencia operacional.

## 2. Problema que resuelve

En muchas organizaciones, la demanda de datos llega con diferentes niveles de madurez: algunas solicitudes tienen valor claro, otras carecen de dueño, arquitectura, supuestos financieros, controles de gobierno o criterios de producción.

Esto genera:

- Priorización subjetiva.
- Backlogs difíciles de comparar.
- Iniciativas aprobadas sin evidencia suficiente.
- Riesgo de pasar a producción sin arquitectura, seguridad, ownership, FinOps u observabilidad mínimos.
- Comités que consumen tiempo validando información incompleta.

## 3. Propuesta de valor

ATLAS DataGob establece un flujo gobernado y repetible:

```text
Solicitud de negocio
→ Intake multiagente
→ Validación de política y arquitectura
→ Comité operativo
→ Scoring y priorización
→ Tablero ejecutivo
→ Piloto controlado
→ Gate de release candidate
```

## 4. Capacidades principales

- Intake de demandas con contexto de negocio.
- Clasificación agéntica de iniciativa.
- Validación contra políticas y arquitectura canónica.
- Detección de brechas de gobierno, arquitectura y FinOps.
- Backlog persistente de demandas.
- Edición gobernada y trazabilidad.
- Scoring de prioridad y señales financieras.
- Dashboard ejecutivo de portafolio.
- Identidad por roles y propagación Web → API.
- Preparación para Cloud Run y Firestore.
- Smoke estándar y autenticado.
- Readiness operativo.
- Gate de promoción a release candidate.

## 5. Estado del producto al Sprint 31

```text
Prototipo funcional local:        99%
MVP demo funcional:               98%
Piloto controlado Cloud Run:      95%
Producto enterprise piloto-ready: 94%
Producción gestionada completa:   87%
Roadmap total ATLAS DataGob:      91%
```

## 6. Evidencia técnica acumulada

- CI con pruebas API.
- Build Web.
- Build de contenedores API/Web.
- Validación de scripts Cloud Run.
- Smoke estándar.
- Smoke autenticado.
- Readiness operativo.
- Gate formal de release candidate.
- Runbooks de despliegue, smoke, evidencia, observabilidad, incidentes y promoción.

## 7. Decisión ejecutiva sugerida

**Recomendación:** avanzar a piloto controlado con sponsor ejecutivo y equipo técnico asignado.

El producto ya tiene una base sólida para mostrar valor, validar operación y decidir formalmente si debe promoverse a un release candidate productivo.

## 8. Condiciones para producción gestionada

Antes de producción completa se recomienda cerrar:

- Identidad corporativa real con IdP/IAP/OIDC/JWT.
- Monitoreo/SLOs productivos.
- Gestión de secretos formal.
- Evidencia real de Cloud Run y Firestore.
- Hardening de seguridad.
- Pruebas de carga y resiliencia.
- Proceso de soporte Día 2.
