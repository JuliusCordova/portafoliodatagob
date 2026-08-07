# 05 · Scoring y Gates MVP a Producción

## Scoring de priorización

Cada iniciativa se califica de 1 a 5 por criterio. El score total se calcula como ponderación de criterios.

| Criterio | Peso |
|---|---:|
| Valor para el negocio | 30% |
| Alineamiento estratégico | 20% |
| Disponibilidad / calidad de datos | 15% |
| Viabilidad técnica | 15% |
| Esfuerzo / time to market | 10% |
| Riesgo / cumplimiento | 10% |

## Bandas sugeridas

| Score | Decisión sugerida |
|---:|---|
| >= 4.0 | Prioridad alta / ejecutar |
| 3.2 - 3.9 | Prioridad media |
| 2.5 - 3.1 | Backlog |
| < 2.5 | Reformular o descartar |

## Reglas de selección antes de priorizar

Una demanda solo pasa a priorización si cumple mínimos:

- Existe problema de negocio claro.
- Existe sponsor responsable.
- Puede ubicarse en dominio y subdominio.
- Existen datos o una ruta razonable para obtenerlos.
- Tiene valor potencial suficiente.

## Matriz MVP a Producción

El pase de MVP a producción no depende solo de que la demo funcione. Debe validar valor, operación, riesgo y sostenibilidad.

| Dimensión | Criterio | Decisión esperada |
|---|---|---|
| Valor | Resultado demostrado frente a métrica objetivo | GO / CONDICIONADO / NO GO |
| Adopción | Usuario de negocio valida utilidad | GO / CONDICIONADO / NO GO |
| Datos | Calidad, disponibilidad y ownership definidos | GO / CONDICIONADO / NO GO |
| Seguridad | Accesos, sensibilidad y controles validados | GO / CONDICIONADO / NO GO |
| Arquitectura | Patrón técnico escalable y soportable | GO / CONDICIONADO / NO GO |
| Operación | Monitoreo, soporte y responsables definidos | GO / CONDICIONADO / NO GO |
| Costos | Estimación y presupuesto operativo aceptables | GO / CONDICIONADO / NO GO |
| Riesgo | Riesgos aceptados o mitigados | GO / CONDICIONADO / NO GO |

## Decisión final MVP

- **GO producción**: cumple criterios críticos y tiene sponsor confirmado.
- **GO condicionado**: puede avanzar si se cierran condiciones.
- **Pivotar**: requiere cambio de alcance o enfoque.
- **Detener**: no demuestra valor, no tiene datos, o el riesgo supera el beneficio.

## Evidencias obligatorias para comité

- Caso de uso resumido.
- Score de priorización.
- Decisión del Comité Operativo.
- Decisión del Comité Estratégico.
- Evidencia de valor MVP.
- Riesgos y mitigaciones.
- Modelo operativo mínimo.
- Responsable de producción.
