# ATLAS DataGob · Production Readiness Roadmap

## Objetivo

Definir una ruta clara para evolucionar ATLAS DataGob desde piloto controlado hacia operación productiva gestionada.

## Estado actual

ATLAS DataGob ya cuenta con:

- UI funcional para intake, comité y tablero ejecutivo.
- API con demanda, scoring, políticas, metadata, autorización y readiness operativo.
- Persistencia local y adapter Firestore.
- Dockerfiles API/Web.
- Scripts de deploy Cloud Run.
- Smoke estándar y smoke autenticado.
- Evidence collector.
- Controlled pilot execution.
- Production promotion gate.
- Release package ejecutivo.
- Handoff técnico y operativo.

## Fase 1 · Piloto productivo controlado

**Objetivo:** operar con usuarios acotados, evidencia y soporte cercano.

**Entregables:**

- Cloud Run API/Web desplegado.
- Firestore configurado.
- Identidad controlada para usuarios piloto.
- Smoke estándar y autenticado exitosos.
- `/ops/readiness` sin blockers críticos.
- Evidence pack generado.
- Promotion gate aprobado.

## Fase 2 · Hardening enterprise

**Objetivo:** reemplazar controles de piloto por controles enterprise.

**Entregables:**

- Integración con identidad empresarial.
- Secret management.
- IAM por service account.
- Logs y alertas productivas.
- Estrategia de backup/export.
- FinOps con presupuesto y alertas.
- Runbook de incidentes probado.

## Fase 3 · Servicio gestionado

**Objetivo:** operar ATLAS como producto administrado.

**Entregables:**

- Service Owner formal.
- SLO/SLA acordado.
- Soporte N1/N2/N3.
- Dashboard de operación y adopción.
- Cadencia de releases.
- Gestión de backlog.
- Revisión ejecutiva mensual.

## Fase 4 · Escalamiento controlado

**Objetivo:** ampliar adopción sin perder gobierno ni trazabilidad.

**Entregables:**

- Parametrización por dominio o unidad.
- Catálogo de políticas extensible.
- Plantillas de scoring ajustables.
- Segmentación de permisos.
- Modelo operativo repetible.

## Roadmap resumido

| Horizonte | Foco | Entregables clave |
|---|---|---|
| 0-2 semanas | Piloto controlado | Deploy, smoke, evidence, gate, usuarios piloto |
| 2-4 semanas | Seguridad enterprise | Identidad, secretos, IAM, roles definitivos |
| 4-6 semanas | Operación | Logs, alertas, dashboard, runbook probado |
| 6-8 semanas | Servicio gestionado | SLO/SLA, soporte, releases, FinOps, handoff formal |
| 8-12 semanas | Escala | Parametrización, catálogo de políticas, adopción |

## Dependencias críticas

- Decisión de identidad empresarial.
- Proyecto cloud y service accounts definitivos.
- Owner de costos.
- Owner de producto.
- Sponsor ejecutivo.
- Política de datos sensibles.
- Aprobación de seguridad.
- Equipo de operación.

## Criterios de avance

### Go

- CI en verde.
- Smoke estándar y autenticado exitosos.
- Readiness operativo sin blockers.
- Gate de promoción aprobado.
- Owner y soporte asignados.

### Conditional Go

- Existen warnings aceptados formalmente.
- Existe plan con owner y fecha.
- El alcance de usuarios está limitado.
- El sponsor acepta el riesgo residual.

### No-Go

- Identidad no aprobada.
- Persistencia productiva no validada.
- Rollback no definido.
- Owner operativo no asignado.
- Existen blockers críticos sin mitigación.

## Resultado esperado

Al completar este roadmap, ATLAS DataGob estará listo para operar como plataforma de gobierno de demanda con trazabilidad, priorización, control operativo y gestión continua de valor.
