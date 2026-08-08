# Cloud Run smoke deployment record · ATLAS DataGob

> Usar este formato para registrar una ejecución controlada de despliegue API + Web en Cloud Run.

## 1. Datos de ejecución

| Campo | Valor |
|---|---|
| Fecha/hora |  |
| Responsable |  |
| Proyecto GCP |  |
| Región |  |
| Ambiente | smoke / demo / piloto |
| Rama / commit |  |
| PR / Sprint | Sprint 22 |

## 2. Servicios Cloud Run

| Servicio | URL | Imagen | Revisión | Estado |
|---|---|---|---|---|
| API |  |  |  |  |
| Web |  |  |  |  |

## 3. Persistencia

| Campo | Valor |
|---|---|
| Adapter | firestore |
| Proyecto Firestore |  |
| Database |  |
| Colección |  |
| Service account API |  |
| Rol mínimo validado | Cloud Datastore User / permisos equivalentes |

## 4. Variables clave

| Servicio | Variable | Valor validado |
|---|---|---|
| API | ATLAS_DEMAND_REPOSITORY | firestore |
| API | ATLAS_FIRESTORE_PROJECT |  |
| API | ATLAS_FIRESTORE_DATABASE |  |
| API | ATLAS_FIRESTORE_COLLECTION |  |
| API | ATLAS_ALLOWED_ORIGINS |  |
| API | ATLAS_ALLOWED_ORIGIN_REGEX |  |
| Web | ATLAS_INTERNAL_API_BASE |  |
| Web | NEXT_PUBLIC_ATLAS_API_BASE |  |

## 5. Smoke tests

| Check | Resultado | Evidencia |
|---|---|---|
| API /health |  |  |
| API /demo/cases |  |  |
| Web root |  |  |
| Web proxy /api/demo/cases |  |  |
| Web proxy /api/demo/reset | omitido / ejecutado |  |
| Backlog Firestore conserva datos |  |  |
| UI Comité Operativo carga demandas |  |  |
| UI Tablero Ejecutivo carga KPIs |  |  |

## 6. Hallazgos

- 

## 7. Decisión

| Decisión | Marcar |
|---|---|
| Smoke aprobado |  |
| Smoke aprobado con observaciones |  |
| Smoke fallido |  |

## 8. Próximas acciones

- 
