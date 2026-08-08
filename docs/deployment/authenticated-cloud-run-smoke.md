# Authenticated Cloud Run smoke runbook

Sprint 25 prepares ATLAS DataGob for a controlled authenticated pilot. It validates that identity is propagated from Web to API and that role-based authorization blocks unsupported actions.

## When to use

Use this runbook after the baseline Cloud Run smoke passes and before exposing the pilot to business users.

## Required deployment posture

API service:

```bash
export ATLAS_AUTH_MODE="header"
```

Web service:

```bash
export ATLAS_WEB_IDENTITY_MODE="static"
export ATLAS_WEB_DEMO_USER="demo.operator@atlas.local"
export ATLAS_WEB_DEMO_ROLES="data_steward,committee_member,executive"
```

For a future IAP/OIDC integration, use:

```bash
export ATLAS_WEB_IDENTITY_MODE="passthrough"
```

## Required smoke variables

```bash
export ATLAS_API_URL="https://REPLACE_WITH_API_URL"
export ATLAS_WEB_URL="https://REPLACE_WITH_WEB_URL"
export ATLAS_AUTH_SMOKE_EXPECT_ENFORCED="true"
export ATLAS_AUTH_SMOKE_ALLOWED_USER="steward@example.com"
export ATLAS_AUTH_SMOKE_ALLOWED_ROLES="data_steward,committee_member,executive"
export ATLAS_AUTH_SMOKE_DENIED_USER="viewer@example.com"
export ATLAS_AUTH_SMOKE_DENIED_ROLES="viewer"
export ATLAS_AUTH_SMOKE_ALLOW_DEMO_RESET="false"
```

## Command

```bash
make authenticated-cloud-smoke
```

## Expected checks

The script validates:

1. API `GET /auth/permissions` accepts an allowed identity.
2. API `GET /demo/cases` accepts an allowed identity.
3. API `POST /demo/reset` rejects a `viewer` identity with HTTP 403.
4. Web `GET /api/session` exposes the resolved session context.
5. Web `GET /api/demo/cases` reaches API through Next.js with propagated identity.
6. Optional Web `POST /api/demo/reset` only runs when `ATLAS_AUTH_SMOKE_ALLOW_DEMO_RESET=true`.

## Non-destructive default

The authenticated smoke does not execute demo reset unless explicitly enabled:

```bash
export ATLAS_AUTH_SMOKE_ALLOW_DEMO_RESET="true"
```

Keep this disabled for normal pilot validation.

## Pass criteria

A pilot candidate can proceed when:

- The unauthenticated baseline smoke passes.
- The authenticated smoke passes.
- The negative permission check returns HTTP 403.
- Web `/api/session` shows the expected user and roles.
- The API is not left in `ATLAS_AUTH_MODE=disabled` for controlled pilot use.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `401` from API | Missing identity headers | Confirm Web is `static` or `passthrough`, or run direct API calls with `X-ATLAS-USER` and `X-ATLAS-ROLES`. |
| Negative check returns `200` | API auth mode is disabled | Redeploy API with `ATLAS_AUTH_MODE=header`. |
| Web proxy returns `403` | Web user has insufficient role | Confirm `ATLAS_WEB_DEMO_ROLES` includes `data_steward` for demo reset or read-capable roles for demo cases. |
| `/api/session` shows `disabled` | Web identity mode is disabled | Redeploy Web with `ATLAS_WEB_IDENTITY_MODE=static` or `passthrough`. |
