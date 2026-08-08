# Sprint 11 · UI de edición inline en grilla

## Objetivo

Conectar el CRUD gobernado del Sprint 10 con una experiencia visual de Comité Operativo que permita revisar, editar, validar y recalcular score desde la grilla de demanda.

## Alcance funcional

- Grilla de demanda con filtros por texto, área, dominio, estado y prioridad.
- Panel lateral de edición para la demanda seleccionada.
- Edición de identificación: área y dominio.
- Validación de inputs del Data Owner:
  - impacto operativo,
  - justificación de impacto operativo,
  - impacto estratégico,
  - justificación de impacto estratégico,
  - ROI,
  - VAN,
  - TIR,
  - payback,
  - alineamiento estratégico,
  - justificación de alineamiento.
- Checklist del Comité Operativo:
  - disponibilidad/calidad de datos,
  - viabilidad técnica,
  - esfuerzo de ejecución,
  - riesgo/control,
  - reutilización,
  - justificaciones obligatorias.
- Guardado parcial vía `PATCH /api/demands/update`.
- Recalcular score vía `POST /api/demands/score`.
- Cierre/rechazo lógico desde Comité Operativo.
- Trazabilidad visible con últimos eventos de la demanda.

## Decisión UX

La edición no se realiza dentro del intake ni dentro del tablero ejecutivo. La grilla del Comité Operativo es el punto donde se valida y completa la información antes del scoring.

Esto mantiene separadas las responsabilidades:

1. **Data Owner:** registra solicitud, valor de negocio y supuestos económicos.
2. **Comité Operativo:** valida inputs, completa criterios técnicos/gobierno y calcula score.
3. **Comité Estratégico:** consume el tablero ejecutivo para priorización y decisión.

## Validación manual esperada

1. Levantar API y web.
2. Crear una demanda desde Intake negocio.
3. Verificar que aparece en la grilla del Comité Operativo.
4. Filtrar por área, dominio, estado y prioridad.
5. Abrir el panel lateral.
6. Editar inputs del Data Owner y del Comité.
7. Guardar parcial y confirmar evento `demand_updated`.
8. Recalcular score y confirmar evento `scoring_updated`.
9. Revisar que el Tablero Ejecutivo refleje score, prioridad y VAN.

## Próximo incremento

Sprint 12 · Endurecimiento de UI y pruebas E2E: validaciones visuales, estados de error por campo, test/build web y preparación para demo ejecutiva.
