# Pilot operations evidence runbook

## Objective

Create a repeatable evidence package for ATLAS DataGob pilot execution. The package captures deployment identifiers, runtime configuration, smoke results, acceptance checklist and release decision.

## Scope

This runbook covers evidence capture only. It does not deploy infrastructure, change Cloud Run services, alter IAM, run migrations or mutate Firestore.

## Preconditions

- API and Web services have been deployed or updated in Cloud Run.
- `ATLAS_API_URL` and `ATLAS_WEB_URL` are available.
- Standard smoke and authenticated smoke have been executed or are ready to execute.
- No secrets are exported into the shell used for evidence generation.

## Environment variables

Required or recommended variables:

```bash
export ATLAS_GCP_PROJECT="proyectopersonal-480420"
export ATLAS_GCP_REGION="us-central1"
export ATLAS_ARTIFACT_REPOSITORY="atlas-datagob"
export ATLAS_IMAGE_TAG="latest"

export ATLAS_API_SERVICE="atlas-datagob-api"
export ATLAS_API_URL="https://REPLACE_WITH_API_URL"
export ATLAS_API_REVISION="REPLACE_WITH_API_REVISION"

export ATLAS_WEB_SERVICE="atlas-datagob-web"
export ATLAS_WEB_URL="https://REPLACE_WITH_WEB_URL"
export ATLAS_WEB_REVISION="REPLACE_WITH_WEB_REVISION"

export ATLAS_RELEASE_COMMIT="$(git rev-parse HEAD)"

export ATLAS_DEMAND_REPOSITORY="firestore"
export ATLAS_FIRESTORE_PROJECT="${ATLAS_GCP_PROJECT}"
export ATLAS_FIRESTORE_DATABASE="(default)"
export ATLAS_FIRESTORE_COLLECTION="demand_backlog"

export ATLAS_AUTH_MODE="header"
export ATLAS_WEB_IDENTITY_MODE="static"
export ATLAS_ALLOWED_ORIGINS="${ATLAS_WEB_URL}"
export ATLAS_ALLOWED_ORIGIN_REGEX="https://.*\\.run\\.app"
export ATLAS_ALLOW_UNAUTHENTICATED="false"
```

## Capture smoke outputs

Standard smoke:

```bash
make cloud-smoke | tee /tmp/atlas-standard-smoke.json
```

Authenticated smoke:

```bash
export ATLAS_AUTH_SMOKE_EXPECT_ENFORCED=true
export ATLAS_AUTH_SMOKE_USER="pilot.operator@atlas.local"
export ATLAS_AUTH_SMOKE_ROLES="data_steward,committee_member,executive"
export ATLAS_AUTH_SMOKE_DENIED_USER="pilot.viewer@atlas.local"
export ATLAS_AUTH_SMOKE_DENIED_ROLES="viewer"
make authenticated-cloud-smoke | tee /tmp/atlas-authenticated-smoke.json
```

Mutating reset must remain disabled unless explicitly approved:

```bash
export ATLAS_AUTH_SMOKE_ALLOW_DEMO_RESET=false
```

## Generate evidence pack

```bash
make collect-pilot-evidence
```

With smoke files:

```bash
python scripts/cloud_run/collect_pilot_evidence.py \
  --standard-smoke-output /tmp/atlas-standard-smoke.json \
  --authenticated-smoke-output /tmp/atlas-authenticated-smoke.json \
  --output docs/deployment/evidence/pilot-operations-evidence-latest.md
```

## Review evidence

Before approval, confirm:

- No secrets or tokens are present.
- API and Web URLs match the intended environment.
- API and Web revision IDs are captured.
- Standard smoke passed.
- Authenticated smoke passed.
- Negative authorization check returns HTTP 403 when auth is enforced.
- Firestore collection is the intended pilot collection.
- Release decision is explicitly marked as approved, deferred or rejected.

## Handoff outputs

Expected output files:

- `docs/deployment/evidence/pilot-operations-evidence-latest.md`
- Completed copy of `docs/deployment/evidence/pilot-operations-evidence-template.md`
- Completed copy of `docs/release-notes/pilot-release-notes-template.md`

## Rollback note

Rollback is outside this evidence script. Use Cloud Run revision management to direct traffic back to a prior known-good revision if required.
