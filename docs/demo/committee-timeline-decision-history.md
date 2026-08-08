# Committee timeline and decision history

## Purpose

Sprint 38 enriches the ATLAS DataGob committee cockpit with a clearer decision timeline and historical context for each demand.

The objective is not to implement a full workflow engine yet. The objective is to make the current decision flow easier to audit, explain and demo.

## User path

1. Open the ATLAS web app.
2. Go to `Comité operativo` or `/committee`.
3. Synchronize backlog.
4. Select a demand.
5. Review the enriched history panel.
6. Review the timeline.
7. Register a committee decision if needed.
8. Confirm that timeline and summary reflect the latest state.

## What the timeline shows

The timeline combines two sources:

- Demand audit events already persisted in the record.
- Committee decision metadata stored in `committee_inputs`.

Each timeline entry displays:

- Event title.
- Timestamp.
- Actor.
- Decision when available.
- Status transition when available.
- Source: `event` or `committee`.
- Human-readable detail.

## Decision history summary

For the selected demand, the cockpit now shows:

- Recommendation before committee decision.
- Final committee decision.
- Final status.
- Actor that recorded the decision.
- Roles associated with the decision.
- Decision timestamp.
- Final reason.
- Conditions or next steps.
- Committee risk level.

## Guardrails preserved

Sprint 38 does not bypass the guardrails introduced in Sprint 36.

Sensitive committee decisions still require one of these roles:

- `committee_member`
- `data_architect`
- `platform_admin`

## Validation checklist

- `/committee` loads backlog.
- Selecting a demand updates historical summary.
- Timeline shows latest events first.
- A decision creates a new committee entry and status update.
- Errors remain understandable for 400, 401, 403 and 500+.
- Web build and container build remain green.

## Known limitation

The enriched history is rendered from the existing demand record. It is not yet a dedicated immutable workflow table. That is intentional for this MVP stage.
