# Sprint 40 · Decision packet PDF readiness and sponsor review view

## Objetivo

Preparar ATLAS DataGob para revisión ejecutiva de paquetes de decisión, habilitando una vista específica para sponsor y salida imprimible/PDF desde navegador.

## Incremento entregado

- Nueva ruta web `/sponsor-review`.
- Lista de demandas con decisión formal de comité.
- Selección de paquete por demanda.
- Vista ejecutiva imprimible.
- Acción `Imprimir / guardar PDF` mediante capacidades nativas del navegador.
- Acción `Descargar Markdown` para evidencia portable.
- Navegación global hacia Sponsor review.
- Documento operativo del sponsor review.

## Decisiones de diseño

- No se agrega generación PDF server-side todavía.
- No se modifica el backend core.
- Se reutilizan los datos persistidos en `committee_inputs`, `events[]`, `request`, `policy_gaps`, `architecture_gaps` y `finops_gaps`.
- La ruta `/committee` queda como cockpit operativo; `/sponsor-review` queda como vista de revisión.

## Criterios de aceptación

- La ruta `/sponsor-review` carga demandas con decisión de comité.
- Permite seleccionar una demanda y revisar su paquete ejecutivo.
- Permite imprimir/guardar PDF desde navegador.
- Permite descargar Markdown.
- La navegación global expone el acceso a Sponsor review.
- CI debe pasar: API tests, Web build, Container build API/Web y Deploy scripts validation.

## Próximo incremento sugerido

Sprint 41 · Sponsor acknowledgement and review outcome capture.
