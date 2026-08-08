# Sprint 08 · Backlog UI Cockpit

## Objetivo

Convertir ATLAS DataGob en un cockpit ejecutivo de gobierno de demanda, inspirado en la estructura conceptual de la hoja **Tablero** del workbook de referencia.

El tablero de Excel se usa solo como referencia de composición ejecutiva: KPIs, Top casos, distribución de prioridad, análisis comparativo, VAN por caso y métricas financieras. La implementación mantiene el branding neutral de ATLAS DataGob y no incorpora identidad ni datos específicos de cliente.

## Inspiración tomada del tablero Excel

La hoja referencial organiza la mirada ejecutiva alrededor de:

- Indicadores clave del portafolio.
- Score promedio.
- Casos de alta prioridad.
- VAN total priorizado.
- Top 5 casos prioritarios.
- Distribución por prioridad.
- Análisis comparativo contra benchmark.
- VAN por caso.
- Métricas financieras clave.

## Implementación Sprint 08

La UI queda reorganizada como un dashboard ejecutivo con:

1. **Header ejecutivo**
   - Título de cockpit.
   - Estado de conexión.
   - Sincronización de backlog.

2. **Franja superior de KPIs**
   - Score promedio estimado.
   - Alta prioridad.
   - VAN total como placeholder explícito para Sprint 09.
   - Total de solicitudes.
   - Solicitudes en revisión.
   - Eventos trazables.

3. **Portafolio gobernado**
   - Tabla Top casos prioritarios.
   - Área.
   - Caso de negocio.
   - Score estimado.
   - Prioridad.
   - Estado.
   - Decisión.

4. **Analítica ejecutiva**
   - Distribución por prioridad.
   - Score vs benchmark 4.0.
   - Potencial económico preparado para VAN.
   - Brechas por política, arquitectura y FinOps.

5. **Operación del comité**
   - Nueva solicitud.
   - Detalle por `demand_id`.
   - Ruta de comité.
   - Roles revisores.
   - Acciones: aprobar a scoring, solicitar reformulación y rechazar.
   - Timeline de eventos auditables.

## Proxies Next.js

Se mantienen los proxies internos para evitar fricción de CORS en Cloud Shell:

- `POST /api/intake/validate` → `POST /demands/validate-and-create`
- `GET /api/demands/backlog` → `GET /demands/backlog`
- `PATCH /api/demands/status` → `PATCH /demands/{demand_id}/status`

## Decisiones de diseño

- El dashboard prioriza lectura ejecutiva antes que densidad técnica.
- VAN, TIR, ROI y payback se muestran como zona preparada, sin inventar valores aún.
- El score mostrado en Sprint 08 es derivado de readiness/brechas; el scoring formal se implementará en Sprint 09.
- La tabla Top casos usa el backlog persistente como fuente viva.
- Cada acción de comité actualiza el estado y agrega trazabilidad mediante eventos.

## Validación manual esperada

1. Levantar backend:

```bash
make dev-api
```

2. Levantar frontend:

```bash
cd apps/web
npm run dev -- -H 0.0.0.0 -p 3000
```

3. Abrir Web Preview en el puerto 3000.
4. Crear una solicitud con **Validar y guardar solicitud**.
5. Confirmar que aparece en la tabla Top casos prioritarios.
6. Seleccionar la solicitud.
7. Ejecutar una acción de comité.
8. Confirmar que el timeline agrega un nuevo evento.

## Próximo sprint sugerido

**Sprint 09 · Scoring operativo y modelo financiero**

- Score formal configurable.
- Prioridad Alta/Media/Baja basada en reglas.
- VAN, TIR, ROI y payback.
- Ranking por valor y riesgo.
- Filtros ejecutivos por dominio, estado, prioridad y patrón arquitectónico.
