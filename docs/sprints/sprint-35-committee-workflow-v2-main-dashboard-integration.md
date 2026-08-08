# Sprint 35 · Committee workflow v2 and main dashboard integration

## Objective

Integrate the pragmatic committee decision workflow into the main ATLAS DataGob product experience.

Sprint 34 created a standalone `/committee` cockpit. Sprint 35 makes that flow discoverable and usable as part of the product navigation without refactoring the main dashboard or over-engineering the workflow.

## Delivered scope

- Added global product navigation component.
- Added responsive navigation styles.
- Wired navigation into the root layout.
- Exposed direct entry points to:
  - Main dashboard `/`.
  - Committee cockpit `/committee`.
- Added an integrated committee workflow runbook.

## Product rationale

The previous committee workflow was functional but isolated. The user had to know the route manually. This sprint closes that adoption gap by making the committee path visible from the product shell.

This keeps the implementation pragmatic:

- No risky refactor of the main dashboard.
- No duplication of committee logic.
- No premature workflow engine.
- No breaking change to existing API, proxy, scoring or demo flows.

## Functional validation

Expected validation:

- Web application builds successfully.
- Product navigation renders across the app.
- `/` remains available for the main cockpit.
- `/committee` remains available for committee decisioning.
- Existing demo controls and session banner remain available.
- Existing API and deployment scripts continue to pass CI.

## Limitations intentionally deferred

- Full integration of committee forms into the main dashboard tab.
- Role-aware navigation hiding/showing actions.
- Multi-user committee voting.
- Architecture exception sub-workflow.
- SLA timers and pending approval queues.
- Notification and assignment engine.

## Suggested next increment

Sprint 36 · Role-aware navigation and committee action guardrails.

That sprint should improve product behavior by making navigation and actions more explicitly aligned to roles and permissions.
