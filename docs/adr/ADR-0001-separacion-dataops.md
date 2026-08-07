# ADR-0001 · Separación frente a DataOps

## Estado

Propuesto.

## Contexto

QROMA requiere una demo para gestión de la demanda de proyectos de datos. Ya existe una línea conceptual de demos DataOps orientadas a calidad, profiling, reconciliación y procesamiento de datos. Esta nueva demo debe evitar mezclarse con esa responsabilidad.

## Decisión

La plataforma **Portafolio DataGob** será una solución separada de DataOps.

Su foco será:

- Captura de demanda.
- Clasificación por dominios.
- Estructuración de casos de uso.
- Scoring y priorización.
- Decisiones de comités.
- Seguimiento del portafolio.
- Evaluación MVP a producción.

No será responsable de:

- Ejecutar pipelines productivos de datos.
- Implementar reglas de calidad transaccional.
- Orquestar procesos de ingesta SAP a BigQuery.
- Realizar reconciliación o cuadratura productiva.

## Consecuencias

- El modelo puede crecer como plataforma de gobierno del portafolio.
- DataOps podrá integrarse en el futuro como proveedor de evidencias técnicas.
- El alcance de la demo se mantiene claro y defendible.
- La infraestructura puede ser más ligera y enfocada.

## Integraciones futuras posibles

- Consumo de métricas de calidad desde DataOps.
- Enlace con Dataplex para dominios y catálogo.
- Exportación a BigQuery para tableros ejecutivos.
- Integración con correo o Google Workspace para captura automática.
