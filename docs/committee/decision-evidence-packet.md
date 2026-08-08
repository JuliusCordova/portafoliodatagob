# Committee decision evidence packet

## Objetivo

El paquete de evidencia permite consolidar en un solo resumen la información mínima necesaria para revisar, compartir o auditar una decisión del Comité Operativo.

## Ubicación

```text
/committee
```

## Contenido del paquete

El paquete se genera en formato Markdown e incluye:

- Identificación de la demanda.
- Área solicitante, rol, dominio y consumo objetivo.
- Descripción ejecutiva.
- Recomendación previa.
- Decisión final.
- Estado final.
- Riesgo percibido.
- Actor, roles y fecha de decisión.
- Justificación.
- Condiciones y próximos pasos.
- Brechas de política, arquitectura y FinOps.
- Timeline de evidencia.
- Nota de control.

## Acciones disponibles

### Copiar paquete

Copia el Markdown al portapapeles para enviarlo por correo, chat o incluirlo en una minuta.

### Descargar Markdown

Genera un archivo `.md` con el paquete de evidencia de la demanda seleccionada.

## Criterio de uso

Este paquete no reemplaza aprobaciones formales externas ni documentación contractual. Su propósito es dejar una evidencia operativa clara para comité, sponsor, auditoría o demo ejecutiva.

## Limitaciones conocidas

- El paquete usa la información disponible en `events[]`, `committee_inputs`, brechas y metadata de la demanda.
- No genera PDF todavía.
- No firma digitalmente el paquete.
- No crea una tabla inmutable de eventos; usa la persistencia actual del backlog.
