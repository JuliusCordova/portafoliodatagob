# ATLAS DataGob v1.0-rc1 · MVP Visual Validation Checklist

## Purpose

This checklist defines the minimum visual validation required to declare ATLAS DataGob v1.0-rc1 a defendible MVP release.

The goal is not visual perfection. The goal is to confirm that the deployed product can be opened, navigated, explained and demonstrated end to end.

## Scope

Validated release candidate: `atlas-datagob-v1.0-rc1`  
Environment model: single controlled Cloud Run pilot  
Out of scope: multi-environment promotion and full CI/CD deployment pipeline

## Checklist

| Area | Minimum validation | Status | Notes |
| --- | --- | --- | --- |
| Web entrypoint | Cloud Run Web URL opens in browser | pending | Confirm visible application shell. |
| Dashboard | Executive/dashboard view loads without blocking error | pending | Confirm portfolio or demo data is visible. |
| Demo data | Product displays or can retrieve 10 demo demands | passed | Evidence: standard and authenticated smoke. |
| Session | Web session is available in static mode | passed | Evidence: smoke output. |
| Committee flow | `/committee` route opens and shows review-oriented experience | pending | Confirm backlog/review flow is navigable. |
| Sponsor review | `/sponsor-review` route opens and decision packet flow is visible | pending | Confirm executive review path. |
| Sponsor follow-up | `/sponsor-followup` route opens and follow-up path is visible | pending | Confirm post-decision path. |
| API proxy | Web proxy can read API demo cases | passed | Evidence: standard and authenticated smoke. |
| Auth positive path | Allowed identity can read protected API resources | passed | Evidence: authenticated smoke. |
| Auth negative path | Viewer is blocked from mutating reset endpoint | passed | Evidence: authenticated smoke, HTTP 403. |
| Release evidence | Evidence files are versioned in repository | passed | Sprint 48. |
| Release decision | CONDITIONAL-GO acceptance is documented | passed | Sprint 48. |

## Completion rule

The release can be declared **MVP defendible** when:

- All `passed` items remain green.
- The four visual pending items are manually confirmed by the pilot owner.
- No blocker appears during visual navigation.
- The Sprint 48 pull request is merged into `main`.

## Manual validation owner

Owner: `Julio Cordova`  
Target outcome: `ATLAS DataGob v1.0-rc1 MVP Release Defendible`
