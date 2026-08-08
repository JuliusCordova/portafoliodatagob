# Firestore persistence adapter

## Objetivo

Sprint 19 incorpora un adapter real para persistencia administrada en Firestore, manteniendo `local_json` como default para desarrollo local, Cloud Shell y demos controladas.

La decisión de diseño es que la UI, los endpoints y el flujo funcional de demanda no conozcan el backend físico de persistencia. El cambio se realiza únicamente desde configuración.

## Adapter soportados

| Adapter | Uso | Estado |
|---|---|---|
| `local_json` | Desarrollo local, demo, pruebas | Default |
| `firestore` | Persistencia administrada GCP | Implementado con dependencia opcional |

## Variables de entorno

```bash
ATLAS_DEMAND_REPOSITORY=firestore
ATLAS_FIRESTORE_PROJECT=your-gcp-project-id
ATLAS_FIRESTORE_DATABASE=(default)
ATLAS_FIRESTORE_COLLECTION=atlas_datagob_demands
```

`ATLAS_FIRESTORE_DATABASE` es opcional. Si no se define, el cliente usará su configuración por defecto.

## Contrato de documentos

Cada documento Firestore representa una demanda y usa como ID el campo:

```text
record["demand_id"]
```

La colección almacena el mismo payload del modelo runtime:

```text
schema_version
demand_id
status
decision
current_stage
request
classification
architecture
policy_gaps
architecture_gaps
finops_gaps
committee
committee_summary
business_inputs
committee_inputs
scoring
financials
events
```

## Comportamiento del adapter

### load_all

- Lee todos los documentos de la colección configurada.
- Convierte cada documento a dict.
- Si falta `demand_id`, lo toma del ID del documento.
- Normaliza y valida registros usando el contrato de lifecycle.

### replace_all

- Valida y normaliza todos los registros antes de escribir.
- Usa `demand_id` como ID del documento.
- Inserta o actualiza documentos entrantes.
- Elimina documentos obsoletos que ya no están en el conjunto entrante.

Este comportamiento mantiene paridad con el adapter `local_json`, donde `replace_all` reemplaza toda la colección runtime.

## Dependencia opcional

El adapter usa import dinámico:

```python
from google.cloud import firestore
```

La dependencia no se instala obligatoriamente en CI para no romper desarrollo local ni pruebas unitarias. Si el ambiente configura:

```bash
ATLAS_DEMAND_REPOSITORY=firestore
```

y la librería no está instalada, el backend falla explícitamente con mensaje operativo.

## Pendiente antes de producción

Antes de usar Firestore en piloto real se recomienda agregar:

- Instalación controlada de `google-cloud-firestore` en requirements o extra opcional.
- Service account con permisos mínimos.
- Reglas de naming para colecciones por ambiente.
- Pruebas de integración contra proyecto GCP real.
- Estrategia de concurrencia para updates parciales.
- Auditoría más granular por evento si el volumen crece.
- Backups/exportación a BigQuery si se requiere analítica histórica.

## Decisión de gobierno

Firestore queda como primera ruta administrada para demo cloud y piloto ligero. Para operación transaccional más estricta, el contrato de repositorio permite agregar luego un adapter Cloud SQL sin modificar UI ni lógica funcional.
