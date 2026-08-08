# ATLAS DataGob · SLO and Support Model

## Objetivo

Definir una base inicial de SLO, soporte e indicadores operativos para ATLAS DataGob como servicio gestionado.

Este modelo es inicial y debe validarse con el sponsor, el equipo de plataforma y el nivel de criticidad del primer despliegue productivo.

## Clasificación del servicio

| Dimensión | Valor inicial sugerido |
|---|---|
| Tipo | Aplicación de gobierno de demanda de datos |
| Criticidad inicial | Media |
| Usuarios iniciales | Data Owners, Comité Operativo, Arquitectura, Ejecutivos |
| Ventana operativa sugerida | Horario laboral |
| Modo inicial | Piloto productivo controlado |
| Dependencias | Cloud Run, Firestore, IdP/IAP/OIDC, repositorio GitHub, observabilidad cloud |

## SLO iniciales sugeridos

| SLO | Objetivo piloto | Objetivo producción gestionada |
|---|---:|---:|
| Disponibilidad Web/API | 95.0% | 99.0% |
| Health API exitoso | 98.0% | 99.5% |
| Smoke estándar exitoso | 95.0% | 99.0% |
| Smoke autenticado exitoso | 95.0% | 99.0% |
| Error rate 5xx | < 5% | < 1% |
| Tiempo de respuesta API p95 | < 2.5s | < 1.5s |
| Tiempo de recuperación P1 | < 8h | < 4h |
| Tiempo de recuperación P2 | < 2 días | < 1 día |

## Métricas mínimas

### Disponibilidad

- `/health` responde `status=ok`.
- Web root responde correctamente.
- Proxy Web/API responde para `/api/demo/cases`.

### Seguridad

- `/auth/permissions` responde solo con identidad autorizada cuando auth está en modo header.
- Usuario viewer no puede ejecutar acciones mutantes protegidas.
- Roles elevados quedan limitados al alcance requerido.

### Operación

- `/ops/readiness` retorna snapshot operativo.
- Readiness no presenta blockers P0.
- Warnings se encuentran documentados o aceptados.

### Valor

- Cantidad de demandas creadas.
- Cantidad de demandas priorizadas.
- Tiempo de flujo intake -> comité -> scoring.
- VAN total de portafolio con score.

## Severidades

| Severidad | Definición | Ejemplo | Tiempo objetivo |
|---|---|---|---|
| P0 | Servicio indisponible o riesgo crítico de seguridad | API/Web caídos, acceso no autorizado crítico | Atención inmediata |
| P1 | Funcionalidad crítica afectada | No se puede crear demanda, scoring falla | Mismo día |
| P2 | Degradación parcial | Lentitud, errores intermitentes, fallos de vista no crítica | 1-2 días |
| P3 | Mejora o consulta | Ajustes de texto, dudas de uso, solicitud menor | Según backlog |

## Matriz de atención

| Severidad | Canal | Responsable inicial | Escalamiento |
|---|---|---|---|
| P0 | Canal operativo + sponsor | Service Owner | DevOps + Security + Product Owner |
| P1 | Canal operativo | Service Owner | DevOps/Data Engineer |
| P2 | Backlog operativo | Soporte N1/N2 | Product Owner |
| P3 | Backlog funcional | Product Owner | Comité de priorización |

## Runbooks asociados

- `docs/deployment/operational-observability.md`
- `docs/deployment/incident-response-runbook.md`
- `docs/deployment/production-promotion-gate.md`
- `docs/deployment/release-candidate-checklist.md`
- `docs/deployment/controlled-cloud-run-pilot-execution.md`

## Evidencia mínima por incidente

Cada incidente P0/P1 debe registrar:

- Fecha y hora.
- Servicio afectado.
- Severidad.
- Impacto.
- Detección.
- Acción de contención.
- Causa probable.
- Evidencia de recuperación.
- Owner.
- Acción preventiva.

## Criterios de cumplimiento

Un periodo operativo se considera saludable cuando:

- No hay P0 abiertos.
- Los P1 se atienden dentro del objetivo.
- Los smoke tests críticos son exitosos.
- `/ops/readiness` no muestra blockers.
- El costo se mantiene dentro del umbral.
- No hay cambios productivos sin release gate.

## Notas de madurez

El modelo inicial está diseñado para un piloto productivo controlado. Para una operación enterprise completa se requiere integrar:

- Monitoreo centralizado.
- Alertas automáticas.
- Dashboard de SLO.
- On-call formal.
- Gestión de problemas.
- Gestión de capacidad.
- Seguridad corporativa integrada.
