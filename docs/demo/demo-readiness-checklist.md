# ATLAS DataGob · Checklist previo a demo

## 1. Estado del repositorio

```bash
cd ~/portafoliodatagob
git checkout main
git pull origin main
```

Validar que el working tree esté limpio:

```bash
git status
```

Resultado esperado:

```text
nothing to commit, working tree clean
```

## 2. Materializar data sintética

```bash
make seed-demo
```

Resultado esperado:

```text
Seeded 10 demo demands into data/runtime/demand_backlog.json
```

Validar backlog runtime:

```bash
python - <<'PY'
import json
from pathlib import Path
records = json.loads(Path('data/runtime/demand_backlog.json').read_text())
print(len(records))
print(records[0]['demand_id'])
PY
```

Resultado esperado:

```text
10
DEM-DEMO-...
```

## 3. Validar backend

```bash
make test
make lint-local
```

Levantar API:

```bash
make dev-api
```

Validar salud:

```bash
curl http://localhost:8000/health
```

Validar backlog:

```bash
curl http://localhost:8000/demands/backlog
```

## 4. Validar frontend

En otra terminal:

```bash
cd ~/portafoliodatagob/apps/web
npm install
npm run verify
npm run dev -- -H 0.0.0.0 -p 3000
```

En Cloud Shell:

- Abrir Web Preview en puerto 3000.
- Confirmar que aparecen las 3 vistas:
  - Intake negocio.
  - Comité operativo.
  - Tablero ejecutivo.
- Confirmar que aparece el control global de demo.

## 5. Validación funcional rápida

### Intake negocio

- Crear una solicitud nueva.
- Confirmar que se envía a Comité Operativo.
- Confirmar que aparece en la grilla.

### Comité operativo

- Filtrar por dominio `Clientes`.
- Seleccionar `DEM-DEMO-002`.
- Abrir panel lateral.
- Completar o validar checklist técnico.
- Guardar.
- Recalcular score.

### Tablero ejecutivo

- Ver score promedio.
- Ver Top 5.
- Ver VAN total.
- Ver distribución por prioridad.
- Ver brechas agregadas.

## 6. Plan de contingencia durante demo

Si la grilla aparece vacía:

```bash
make seed-demo
```

O desde la UI:

- Usar `Resetear demo`.
- Confirmar acción.
- Esperar recarga.

Si el frontend no conecta:

- Revisar que `make dev-api` esté activo.
- Revisar puerto 8000.
- Reiniciar `npm run dev -- -H 0.0.0.0 -p 3000`.

Si el build web falla localmente:

```bash
cd apps/web
rm -rf .next node_modules
npm install
npm run verify
```

## 7. Checklist ejecutivo antes de presentar

- [ ] API corriendo.
- [ ] Frontend corriendo.
- [ ] 10 demandas demo cargadas.
- [ ] Vista Comité muestra grilla poblada.
- [ ] Vista Tablero muestra KPIs.
- [ ] Caso `DEM-DEMO-002` disponible para edición.
- [ ] Caso `DEM-DEMO-003` disponible para reformulación.
- [ ] Narrativa de 12 minutos abierta o impresa.
- [ ] No hay datos reales ni sensibles en la demo.
