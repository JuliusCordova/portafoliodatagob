# Sprint 18 · Persistence Configuration

## Objetivo

Configurar la persistencia de ATLAS DataGob por ambiente sin acoplar UI, endpoints ni lógica funcional al detalle físico de almacenamiento.

## Alcance

Este sprint mantiene `local_json` como adapter activo del MVP y agrega configuración por variables de entorno para:

- Adapter de repositorio de demanda.
- Path runtime del backlog.
- Path del dataset semilla de demo.

## Cambios incluidos

- Nuevo módulo `persistence_config.py`.
- Variables soportadas:
  - `ATLAS_DEMAND_REPOSITORY`.
  - `ATLAS_DEMAND_BACKLOG_PATH`.
  - `ATLAS_DEMO_SEED_PATH`.
- `demand_repository_for` conectado a configuración centralizada.
- `demand_backlog.py` resuelve paths dinámicamente cuando no recibe path explícito.
- `.env.example` para API.
- Tests de configuración y path runtime.
- Documento `docs/architecture/persistence-configuration.md`.

## Decisión de diseño

No se implementa todavía Firestore, Cloud SQL ni BigQuery. El valor del sprint es dejar una frontera operativa limpia y testeada para habilitar esos adapters después.

## Validación esperada

```bash
make test
cd apps/web && npm run verify
```

En GitHub Actions deben pasar:

- API tests.
- Web build.

## Resultado esperado

ATLAS puede correr con defaults locales o con paths configurados por ambiente. El backend falla rápido si se configura un adapter no soportado.

## Próximo sprint sugerido

Sprint 19 · Managed persistence adapter.

Opciones:

1. Firestore adapter para MVP cloud rápido.
2. Cloud SQL adapter para consistencia transaccional.
3. BigQuery writer para histórico/analítica complementaria.
