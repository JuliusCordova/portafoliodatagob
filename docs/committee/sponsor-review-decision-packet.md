# Sponsor review decision packet

## Objetivo

La vista `/sponsor-review` permite revisar paquetes de decisión del Comité Operativo en un formato ejecutivo, imprimible y listo para guardar como PDF desde el navegador.

## Alcance del Sprint 40

Incluye:

- Carga de demandas con decisión formal de comité.
- Selección de paquete por demanda.
- Resumen ejecutivo de identificación, área, dominio, estado y decisión.
- Trazabilidad de actor, roles, fecha y número de eventos.
- Justificación final y condiciones registradas.
- Timeline resumido.
- Acción de impresión / guardar como PDF mediante navegador.
- Acción de descarga Markdown.

No incluye todavía:

- Generación server-side de PDF.
- Firma digital.
- Repositorio inmutable de evidencias.
- Flujo formal de aprobación del sponsor.

## Uso esperado

1. Ingresar a `/sponsor-review`.
2. Seleccionar una demanda con decisión de comité.
3. Revisar decisión, justificación, condiciones y trazabilidad.
4. Usar `Imprimir / guardar PDF` para exportar el paquete desde el navegador.
5. Usar `Descargar Markdown` cuando se requiera evidencia editable o portable.

## Criterio de readiness

Un paquete se considera listo cuando existe una decisión formal del comité y una justificación registrada.

## Valor para piloto

Esta vista permite que ATLAS DataGob no solo registre decisiones, sino que entregue evidencia ejecutiva portable para sponsor, comité, auditoría o seguimiento de portafolio.
