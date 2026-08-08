# Sprint 08 · Role-based UX for Demand Governance

## Principio de diseño

ATLAS DataGob separa la experiencia por rol y momento del flujo para evitar saturación cognitiva. El producto no debe presentar intake, operación de comité y tablero ejecutivo como una sola pantalla indiferenciada.

## Experiencias principales

### 1. Intake Negocio

**Usuario objetivo:** solicitante de negocio, domain owner o product owner.

**Objetivo:** registrar una solicitud clara y enviarla a gobierno.

**Debe mostrar:**

- Título del requerimiento.
- Descripción.
- Consumo esperado.
- Estado de envío.
- Confirmación con `demand_id`.

**No debe mostrar:**

- Tabla completa de backlog.
- Acciones de comité.
- Métricas financieras.
- Tablero estratégico.

### 2. Comité Operativo

**Usuario objetivo:** Data Architect, Data Owner, Data Steward, equipo de gobierno operativo.

**Objetivo:** revisar solicitudes, analizar brechas, tomar acciones y registrar trazabilidad.

**Debe mostrar:**

- Cola de solicitudes.
- Estado y decisión sugerida.
- Patrón de arquitectura.
- Brechas de política, arquitectura y FinOps.
- Ruta de comité.
- Roles requeridos.
- Acciones trazables: aprobar a scoring, solicitar reformulación, rechazar.
- Timeline auditable.

### 3. Tablero Ejecutivo

**Usuario objetivo:** Comité Operativo ampliado, Comité Estratégico, líderes de datos y sponsors.

**Objetivo:** revisar priorización, concentración de demanda, estado del portafolio y preparación financiera.

**Debe mostrar:**

- Score promedio.
- Casos de alta prioridad.
- Total de solicitudes.
- En revisión.
- Eventos de trazabilidad.
- Top 5 iniciativas.
- Distribución por prioridad.
- Score vs benchmark.
- Brechas agregadas.
- Zona preparada para VAN, TIR, ROI y payback sin inventar valores.

## Workflow funcional

```text
Negocio registra solicitud
  → ATLAS valida política, arquitectura y FinOps
  → ATLAS crea demand_id y registro de backlog
  → Comité Operativo revisa brechas y ruta
  → Arquitecto de Datos realiza validación final
  → Resultado: approved_for_scoring | reformulation_required | rejected
  → Tablero Ejecutivo consolida portafolio, prioridad y trazabilidad
```

## Heurísticas Nielsen aplicadas

### Visibilidad del estado del sistema

Cada experiencia muestra estado de conexión, backlog y resultado de la acción ejecutada.

### Correspondencia con el mundo real

Los nombres de vistas responden al lenguaje del usuario: Intake Negocio, Comité Operativo y Tablero Ejecutivo.

### Control y libertad del usuario

La navegación permite cambiar de experiencia sin perder el contexto de la solicitud seleccionada.

### Consistencia y estándares

Estados, decisiones, prioridades y brechas usan patrones visuales consistentes: pills, score chip, timeline y tarjetas KPI.

### Prevención de errores

Las acciones de comité no aparecen en la pantalla de intake de negocio. Esto evita que un solicitante ejecute decisiones de gobierno.

### Reconocimiento antes que memoria

El Comité Operativo ve cola, detalle, brechas, roles y timeline en una misma experiencia operativa.

### Flexibilidad y eficiencia

El Tablero Ejecutivo permite saltar desde una iniciativa priorizada hacia el detalle operativo.

### Diseño minimalista

Cada vista contiene únicamente los elementos necesarios para su rol. El dashboard ejecutivo no contamina el formulario de negocio.

### Ayuda para reconocer y recuperarse de errores

Los mensajes de estado explican si falló la conexión, la sincronización del backlog o la actualización de estado.

## Decisiones pendientes para Sprint 09

- Modelo formal de scoring.
- VAN, TIR, ROI y payback.
- Filtros ejecutivos por dominio, prioridad, estado y comité.
- Ranking persistido, no solo calculado en UI.
- Separación futura por rutas reales o control de acceso por rol.
