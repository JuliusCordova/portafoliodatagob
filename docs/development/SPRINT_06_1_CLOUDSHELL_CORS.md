# Sprint 06.1 · Cloud Shell runtime fix

## Objetivo

Permitir que la UI de ATLAS DataGob ejecutada desde Google Cloud Shell Web Preview pueda conectarse al backend FastAPI expuesto en otro puerto de Cloud Shell.

## Problema observado

El backend estaba activo en `0.0.0.0:8000` y respondía correctamente en `/health`, pero la UI en `3000-*.cloudshell.dev` permanecía en modo demo al presionar **Validar requerimiento**.

La causa probable era CORS: el backend solo permitía `localhost:3000` y `127.0.0.1:3000`, pero el navegador accedía desde un origen público `https://3000-*.cloudshell.dev`.

## Cambios

- Se agregó `allow_origin_regex` al middleware CORS de FastAPI.
- El valor por defecto permite `https://*.cloudshell.dev` para desarrollo local en Cloud Shell.
- El regex puede sobrescribirse con `ATLAS_ALLOWED_ORIGIN_REGEX`.
- La UI ahora muestra una tarjeta de estado de conexión.
- Si falla la llamada al API, se muestra `Error conexión` y el detalle básico del fallo.
- Se actualizó la etiqueta visual a `Sprint 06.1`.

## Comandos de prueba

Terminal 1:

```bash
cd ~/portafoliodatagob
git checkout main
git pull origin main
make dev-api
```

Terminal 2:

```bash
cd ~/portafoliodatagob/apps/web
NEXT_PUBLIC_ATLAS_API_BASE="https://8000-$WEB_HOST" npm run dev -- -H 0.0.0.0 -p 3000
```

Abrir:

```text
https://3000-$WEB_HOST
```

Presionar **Validar requerimiento**.

## Resultado esperado

La UI debe cambiar de:

```text
Demo local
```

a:

```text
API conectada
```

Y la tarjeta de estado debe indicar conexión correcta contra la URL pública del backend.
