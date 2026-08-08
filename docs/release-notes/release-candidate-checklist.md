# Release candidate checklist · ATLAS DataGob

## 1. Calidad de build

- [ ] API tests en verde.
- [ ] Web build en verde.
- [ ] Container build API exitoso.
- [ ] Container build Web exitoso.
- [ ] Deploy scripts validados.
- [ ] Smoke/evidence/gate scripts compilados.

## 2. Despliegue controlado

- [ ] API desplegada en Cloud Run.
- [ ] Web desplegada en Cloud Run.
- [ ] Revision ID API capturado.
- [ ] Revision ID Web capturado.
- [ ] URLs API/Web capturadas.
- [ ] Variables de entorno revisadas sin exponer secretos.

## 3. Seguridad e identidad

- [ ] `ATLAS_AUTH_MODE=header` validado para piloto protegido.
- [ ] `ATLAS_WEB_IDENTITY_MODE=static` o `passthrough` validado.
- [ ] Usuario autorizado puede leer demo cases.
- [ ] Viewer queda bloqueado para reset demo.
- [ ] Permiso `ops:read` validado.
- [ ] Modo público o `allow unauthenticated` aceptado explícitamente si aplica.

## 4. Persistencia y datos

- [ ] Repositorio de demandas configurado.
- [ ] Firestore configurado para piloto gestionado.
- [ ] Colección Firestore identificada.
- [ ] Demo reset controlado y no destructivo.
- [ ] Dataset de demo cargado solo cuando corresponde.

## 5. Observabilidad operativa

- [ ] `/health` responde OK.
- [ ] `/ops/readiness` responde.
- [ ] Warnings de readiness revisados.
- [ ] Logs Cloud Run revisados.
- [ ] Errores 4xx/5xx esperados o explicados.
- [ ] Runbook de incidentes disponible.

## 6. Smoke y evidencia

- [ ] Smoke estándar exitoso.
- [ ] Smoke autenticado exitoso.
- [ ] Evidencia operativa generada.
- [ ] Release notes preparados.
- [ ] Gate de promoción ejecutado.
- [ ] Reporte del gate adjuntado.

## 7. Rollback y soporte

- [ ] Última revisión estable identificada.
- [ ] Comando o procedimiento rollback documentado.
- [ ] Responsable de soporte identificado.
- [ ] Canal de incidentes definido.
- [ ] Criterios de No-Go aceptados.

## Decisión

- [ ] GO.
- [ ] CONDITIONAL-GO con riesgos aceptados.
- [ ] NO-GO.

## Firmas / aceptación

| Rol | Nombre | Decisión | Fecha |
|---|---|---|---|
| Product Owner |  |  |  |
| Technical Owner |  |  |  |
| Security / Governance |  |  |  |
| Operations |  |  |  |
