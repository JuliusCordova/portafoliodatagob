# ATLAS DataGob Release Candidate Gate · atlas-datagob-v1.0-rc1

Generated at: `2026-08-09T21:42:07+00:00`
Decision: **CONDITIONAL-GO**

No blockers, but 1 item(s) require explicit acceptance.

## Checks

| Check | Status | Severity | Detail |
|---|---:|---:|---|
| Release candidate id | pass | blocker | ATLAS_RC_ID configured |
| API Cloud Run URL | pass | blocker | ATLAS_API_URL configured |
| Web Cloud Run URL | pass | blocker | ATLAS_WEB_URL configured |
| API revision id | pass | major | ATLAS_RC_API_REVISION configured |
| Web revision id | pass | major | ATLAS_RC_WEB_REVISION configured |
| CI status | pass | blocker | ATLAS_RC_CI_STATUS=passed |
| Container build status | pass | blocker | ATLAS_RC_CONTAINER_STATUS=passed |
| Standard smoke status | pass | blocker | ATLAS_RC_STANDARD_SMOKE_STATUS=passed |
| Authenticated smoke status | pass | blocker | ATLAS_RC_AUTH_SMOKE_STATUS=passed |
| Operational readiness status | warn | blocker | ATLAS_RC_OPS_READINESS_STATUS=warning |
| Auth posture | pass | major | ATLAS_RC_AUTH_MODE_STATUS=passed |
| Persistence posture | pass | major | ATLAS_RC_PERSISTENCE_STATUS=passed |
| Rollback plan | pass | major | ATLAS_RC_ROLLBACK_PLAN_STATUS=passed |
| Evidence package | pass | blocker | Evidence path exists: docs/deployment/evidence/generated/20260809T213945Z/pilot-operations-evidence.md |
| Business / technical approver | pass | major | ATLAS_RC_APPROVER configured |

## Decision rule

- NO-GO: at least one blocker failed.
- CONDITIONAL-GO: no blockers failed, but at least one major item or warning requires explicit acceptance.
- GO: all checks passed without warnings.
