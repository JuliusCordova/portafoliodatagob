# ATLAS DataGob · Release Candidate v1.0

## Objetivo

Formalizar el primer release candidate de ATLAS DataGob como producto piloto-enterprise para gobierno de demanda de datos e IA.

## Alcance funcional incluido

- Intake de demanda con validación de política, arquitectura y FinOps.
- Backlog de demandas persistente.
- Scoring operativo y financiero.
- Comité operativo con decisión, justificación, condiciones, riesgo y trazabilidad.
- Paquete de evidencia de decisión.
- Vista sponsor review imprimible/PDF-ready.
- Captura de resultado sponsor.
- Dashboard de sponsor outcome con guardrails.
- Cola sponsor follow-up con SLA.
- Captura de responsable, acción, fecha compromiso y comentario de portafolio.
- Observabilidad de piloto y readiness operacional.
- Cloud Run readiness, smoke tests y evidencia de despliegue.

## Versión candidata

```text
Product: ATLAS DataGob
Release candidate: v1.0-rc1
Target stage: controlled pilot / enterprise pilot-ready
Source branch: main after Sprint 45 approval
Suggested tag: atlas-datagob-v1.0-rc1
```

## Gates obligatorios

| Gate | Criterio | Estado esperado |
|---|---|---|
| API tests | Suite backend exitosa | PASS |
| Web build | Typecheck y build Next.js exitosos | PASS |
| Container build API | Imagen API construye correctamente | PASS |
| Container build Web | Imagen Web construye correctamente | PASS |
| Deploy scripts validation | Scripts Cloud Run validan sintaxis y contrato | PASS |
| Demo reset | Dataset demo puede reiniciarse | PASS |
| Auth smoke | Smoke autenticado ejecutable en modo header/static | PASS |
| Ops readiness | `/ops/readiness` disponible y consistente | PASS |
| Evidence package | Paquete de decisión descargable/imprimible | PASS |
| Sponsor follow-up | Seguimiento con SLA y responsable operativo | PASS |

## Checklist final de salida

- [ ] PR Sprint 45 aprobado y mergeado a `main`.
- [ ] CI completo en verde sobre el PR.
- [ ] Rama `main` sincronizada luego del merge.
- [ ] Release candidate documentado como `v1.0-rc1`.
- [ ] Tag recomendado preparado: `atlas-datagob-v1.0-rc1`.
- [ ] Evidencia de API tests registrada.
- [ ] Evidencia de Web build registrada.
- [ ] Evidencia de Container build registrada.
- [ ] Evidencia de Deploy scripts validation registrada.
- [ ] Smoke local ejecutado o documentado para ejecución.
- [ ] Smoke Cloud Run ejecutado o documentado para ejecución.
- [ ] Paquete de decisión generado desde `/sponsor-review`.
- [ ] Cola de seguimiento validada desde `/sponsor-followup`.
- [ ] Responsable de operación piloto definido.
- [ ] Próximo Sprint 46 listo para handoff ejecutivo-operativo.

## Comandos sugeridos de validación

```bash
cd ~/portafoliodatagob
git checkout main
git pull origin main
make test
make docker-build
make validate-deploy-scripts
make cloud-smoke
make authenticated-cloud-smoke
make collect-pilot-evidence
make production-promotion-gate
```

## Criterio de salida

El release candidate queda listo cuando el PR del Sprint 45 esté mergeado, los checks obligatorios estén en verde y exista evidencia suficiente para que un sponsor o responsable de plataforma pueda aceptar el paso a piloto controlado.

## Fuera de alcance de este release candidate

- Firma digital de aprobaciones.
- Repositorio inmutable de evidencia.
- Workflow engine de larga duración.
- Integración SSO/IAP productiva completa.
- Alertas automáticas por correo o Slack.
- Dashboards externos en BI.

## Próximo incremento

Sprint 46 · Pilot handoff final and executive-operational runbook.
