# 00 · Demo Charter

## Nombre de la demo

**QROMA Data Demand Governance**

## Propósito ejecutivo

Construir una demo separada de DataOps para gestionar el ciclo completo de demanda de proyectos de datos en QROMA, desde una solicitud recibida por correo hasta su evaluación, priorización, decisión de comité, ejecución, seguimiento de valor y eventual pase de MVP a producción.

## Problema a resolver

Hoy las solicitudes pueden nacer por correo y quedar dispersas. Esto genera riesgo de baja trazabilidad, priorización subjetiva, duplicidades, falta de sponsor, poca claridad de dominio y decisiones difíciles de auditar.

## Norte de la solución

Convertir cada solicitud de datos en una iniciativa gobernada, evaluada con criterios comunes y administrada dentro de un portafolio priorizado.

## Principios de diseño

1. **Spec first**: ninguna funcionalidad se implementa sin especificación previa.
2. **Separado de DataOps**: esta demo gobierna demanda; no ejecuta pipelines productivos de calidad, profiling o reconciliación.
3. **Agentes como copilotos de gobierno**: los agentes recomiendan, estructuran y documentan; los comités deciden.
4. **Gobierno por dominios**: cada demanda debe mapearse a dominio, subdominio, Data Owner y Data Steward.
5. **Evidencia antes que intuición**: scoring, justificación y trazabilidad obligatoria.
6. **Infraestructura como código**: toda la plataforma debe poder recrearse en GCP usando IaC.

## Ciclo completo cubierto

1. Captura de demanda.
2. Triage y clasificación.
3. Estructuración de caso de uso.
4. Evaluación operativa.
5. Priorización y scoring.
6. Decisión de comité.
7. Seguimiento de ejecución.
8. Evaluación MVP a producción.
9. Métricas de valor.
10. Auditoría y trazabilidad.

## Demo mínima esperada

- UI web simple para registrar y consultar demandas.
- API backend para ciclo de vida de iniciativas.
- Agentes para intake, clasificación, scoring, paquete de comité y gate MVP.
- Persistencia en Firestore.
- Analytics en BigQuery.
- Artefactos en Cloud Storage.
- Infraestructura desplegable con Terraform.
