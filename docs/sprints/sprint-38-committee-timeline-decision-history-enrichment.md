# Sprint 38 · Committee timeline and decision history enrichment

## Objective

Enrich the Committee Operating Cockpit with a clearer timeline and decision history so ATLAS DataGob can better explain how a demand moved through committee review.

## Scope

This sprint adds a pragmatic history layer to the existing `/committee` experience.

Included:

- Decision history summary for selected demand.
- Timeline built from demand events and committee decision metadata.
- Actor, timestamp, status transition and decision visibility.
- Historical reason, conditions and risk-level panel.
- Event count KPI for the selected demand.
- Documentation for committee timeline usage.

Not included:

- Dedicated workflow engine.
- Immutable workflow event store.
- Multi-approver voting.
- External notification workflow.

## Technical changes

Updated:

- `apps/web/src/app/committee/page.tsx`

Added:

- `docs/demo/committee-timeline-decision-history.md`
- `docs/sprints/sprint-38-committee-timeline-decision-history-enrichment.md`

## Design approach

The timeline combines available persisted data:

1. `events[]` from the demand record.
2. `committee_inputs` decision metadata.

This avoids changing backend persistence while improving pilot usability.

## Acceptance criteria

- A user can open `/committee` and select a demand.
- The selected demand shows summary of recommendation, final decision, final status, actor, roles and date.
- Timeline renders events in reverse chronological order.
- Committee decision metadata appears as an enriched timeline entry.
- CI remains green for API tests, web build, container build and deploy scripts.

## Next sprint candidate

Sprint 39 · Committee evidence export and decision packet readiness.
