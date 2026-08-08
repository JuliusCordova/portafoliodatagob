# Sprint 25 · Authenticated smoke and pilot hardening

## Objective

Validate that the Sprint 23 authorization model and Sprint 24 identity propagation are ready for a controlled Cloud Run pilot.

## Scope

- Add authenticated Cloud Run smoke script.
- Validate positive identity and role checks.
- Validate negative authorization behavior.
- Keep mutating demo reset disabled by default.
- Add Makefile targets and CI compilation guardrail.
- Document authenticated smoke execution.
- Add pilot hardening checklist.

## Added artifacts

- `scripts/cloud_run/authenticated_smoke_test_cloud_run.py`.
- `make authenticated-cloud-smoke`.
- `make validate-authenticated-cloud-smoke-script`.
- CI validation in `Deploy scripts` workflow.
- `docs/deployment/authenticated-cloud-run-smoke.md`.
- `docs/deployment/pilot-hardening-checklist.md`.
- Updated `docs/deployment/cloud-run.env.example`.

## Validation strategy

The authenticated smoke checks:

1. API accepts an allowed role on `/auth/permissions`.
2. API accepts an allowed role on `/demo/cases`.
3. API rejects a `viewer` role on `/demo/reset` with HTTP 403 when enforcement is expected.
4. Web exposes the resolved identity through `/api/session`.
5. Web proxy can call API with propagated identity.
6. Demo reset through Web remains opt-in.

## Design decisions

- The smoke is explicit and environment-driven.
- Destructive or mutating checks are disabled by default.
- The negative permission check is mandatory when `ATLAS_AUTH_SMOKE_EXPECT_ENFORCED=true`.
- This sprint does not implement login, JWT validation, or user administration.

## Next recommended increment

Sprint 26 · Pilot operations evidence and release notes: create a formal evidence package for Cloud Run pilot execution, including screenshots, URLs, revision IDs, smoke outputs and executive release notes.
