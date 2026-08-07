# Sprint 05 · Intake UI Policy and Architecture Gaps

## Objective

Create the first usable frontend experience for ATLAS DataGob intake validation.

The UI must help business users, domain owners and the Operative Committee understand whether a request is ready to continue or requires architecture/policy review.

## Scope

- Replace the initial landing page with an intake validation cockpit.
- Add a business request form.
- Add target consumption selector: BI, ML, GenAI/RAG and streaming.
- Visualize classification result.
- Visualize the canonical end-to-end architecture rail.
- Visualize policy gaps, architecture gaps and FinOps gaps.
- Show the Operative Committee route.
- Make Data Architect final validation explicit.
- Allow optional API integration through `NEXT_PUBLIC_ATLAS_API_BASE`.
- Provide demo fallback when the backend is not running.

## UX principles

- Figma-first visual direction.
- Executive readability.
- One clear next action.
- Human-in-the-loop decisioning.
- No hidden rejection by the agent.
- Policy and architecture gaps must be visible and explainable.

## Expected flow

```text
User enters request
  -> UI calls validation endpoint or demo fallback
  -> Classification is displayed
  -> Canonical architecture pattern is displayed
  -> Gaps are grouped by policy, architecture and FinOps
  -> Operative Committee route is shown
  -> Data Architect final validation is emphasized
```

## Definition of done

- UI renders the intake cockpit.
- UI can work in demo mode without backend.
- UI can call the backend if `NEXT_PUBLIC_ATLAS_API_BASE` is configured.
- Architecture rail displays end-to-end flow.
- Gaps are visible and grouped.
- Committee route and Data Architect validation are visible.
- Web README documents the configuration.
