# ATLAS DataGob · Managed Service Plan

## Propósito

Este documento define cómo operar ATLAS DataGob como servicio gestionado después del piloto controlado. El objetivo es pasar de una demo/piloto ejecutable a un modelo sostenible de operación, soporte, mejora continua y gobierno.

## Alcance del servicio gestionado

El servicio gestionado cubre:

- Operación de la aplicación Web y API.
- Monitoreo de salud y readiness.
- Validación de despliegues controlados.
- Gestión de incidentes.
- Gestión de cambios y releases.
- Control de configuración.
- Revisión FinOps.
- Soporte funcional inicial para usuarios clave.
- Evolución priorizada del backlog.

No cubre automáticamente:

- Corrección de datos fuente del cliente.
- Cambios en sistemas legados.
- Integraciones no aprobadas.
- Gobierno corporativo completo fuera de ATLAS.
- Operación de plataformas cloud no relacionadas.
- Implementación de IdP corporativo si depende de terceros.

## Modelo operativo

| Capa | Responsable sugerido | Responsabilidad |
|---|---|---|
| Producto | Product Owner / Sponsor | Prioridad, valor, adopción, roadmap |
| Gobierno de datos | Data Governance Lead | Políticas, roles, comités, criterios de aprobación |
| Arquitectura | Data Architect | Patrones, excepciones, controles técnicos |
| Operación | Platform/DevOps Engineer | Cloud Run, despliegues, observabilidad, rollback |
| Datos | Data Engineer | Persistencia, estructura de demanda, datos demo/productivos |
| Seguridad | Security/IAM Owner | Identidad, roles, secretos, acceso |
| Soporte | Service Owner | Atención, incidentes, comunicación y seguimiento |

## Cadencia recomendada

### Operación diaria

- Revisar `/health` y `/ops/readiness`.
- Confirmar errores críticos en logs.
- Revisar disponibilidad Web/API.
- Validar que no existan incidentes abiertos P0/P1.

### Semanal

- Revisar backlog de demandas y métricas de uso.
- Revisar errores recurrentes.
- Evaluar nuevas brechas de política, arquitectura y FinOps.
- Actualizar riesgos operativos.

### Quincenal

- Comité de priorización de mejoras.
- Revisión de costos y consumo.
- Evaluación de release menor.
- Revisión de tickets e incidentes.

### Mensual

- Revisión ejecutiva de valor.
- Roadmap y adopción.
- Revisión de SLO/SLA.
- Cierre de acciones de hardening.

## Flujo de gestión de cambios

1. Se registra necesidad de cambio.
2. Se clasifica: funcional, técnica, seguridad, operación, datos o arquitectura.
3. Se evalúa impacto.
4. Se prioriza en backlog.
5. Se implementa en rama/sprint.
6. Se ejecuta CI.
7. Se valida smoke y readiness.
8. Se actualiza evidencia.
9. Se aprueba merge.
10. Se comunica release.

## Flujo de release gestionado

```text
Build aprobado
  -> Smoke estándar
  -> Smoke autenticado
  -> /ops/readiness
  -> Evidence pack
  -> Production promotion gate
  -> Go / Conditional Go / No-Go
  -> Release notes
  -> Comunicación
```

## Modelo de soporte

### Nivel 1 · Soporte funcional

Atiende:

- Dudas de uso.
- Acceso a vistas.
- Interpretación de estados.
- Guía para registrar demandas.

### Nivel 2 · Soporte técnico-operativo

Atiende:

- Fallos Web/API.
- Errores de proxy.
- Fallos de persistencia.
- Revisión de logs.
- Smoke y readiness.

### Nivel 3 · Ingeniería / arquitectura

Atiende:

- Cambios de código.
- Nuevos patrones de arquitectura.
- Integración con IdP.
- Cambios de persistencia.
- Escalabilidad y multi-tenant.

## Métricas de gestión

| Métrica | Objetivo |
|---|---|
| Disponibilidad Web/API | Medir estabilidad del servicio |
| Tiempo de respuesta | Detectar degradación |
| Errores 5xx | Controlar salud técnica |
| Errores 403/401 | Detectar problemas de acceso |
| Demandas creadas | Medir adopción |
| Demandas scored | Medir uso del flujo completo |
| Tiempo intake -> scoring | Medir eficiencia del gobierno |
| Brechas por categoría | Medir madurez de solicitudes |
| VAN priorizado | Medir valor del portafolio |
| Costo mensual | Control FinOps |

## Roles mínimos para operación gestionada

Para un piloto productivo acotado:

- 1 Product Owner parcial.
- 1 Data Governance Lead parcial.
- 1 Data Architect parcial.
- 1 DevOps/Platform Engineer parcial.
- 1 Data/Backend Engineer parcial.
- 1 Security/IAM Owner parcial.

Para operación extendida:

- Service Owner dedicado parcial.
- Equipo DevSecOps recurrente.
- Mesa de soporte funcional.
- Gobierno de releases.

## Criterios para activar servicio gestionado

El servicio gestionado puede activarse cuando:

- Existe sponsor y Product Owner definido.
- El deployment target está claro.
- Autenticación y autorización están aprobadas.
- Persistencia productiva está configurada.
- Observabilidad mínima está operativa.
- Runbooks están aprobados.
- SLO/SLA inicial está definido.
- Release candidate gate está aprobado.

## Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Uso productivo con auth de demo | Bloquear promoción hasta integrar IdP/IAP/OIDC |
| Persistencia sin backup | Definir backup/export y recuperación |
| Falta de ownership | Asignar Service Owner y Product Owner |
| Crecimiento sin FinOps | Presupuesto, labels y alertas desde inicio |
| Falta de observabilidad | Dashboard/log queries antes de más usuarios |
| Cambios sin control | Gate de release y checklist obligatorio |

## Resultado esperado

ATLAS DataGob debe operar como un producto gobernado, no como una demo técnica. El servicio gestionado debe permitir sostener usuarios, controlar riesgos, medir valor y evolucionar el producto con trazabilidad.
