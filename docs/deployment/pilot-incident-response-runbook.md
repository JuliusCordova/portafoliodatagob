# ATLAS DataGob · Pilot incident response runbook

## Objetivo

Establecer una guía simple de respuesta ante incidentes para el piloto controlado de ATLAS DataGob.

## Severidades

| Severidad | Definición | Ejemplos |
|---|---|---|
| SEV-1 | Piloto no operable o datos no accesibles. | API caída, Web caída, Firestore inaccesible, auth bloquea todo el flujo. |
| SEV-2 | Flujo principal afectado con workaround. | Intake funciona, pero scoring falla; Web funciona, pero reset demo falla. |
| SEV-3 | Degradación o brecha no bloqueante. | Ribbon no muestra sesión, warning de local_json, brechas abiertas documentadas. |

## Primeros 10 minutos

1. Confirmar URL API y Web.
2. Ejecutar `/health`.
3. Ejecutar `/ops/readiness` con identidad autorizada.
4. Ejecutar `make cloud-smoke`.
5. Ejecutar `make authenticated-cloud-smoke`.
6. Registrar error exacto, hora local, actor y servicio afectado.

## Comandos base

```bash
curl "${ATLAS_API_URL}/health"

curl -H "X-ATLAS-USER: ${ATLAS_AUTH_SMOKE_ALLOWED_USER}" \
  -H "X-ATLAS-ROLES: ${ATLAS_AUTH_SMOKE_ALLOWED_ROLES}" \
  "${ATLAS_API_URL}/ops/readiness"

make cloud-smoke
make authenticated-cloud-smoke
```

## Decisiones rápidas

| Señal | Decisión |
|---|---|
| `/health` falla | Revisar despliegue API antes de continuar. |
| `/ops/readiness` = `critical` | Pausar piloto y revisar configuración/logs. |
| Smoke estándar falla | Revisar conectividad API/Web y URLs. |
| Smoke autenticado falla | Revisar `ATLAS_AUTH_MODE`, roles y propagación Web. |
| Backlog vacío | Ejecutar seed/reset controlado si está autorizado. |

## Registro mínimo del incidente

```text
Fecha/hora:
Reportado por:
Severidad:
Servicio afectado:
URL:
Commit/revision:
Síntoma:
Comando ejecutado:
Resultado:
Causa probable:
Acción tomada:
Estado final:
```

## Criterio de cierre

Un incidente se considera cerrado cuando:

- El comando fallido vuelve a pasar.
- La evidencia se adjunta al paquete del piloto.
- Se documenta causa probable o acción correctiva.
- Se define si requiere sprint posterior.
