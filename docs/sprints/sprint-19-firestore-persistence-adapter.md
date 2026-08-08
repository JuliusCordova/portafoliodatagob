# Sprint 19 · Firestore persistence adapter

## Objetivo

Implementar el primer adapter de persistencia administrada para ATLAS DataGob, manteniendo `local_json` como default y habilitando `firestore` por configuración.

## Alcance implementado

- Adapter `FirestoreDemandRepository`.
- Activación por `ATLAS_DEMAND_REPOSITORY=firestore`.
- Variables Firestore:
  - `ATLAS_FIRESTORE_PROJECT`.
  - `ATLAS_FIRESTORE_DATABASE`.
  - `ATLAS_FIRESTORE_COLLECTION`.
- Carga dinámica de `google-cloud-firestore`.
- Cliente inyectable para pruebas unitarias.
- Escritura de documentos por `demand_id`.
- Lectura de documentos desde colección configurada.
- Eliminación de documentos obsoletos en operación `replace_all`.
- Tests unitarios con cliente Firestore falso.
- `.env.example` actualizado.
- Documento de arquitectura del adapter Firestore.

## No incluido

- Instalación obligatoria de `google-cloud-firestore` en CI.
- Prueba de integración contra proyecto GCP real.
- Provisionamiento de Firestore.
- Reglas IAM o service account.
- Manejo transaccional concurrente avanzado.

## Decisión técnica

El adapter Firestore usa dependencia opcional para evitar que el desarrollo local, Cloud Shell y CI fallen cuando se mantiene el modo default `local_json`.

Cuando un ambiente configure Firestore sin tener la librería instalada, el backend falla explícitamente con un mensaje claro.

## Validación esperada

```bash
make test
cd apps/web && npm run verify
```

En CI deben pasar:

- API tests.
- Web build.

## Próximo sprint sugerido

Sprint 20 · Cloud Run deployment readiness:

- Dockerfile API.
- Dockerfile web o estrategia Next standalone.
- Variables de entorno por ambiente.
- Guía Cloud Run.
- Checklist de service account para Firestore.
