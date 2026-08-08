# ATLAS DataGob · Pilot Release Notes Template

## Release identification

| Field | Value |
| --- | --- |
| Release name | ATLAS DataGob Pilot Release |
| Release date | TBD |
| Release commit | TBD |
| API revision | TBD |
| Web revision | TBD |
| Environment | Pilot / Smoke / Demo |

## Executive summary

ATLAS DataGob is ready for a controlled pilot focused on governed demand intake, policy and architecture validation, prioritization, committee workflow, financial scoring and role-aware access preparation.

## Capabilities included

- Demand intake with policy and architecture validation.
- Backlog persistence with local JSON or Firestore adapter.
- Demo data materialization for repeatable executive walkthroughs.
- Committee-oriented backlog, scoring and status workflow.
- Cloud Run packaging and deploy scripts.
- Standard and authenticated smoke validation.
- Header-based role model ready for pilot hardening.
- Web session visibility and identity propagation to API.

## Validation evidence

| Validation | Status | Evidence |
| --- | --- | --- |
| API tests | Pending | GitHub Actions run |
| Web build | Pending | GitHub Actions run |
| API container build | Pending | GitHub Actions run |
| Web container build | Pending | GitHub Actions run |
| Deploy scripts compile | Pending | GitHub Actions run |
| Standard smoke | Pending | Evidence output |
| Authenticated smoke | Pending | Evidence output |

## Known limitations

- No visual login yet.
- No JWT/OIDC verification yet.
- Header-based identity is suitable only behind a trusted boundary for pilot use.
- Firestore is supported as managed persistence adapter, but production-grade backup/retention policies must be configured externally.
- Observability is limited to platform logs and smoke outputs until dedicated telemetry dashboards are added.

## Recommended pilot guardrails

- Use a closed pilot group.
- Keep API auth in `header` mode only behind trusted Web proxy/gateway.
- Use `ATLAS_WEB_IDENTITY_MODE=static` for controlled demo users or `passthrough` behind IAP/OIDC.
- Avoid public unauthenticated access for real data.
- Do not store secrets in evidence files.
- Capture Cloud Run revision IDs before and after deployment.

## Release decision

Decision: `pending`  
Approver: `pending`  
Date: `pending`  
Notes: `pending`
