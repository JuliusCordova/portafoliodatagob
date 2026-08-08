# ATLAS DataGob · Integrated committee workflow runbook

## Purpose

This runbook explains how to use the pragmatic committee decision flow integrated into the ATLAS DataGob web experience.

Sprint 34 introduced the functional `/committee` screen. Sprint 35 connects that flow to the main product experience through the global product navigation, so the committee path is no longer hidden or isolated.

## Entry points

| Entry point | Purpose |
| --- | --- |
| `/` | Main dashboard: intake, backlog, scoring and executive view. |
| `/committee` | Committee decision cockpit: recommendation, final decision, justification, conditions and traceability. |

The global product navigation exposes both entry points from every page.

## Recommended demo flow

1. Open the main dashboard.
2. Reset demo data if needed.
3. Review backlog and executive metrics.
4. Open **Comité operativo** from the product navigation.
5. Select a demand.
6. Compare agent recommendation vs committee decision.
7. Register final decision, reason and conditions.
8. Submit the decision.
9. Confirm the updated status and recent events.
10. Return to the main dashboard to continue scoring or portfolio review.

## Supported committee decisions

| Decision | Resulting status | Notes |
| --- | --- | --- |
| `approved_for_scoring` | `approved_for_scoring` | The demand can continue to scoring. |
| `reformulation_required` | `reformulation_required` | The demand requires more information or adjustment. |
| `rejected` | `rejected` | The demand is rejected and can later be archived. |
| `architecture_exception` | `operative_committee_review` | Keeps the demand under committee / architect review while recording exception intent. |

## MVP constraints

This is intentionally not a perfect workflow engine yet. Current constraints:

- No multi-user voting.
- No parallel approval tasks.
- No full SLA timer by role.
- No dedicated architecture exception object.
- No signed approval evidence.
- No notification engine.

Those items are valid next increments, but not required for the current working MVP.

## Success criteria

The workflow is considered working when:

- The navigation exposes the committee screen.
- `/committee` loads backlog records.
- A demand can be selected.
- A final decision can be submitted.
- The demand status changes according to lifecycle rules.
- Committee reason and conditions are preserved in `committee_inputs`.
- The event timeline shows recent traceability.
