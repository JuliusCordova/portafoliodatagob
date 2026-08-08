# Sprint 07 · Demand persistence and backlog

## Objective

Move ATLAS DataGob from transient validation to a traceable demand-management MVP.

Starting in this sprint, a validated request is persisted as a demand record with:

- Unique demand id.
- Original business request.
- Classification result.
- Architecture validation result.
- Policy, architecture and FinOps gaps.
- Operative Committee routing.
- Suggested decision.
- Current status.
- Lifecycle events for traceability.

## Design decision

For the MVP, persistence uses a lightweight local JSON store:

```text
data/runtime/demand_backlog.json
```

This is intentional. It keeps the demo simple, portable and easy to run in Cloud Shell before moving to a managed persistence service such as Firestore, Cloud SQL, AlloyDB or BigQuery.

## New backend service

```text
apps/api/src/atlas_datagob/services/demand_backlog.py
```

Responsibilities:

- Create demand records from validation results.
- Infer the initial status from the agent recommendation.
- List backlog records.
- Retrieve demand details by id.
- Update status and append trace events.

## New API endpoints

### Validate and create demand

```http
POST /demands/validate-and-create
```

Runs the policy/architecture validation and persists the result as a backlog record.

### List backlog

```http
GET /demands/backlog
GET /demands/backlog?status=reformulation_required
```

### Demand detail

```http
GET /demands/{demand_id}
```

### Update demand status

```http
PATCH /demands/{demand_id}/status
```

Example body:

```json
{
  "status": "approved_for_scoring",
  "decision": "approved_for_scoring",
  "comment": "Aprobado por Arquitecto de Datos para scoring.",
  "actor": "Data Architect"
}
```

## Frontend change

The existing Next.js proxy route now calls:

```text
FastAPI /demands/validate-and-create
```

So the main UI button now validates and persists the request in one action.

Visible UI outcome:

```text
Solicitud DEM-YYYYMMDD-XXXXXXXX validada y guardada en backlog.
```

## Traceability model

Each demand record stores an event list:

```json
{
  "event_id": "EVT-XXXXXXXX",
  "timestamp": "2026-08-08T03:00:00+00:00",
  "type": "demand_created",
  "actor": "ATLAS DataGob",
  "from_status": null,
  "to_status": "reformulation_required",
  "decision": "reformulation_required",
  "comment": "Solicitud validada y registrada en el backlog de demanda."
}
```

Status updates append new events rather than overwriting the trace.

## Validation

```bash
make test
make lint-local
```

Manual Cloud Shell validation:

Terminal 1:

```bash
cd ~/portafoliodatagob
make dev-api
```

Terminal 2:

```bash
cd ~/portafoliodatagob/apps/web
npm run dev -- -H 0.0.0.0 -p 3000
```

Expected result:

- UI displays `API conectada`.
- UI displays the generated demand id.
- Backend logs `POST /demands/validate-and-create HTTP/1.1 200 OK`.
- `GET /demands/backlog` returns the persisted record.

## Next sprint candidate

Sprint 08 should expose a richer backlog experience in the UI:

- Backlog table.
- Filters by status, domain and decision.
- Demand detail panel.
- Status transition actions.
- Committee decision board.
