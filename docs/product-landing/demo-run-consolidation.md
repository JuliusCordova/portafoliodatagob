# Demo run consolidation · ATLAS DataGob

Esta guía consolida el flujo completo para preparar, ejecutar y validar una demo ejecutiva de ATLAS DataGob.

---

## 1. Objetivo de la demo

Mostrar cómo ATLAS DataGob transforma una demanda de datos dispersa en una decisión gobernada, priorizada y auditable.

La demo debe evidenciar:

- Intake de demanda.
- Validación de política y arquitectura.
- Revisión de comité.
- Scoring estratégico/financiero.
- Tablero ejecutivo.
- Roles y permisos.
- Readiness operativo.
- Evidencia y gate de release.

---

## 2. Duración sugerida

```text
7 minutos · Sponsor ejecutivo
15 minutos · Comité técnico
30 minutos · Sesión completa con Q&A
```

---

## 3. Preparación local

### API

```bash
cd portafoliodatagob
make dev-api
```

Validar:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/ops/readiness
```

### Web

```bash
cd portafoliodatagob/apps/web
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

---

## 4. Preparación de datos demo

```bash
cd portafoliodatagob
make seed-demo
curl -X POST http://localhost:8000/demo/reset
curl http://localhost:8000/demands/backlog
```

Validación esperada:

```text
count >= 10
Estados variados: scored, operative_committee_review, approved_for_scoring, reformulation_required, rejected
Dominios variados: Clientes, Finanzas, Operaciones, Riesgo, Comercial
```

---

## 5. Recorrido ejecutivo recomendado

### Paso 1 · Problema

Mensaje:

```text
La demanda de datos suele entrar por canales dispersos. ATLAS la convierte en un flujo gobernado y trazable.
```

Mostrar:

- Landing del producto.
- Intake de negocio.

### Paso 2 · Intake asistido

Mensaje:

```text
El requerimiento se estructura y se valida antes de llegar al comité.
```

Mostrar:

- Nueva solicitud.
- Señales de dominio, consumo esperado y brechas.

### Paso 3 · Política y arquitectura

Mensaje:

```text
El sistema no espera a producción para detectar brechas; las expone desde el intake.
```

Mostrar:

- Validación de política.
- Validación arquitectura canónica.
- Roles requeridos.

### Paso 4 · Comité operativo

Mensaje:

```text
El comité decide con evidencia, no solo con percepción.
```

Mostrar:

- Cola de demandas.
- Estado, brechas, decisión y trazabilidad.

### Paso 5 · Scoring y tablero ejecutivo

Mensaje:

```text
El portafolio se prioriza por valor, urgencia, riesgo, factibilidad y retorno.
```

Mostrar:

- Score.
- Prioridad.
- Indicadores financieros.
- Top demandas.

### Paso 6 · Operación y release

Mensaje:

```text
Una demo no basta: ATLAS exige evidencia operativa y un gate formal de promoción.
```

Mostrar:

- `/ops/readiness`.
- Smoke tests.
- Evidence runbook.
- Release candidate checklist.

---

## 6. Validación Cloud Run

Variables mínimas:

```bash
export ATLAS_API_URL="https://REPLACE_WITH_API_URL"
export ATLAS_WEB_URL="https://REPLACE_WITH_WEB_URL"
```

Smoke estándar:

```bash
make cloud-smoke
```

Smoke autenticado:

```bash
make authenticated-cloud-smoke
```

Evidencia:

```bash
make collect-pilot-evidence
```

Gate de release:

```bash
make production-promotion-gate
```

---

## 7. Checklist antes de mostrar

- [ ] API local o Cloud Run disponible.
- [ ] Web disponible.
- [ ] Demo reset ejecutado.
- [ ] Backlog con al menos 10 demandas.
- [ ] Tablero ejecutivo carga.
- [ ] Comité operativo carga demandas.
- [ ] `/ops/readiness` responde.
- [ ] Smoke estándar pasa.
- [ ] Smoke autenticado pasa, si aplica.
- [ ] Pitch ejecutivo preparado.
- [ ] Plan de siguiente paso claro: piloto, release candidate o servicio gestionado.

---

## 8. Cierre sugerido

Mensaje final:

```text
ATLAS DataGob no es solo una demo de UI; es un patrón operativo para gobernar la demanda de datos desde el negocio hasta producción, con evidencia, roles, trazabilidad y criterios de decisión.
```
