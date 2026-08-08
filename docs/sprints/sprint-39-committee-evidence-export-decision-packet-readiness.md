# Sprint 39 · Committee evidence export and decision packet readiness

## Objetivo

Preparar el cockpit del Comité Operativo para generar un paquete de evidencia por demanda, listo para revisión de comité, sponsor o auditoría.

## Alcance implementado

- Generación de paquete de evidencia en formato Markdown desde `/committee`.
- Vista previa editable solo lectura del paquete generado.
- Acción para copiar el paquete al portapapeles.
- Acción para descargar el paquete como archivo `.md`.
- Inclusión de identificación de demanda, descripción, recomendación previa, decisión final, estado, actor, roles, fecha, motivo, condiciones, brechas y timeline.
- Documentación operativa del paquete de evidencia.

## Enfoque de diseño

El sprint prioriza valor operativo inmediato sin introducir un motor documental pesado. El paquete se arma en frontend usando la información ya disponible en la demanda seleccionada:

- `request`.
- `committee_inputs`.
- `validation_state`.
- `events[]`.
- `policy_gaps`.
- `architecture_gaps`.
- `finops_gaps`.

## Decisiones técnicas

- Se mantiene la ruta `/committee` como cockpit operativo.
- No se crea un endpoint nuevo para exportación.
- No se genera PDF todavía.
- La descarga se realiza como Markdown local usando `Blob` en el navegador.
- La copia se realiza con `navigator.clipboard` con fallback visible si falla.

## Validación esperada

- API tests.
- Web build.
- Container build API/Web.
- Deploy scripts validation.

## Fuera de alcance

- PDF nativo.
- Firma digital.
- Exportación server-side.
- Tabla inmutable de eventos.
- Workflow engine de aprobación.

## Próximo incremento recomendado

Sprint 40 · Decision packet PDF readiness and sponsor review view.
