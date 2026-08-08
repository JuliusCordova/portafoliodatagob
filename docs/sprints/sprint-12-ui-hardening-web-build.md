# Sprint 12 · UI hardening y web build validation

## Objetivo

Endurecer la capa web de ATLAS DataGob para que la experiencia visual del Sprint 11 no dependa solo de prueba manual, sino también de validación automática de TypeScript y build de Next.js.

## Alcance

- Agregar script `typecheck` al frontend.
- Agregar script `verify` para ejecutar typecheck + build.
- Incorporar `tsconfig.json` explícito.
- Incorporar `next-env.d.ts` para tipos Next.js.
- Agregar workflow `Web build` en GitHub Actions.
- Actualizar documentación local de verificación web.

## Fuera de alcance

- Nuevas funcionalidades de negocio.
- Cambio de modelo de datos.
- Pruebas E2E con navegador real.
- Persistencia en base de datos administrada.

## Validación esperada

Local:

```bash
cd apps/web
npm install
npm run typecheck
npm run build
```

CI:

```text
API tests: success
Web build: success
```

## Criterio de aceptación

El PR se considera listo cuando ambos workflows pasan en verde y el frontend puede compilar como build productivo.

## Próximo incremento sugerido

Sprint 13 · Demo readiness: datos semilla, reset de demo, casos preconfigurados y guía de presentación end-to-end.
