# ATLAS DataGob · Pilot handoff final

Fecha de preparación: 2026-08-08  
Release objetivo: `atlas-datagob-v1.0-rc1`

## 1. Propósito

Este documento consolida el handoff final de ATLAS DataGob como producto piloto-ready para gestión de demanda de datos, gobierno, priorización, comité, sponsor review y seguimiento ejecutivo-operativo.

El objetivo del handoff es dejar una base clara para que un equipo de negocio, datos, arquitectura, gobierno y plataforma pueda ejecutar un piloto controlado sin depender del historial de construcción sprint a sprint.

## 2. Alcance entregado

ATLAS DataGob cubre el siguiente flujo extremo a extremo:

1. Registro de demanda de datos.
2. Intake asistido por agentes.
3. Validación de políticas, arquitectura y FinOps.
4. Backlog persistente de demandas.
5. Scoring funcional y financiero.
6. Comité operativo con decisión, justificación, condiciones y trazabilidad.
7. Paquete de evidencia de decisión.
8. Vista sponsor review imprimible y exportable.
9. Captura de resultado sponsor.
10. Dashboard ejecutivo de sponsor outcome.
11. Cola de seguimiento sponsor con SLA.
12. Asignación de responsable, acción de portafolio y fecha compromiso.
13. Evidencia operativa y documentación de release candidate.

## 3. Artefactos principales

- Aplicación web Next.js.
- API FastAPI.
- Persistencia local JSON y adapter Firestore.
- Dockerfiles API/Web.
- Scripts de despliegue Cloud Run.
- Smoke tests locales, Cloud Run y autenticados.
- Evidencia de piloto y scripts de control.
- Documentación de release candidate.
- Runbooks operativos.
- Documentación por sprint.

## 4. Roles de uso

- Data Owner: registra y complementa demanda.
- Data Steward: revisa calidad funcional de la solicitud.
- Data Architect: valida arquitectura, patrón y excepciones.
- Committee Member: decide en comité operativo.
- Executive / Sponsor: revisa paquete de decisión y emite outcome.
- Portfolio Owner: gestiona seguimiento, SLA y responsables.
- Platform Admin: administra ejecución técnica y configuración.

## 5. Criterio de aceptación del piloto

El piloto se considera listo cuando se cumplen estas condiciones:

- Los pipelines CI del PR final están en verde.
- El release candidate está documentado.
- La demo local se puede resetear y ejecutar.
- El flujo comité, sponsor y seguimiento se puede recorrer con datos semilla.
- La configuración de Cloud Run está documentada.
- Los smoke tests están disponibles.
- Las limitaciones del piloto están explícitas.

## 6. Limitaciones conocidas del piloto

- No incluye workflow engine corporativo.
- No incluye firma digital.
- No incluye repositorio WORM/inmutable de evidencia.
- No incluye integración nativa con IAM corporativo más allá del modo header/static/passthrough preparado.
- No incluye notificaciones automáticas.
- No incluye motor server-side de PDF.
- No incluye tablero BI externo.

Estas limitaciones no bloquean el piloto; son candidatas para evolución gestionada.

## 7. Criterio GO / NO-GO

### GO

- CI verde.
- Demo local ejecutable.
- Flujo end-to-end validado con seed data.
- Riesgos y limitaciones conocidos.
- Sponsor acepta piloto controlado.

### NO-GO

- Fallas críticas en build o contenedores.
- Imposibilidad de registrar decisiones o seguimiento.
- Falta de responsable operativo del piloto.
- Ausencia de ambiente objetivo o permisos mínimos.

## 8. Próximo paso sugerido

Crear el tag recomendado `atlas-datagob-v1.0-rc1` después del merge del sprint final y ejecutar la secuencia de validación definida en `docs/release/version-tag-and-exit-checklist.md`.
