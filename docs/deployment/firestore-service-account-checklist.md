# Firestore service account checklist

## Objetivo

Preparar la identidad de ejecución del API de ATLAS DataGob cuando `ATLAS_DEMAND_REPOSITORY=firestore`.

## Service account sugerida

```bash
atlas-datagob-runtime@<project>.iam.gserviceaccount.com
```

## Uso

Asignar esta service account al servicio Cloud Run del API:

```bash
gcloud run deploy atlas-datagob-api \
  --service-account atlas-datagob-runtime@<project>.iam.gserviceaccount.com
```

## Permisos mínimos para piloto

Para un piloto controlado:

- Lectura de documentos de demanda.
- Escritura/actualización de documentos de demanda.
- Eliminación de documentos obsoletos cuando se ejecute `replace_all` o reset de demo.
- Escritura de logs operativos del servicio.

## Variables asociadas

```bash
ATLAS_DEMAND_REPOSITORY=firestore
ATLAS_FIRESTORE_PROJECT=<project>
ATLAS_FIRESTORE_DATABASE=(default)
ATLAS_FIRESTORE_COLLECTION=atlas_datagob_demands
```

## Validación funcional

1. Desplegar API con adapter Firestore.
2. Ejecutar reset demo desde la UI.
3. Confirmar que la colección contiene documentos con `demand_id` como ID.
4. Crear una nueva demanda desde Intake Negocio.
5. Editar una demanda desde Comité Operativo.
6. Recalcular score.
7. Confirmar que los cambios persisten después de refrescar la UI.

## Riesgos operativos

- Si el API arranca con `firestore` y no tiene permisos, la app puede fallar al leer o persistir demandas.
- Si la colección configurada es incorrecta, la UI puede aparecer sin backlog.
- Si se ejecuta reset demo sobre una colección compartida, puede reemplazar la data del piloto. Usar colección dedicada por ambiente.

## Recomendación por ambiente

| Ambiente | Colección sugerida |
|---|---|
| Local JSON | No aplica |
| Demo Cloud | `atlas_datagob_demands_demo` |
| Piloto | `atlas_datagob_demands_pilot` |
| Producción futura | `atlas_datagob_demands_prod` |
