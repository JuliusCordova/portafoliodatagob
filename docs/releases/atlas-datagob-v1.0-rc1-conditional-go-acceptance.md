# ATLAS DataGob v1.0-rc1 · CONDITIONAL-GO Acceptance

## Release decision

ATLAS DataGob v1.0-rc1 is accepted as a **CONDITIONAL-GO** for a controlled MVP pilot.

This release is not positioned as a fully hardened enterprise production platform. It is positioned as a defendible MVP release candidate that can be demonstrated, reviewed and evolved with explicit evidence.

## Acceptance basis

The release candidate is accepted because the following checks passed without failed blockers:

- Cloud Run API is deployed and reachable.
- Cloud Run Web is deployed and reachable.
- Firestore is active as the operational repository for the MVP backlog.
- 10 representative demo demands are available.
- Standard smoke test passed with `failed = 0`.
- Authenticated smoke test passed with `failed = 0`.
- Header-based API authorization is active.
- Viewer role is blocked from mutating demo reset with HTTP 403.
- Web proxy can read API demo cases with propagated identity.
- Release candidate gate reports no failed blockers.

## Accepted warning

The only accepted warning is:

| Warning | Acceptance rationale | Treatment |
| --- | --- | --- |
| Operational readiness status = warning | The warning is acceptable for MVP because it is caused by controlled pilot readiness conditions and not by a failed technical blocker. | Accepted for v1.0-rc1 and tracked for post-MVP hardening. |

## Explicit MVP exclusions

The following items are intentionally excluded from this release and must not block v1.0-rc1:

- Multi-environment DEV / QA / PROD promotion.
- Full CI/CD deployment pipeline.
- Custom domain.
- Enterprise identity provider integration.
- Advanced monitoring and alerting.
- Budget alerting.
- Visual perfection.
- New feature expansion beyond the validated flow.

## Release scope

The release scope is limited to a controlled MVP pilot of the demand governance journey:

1. Executive dashboard and portfolio visibility.
2. Demand backlog / demo case visibility.
3. Committee review flow.
4. Sponsor review flow.
5. Sponsor follow-up flow.
6. Operational evidence package.
7. Release gate evidence.

## Decision statement

ATLAS DataGob v1.0-rc1 is accepted as a **release defendible** for controlled pilot use.

The product is considered ready when the visual validation checklist is completed and the Sprint 48 pull request is merged.

## Approval

Approver: `Julio Cordova`  
Date: `2026-08-09`  
Decision: `CONDITIONAL-GO accepted`  
Release candidate: `atlas-datagob-v1.0-rc1`
