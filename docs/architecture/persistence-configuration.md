# Persistence Configuration Contract

## Objetivo

ATLAS DataGob debe poder cambiar su configuración de persistencia por ambiente sin modificar la lógica funcional de intake, comité, scoring, demo reset o tablero ejecutivo.

Este sprint mantiene el adapter local JSON como implementación activa del MVP, pero centraliza la configuración en variables de entorno para preparar ambientes local, demo y futuros despliegues productivos.

## Variables soportadas

| Variable | Default | Uso |
|---|---|---|
| `ATLAS_DEMAND_REPOSITORY` | `local_json` | Adapter físico de persistencia. |
| `ATLAS_DEMAND_BACKLOG_PATH` | `data/runtime/demand_backlog.json` | Archivo runtime usado por APIs reales. |
| `ATLAS_DEMO_SEED_PATH` | `data/demo/demand_backlog_seed.json` | Dataset sintético semilla para reset de demo. |

## Adapter actual

```text
ATLAS_DEMAND_REPOSITORY=local_json
```

El único adapter soportado en este sprint es `local_json`. Si se configura otro valor, el backend debe fallar rápido con un error explícito. Esto evita que un ambiente parezca estar usando una persistencia administrada cuando todavía no existe un adapter implementado.

## Ambientes recomendados

### Local development

```bash
ATLAS_DEMAND_REPOSITORY=local_json
ATLAS_DEMAND_BACKLOG_PATH=data/runtime/demand_backlog.json
ATLAS_DEMO_SEED_PATH=data/demo/demand_backlog_seed.json
```

### Demo controlada

```bash
ATLAS_DEMAND_REPOSITORY=local_json
ATLAS_DEMAND_BACKLOG_PATH=data/runtime/demo_demand_backlog.json
ATLAS_DEMO_SEED_PATH=data/demo/demand_backlog_seed.json
```

### Pruebas automatizadas

Las pruebas pueden usar `ATLAS_DEMAND_BACKLOG_PATH` apuntando a un directorio temporal. El servicio `demand_backlog.py` debe resolver el path dinámicamente, no depender de un valor congelado al importar el módulo.

## Principios

1. La UI no conoce el storage físico.
2. Los endpoints no deberían leer variables de entorno directamente.
3. El contrato de lifecycle sigue en backend.
4. La configuración activa debe poder serializarse para diagnóstico seguro.
5. Todo cambio futuro de adapter debe pasar por `DemandRepository`.

## Próximo paso

Sprint 19 puede implementar un adapter administrado real, por ejemplo:

- Firestore para documentos operacionales.
- Cloud SQL para consistencia transaccional.
- BigQuery para analítica/histórico.

El cambio no debería requerir reescribir el flujo funcional, solo agregar el nuevo adapter, tests y configuración.
