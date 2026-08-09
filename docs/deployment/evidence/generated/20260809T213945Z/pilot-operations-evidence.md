# ATLAS DataGob · Pilot Operations Evidence

Generated at: `2026-08-09T21:42:07+00:00`

This evidence pack supports the MVP release candidate review for ATLAS DataGob v1.0-rc1. It records the controlled Cloud Run pilot execution, smoke validation, security posture and release gate decision.

## Deployment identifiers

| Field | Value |
| --- | --- |
| GCP project | proyectopersonal-480420 |
| GCP region | us-central1 |
| Artifact repository | atlas-datagob |
| Image tag | atlas-datagob-v1.0-rc1 |
| API service | atlas-datagob-api |
| Web service | atlas-datagob-web |
| Release candidate | atlas-datagob-v1.0-rc1 |

## Runtime configuration snapshot

| Field | Value |
| --- | --- |
| Demand repository | firestore |
| Firestore project | proyectopersonal-480420 |
| Firestore database | (default) |
| Firestore collection | atlas_demands |
| API auth mode | header |
| Web identity mode | static |
| Allow unauthenticated ingress | true |

## Smoke evidence summary

| Check | Status | Evidence file |
| --- | --- | --- |
| Standard smoke | passed | `standard-smoke.json` |
| Authenticated smoke | passed | `authenticated-smoke.json` |
| API demo cases | passed, count=10 | `standard-smoke.json` |
| Web proxy to API | passed, count=10 | `standard-smoke.json` |
| Auth negative path | passed, viewer blocked with HTTP 403 | `authenticated-smoke.json` |

## Release gate summary

| Field | Value |
| --- | --- |
| Decision | CONDITIONAL-GO |
| Blockers | 0 |
| Warnings | 1 |
| Warning requiring acceptance | Operational readiness status = warning |
| Gate evidence | `release-candidate-gate.md` |

## MVP release interpretation

ATLAS DataGob v1.0-rc1 is accepted as a controlled MVP release candidate, not as a fully hardened enterprise production platform. The release is defendible because the Web and API are deployed, Firestore persistence is active, 10 demo demands are available, standard and authenticated smokes pass, and the release gate has no failed blockers.

## Explicit exclusions from this MVP

- Multi-environment DEV / QA / PROD promotion.
- Full CI/CD deployment pipeline.
- Custom domain.
- Enterprise login integration.
- Advanced monitoring and budget alerting.
- Visual perfection or additional feature expansion.

## Release decision

Decision: `CONDITIONAL-GO accepted for controlled MVP pilot`  
Approver: `Julio Cordova`  
Date: `2026-08-09`  
Notes: `Operational readiness warning accepted as non-blocking for MVP release candidate. Post-MVP hardening backlog will track enterprise production improvements.`
