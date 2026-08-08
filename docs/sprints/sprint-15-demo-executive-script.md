# Sprint 15 · Demo script y narrativa ejecutiva

## Objetivo

Preparar ATLAS DataGob para una demo ejecutiva repetible, con guion, talking points, checklist previo y storyline de 12 minutos.

Este sprint no modifica lógica funcional de negocio. Convierte la funcionalidad ya construida en una experiencia presentable para Comité Operativo, Comité Estratégico y sponsors ejecutivos.

## Alcance

- Guion ejecutivo end-to-end.
- Checklist técnico previo a demo.
- Secuencia de presentación por escenas.
- Mensajes clave por rol.
- Plan de contingencia para demo local/Cloud Shell.
- Cierre ejecutivo alineado a gobierno de datos.

## Artefactos

- `docs/demo/executive-demo-script.md`
- `docs/demo/demo-readiness-checklist.md`

## Storyline

```text
1. El negocio registra una demanda con valor y supuestos.
2. ATLAS estructura y valida la solicitud.
3. El Comité Operativo revisa y completa criterios técnicos/gobierno.
4. ATLAS calcula score con datos explícitos.
5. El Tablero Ejecutivo permite priorizar el portafolio con evidencia.
```

## Principios de demo

- No mostrar todo a la vez.
- Separar experiencia por rol.
- Mostrar trazabilidad antes que complejidad técnica.
- Reforzar que ATLAS no inventa valores económicos.
- Presentar el tablero como sala de decisión, no como reporte.
- Usar data sintética materializada en el modelo runtime.

## Validación

No se agregan cambios funcionales ni compilables fuera de documentación, pero se mantiene el estándar:

```bash
make test
make lint-local
cd apps/web
npm run verify
```

## Próximo incremento recomendado

Sprint 16 · Product hardening: versionado de modelo de datos, lifecycle formal de estados, validación de payloads y preparación para persistencia administrada.
