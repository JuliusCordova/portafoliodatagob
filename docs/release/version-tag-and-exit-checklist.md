# Version tag and final exit checklist

## Propósito

Definir el control mínimo para marcar ATLAS DataGob como release candidate y preparar el handoff final del piloto.

## Versión recomendada

```text
Release candidate: v1.0-rc1
Git tag sugerido: atlas-datagob-v1.0-rc1
Release name sugerido: ATLAS DataGob v1.0 RC1
```

## Secuencia recomendada

1. Aprobar y mergear Sprint 45.
2. Confirmar CI completo en verde.
3. Sincronizar `main`.
4. Ejecutar smoke local o Cloud Run según entorno disponible.
5. Generar evidencia de piloto.
6. Crear tag `atlas-datagob-v1.0-rc1` sobre el commit mergeado de Sprint 45.
7. Preparar handoff final en Sprint 46.

## Comandos sugeridos

```bash
git checkout main
git pull origin main
git status
git tag -a atlas-datagob-v1.0-rc1 -m "ATLAS DataGob v1.0 RC1"
git push origin atlas-datagob-v1.0-rc1
```

## Controles de salida

| Control | Evidencia |
|---|---|
| Código base cerrado | Sprint 45 mergeado a main |
| Calidad técnica | API tests, Web build, Container build y Deploy scripts en verde |
| Operación piloto | Smoke tests y readiness endpoint |
| Gobierno funcional | Comité, sponsor review y sponsor follow-up disponibles |
| Evidencia | Paquete Markdown/PDF-ready y evidence collector |
| Handoff | Sprint 46 planificado |

## Criterio GO / NO-GO

### GO

- CI en verde.
- No hay PR crítico pendiente para el flujo principal.
- Demo reset, sponsor review y sponsor follow-up están disponibles.
- La operación piloto tiene responsable y checklist de ejecución.

### NO-GO

- Falla API/Web/container build.
- No existe evidencia mínima de smoke.
- La ruta sponsor review o sponsor follow-up no carga backlog.
- No se puede generar paquete de decisión.
- No se puede identificar responsable operativo para piloto.

## Nota

Este sprint documenta el tag recomendado. La creación efectiva del tag debe hacerse después de que el PR Sprint 45 esté aprobado y mergeado a `main`.
