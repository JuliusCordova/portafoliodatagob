# ATLAS DataGob · Managed persistence readiness

## Objetivo

Separar la lógica funcional de gestión de demanda del detalle físico de persistencia.

Hasta el Sprint 16, el backlog funcionaba correctamente sobre `data/runtime/demand_backlog.json`. Para una demo y un MVP local esto es suficiente, pero para evolucionar a producto necesitamos evitar que la lógica de negocio dependa directamente de archivos JSON.

El Sprint 17 introduce una frontera de repositorio.

## Decisión de arquitectura

```text
API / servicios de negocio
→ demand_backlog.py
→ DemandRepository
→ LocalJsonDemandRepository hoy
→ Managed adapter futuro
```

El contrato funcional se mantiene en:

```text
apps/api/src/atlas_datagob/services/demand_lifecycle.py
```

La frontera de persistencia se define en:

```text
apps/api/src/atlas_datagob/services/demand_repository.py
```

## Contrato `DemandRepository`

El contrato mínimo requerido por el backlog es intencionalmente pequeño:

```python
class DemandRepository(Protocol):
    def load_all(self) -> list[dict]: ...
    def replace_all(self, records: list[dict]) -> None: ...
```

Esto permite mantener la semántica actual del MVP sin anticipar complejidad innecesaria.

## Adapter actual

`LocalJsonDemandRepository` conserva la persistencia local actual, pero ahora:

- encapsula lectura/escritura de JSON;
- normaliza registros con `schema_version`;
- valida shape mínimo;
- valida estados oficiales;
- evita persistir payloads inválidos.

## Por qué no mover todavía a base administrada

Todavía estamos validando producto, narrativa, flujo de comité, scoring y gobierno. Mover demasiado pronto a una base administrada agregaría fricción operativa sin aumentar el aprendizaje funcional.

La decisión correcta es dejar listo el puerto de persistencia, no acoplarse aún a un proveedor.

## Adapters futuros candidatos

| Adapter futuro | Uso recomendado |
| --- | --- |
| Firestore | MVP productivo rápido, documentos por demanda, baja complejidad operativa. |
| Cloud SQL / PostgreSQL | Modelo relacional, queries transaccionales, reportes operativos. |
| BigQuery | Analítica de portafolio, histórico, métricas ejecutivas, explotación BI. |
| AlloyDB | Escenario empresarial PostgreSQL-compatible con alto desempeño. |

## Principio de gobierno

La UI no define persistencia ni lifecycle. La UI consume APIs.

El backend gobierna:

- schema version;
- estados;
- transiciones;
- validación antes de persistir;
- adapter activo.

## Próximo paso

Sprint 18 debería introducir configuración explícita del backend de persistencia, por ejemplo:

```text
ATLAS_DEMAND_REPOSITORY=local_json
ATLAS_DEMAND_BACKLOG_PATH=data/runtime/demand_backlog.json
```

Y dejar preparada la estructura para un adapter administrado sin afectar la experiencia actual.
