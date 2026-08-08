# Controlled Cloud Run pilot execution

## Objective

Execute the ATLAS DataGob Cloud Run pilot in a controlled, repeatable and evidence-driven way.

This runbook assumes that the deployment scripts, smoke scripts, authenticated smoke script and evidence collector already exist in the repository.

## Safety model

The orchestrator is safe by default:

```bash
export ATLAS_PILOT_EXECUTE_DEPLOY=false
```

With this default, the script does not update Cloud Run services. It only resolves existing URLs, runs smoke checks and generates the evidence package.

To update the API and Web services, explicitly enable:

```bash
export ATLAS_PILOT_EXECUTE_DEPLOY=true
```

## Execution modes

### Evidence-only rerun

Use when Cloud Run services already exist and you only need fresh smoke results and evidence.

```bash
export ATLAS_PILOT_EXECUTE_DEPLOY=false
export ATLAS_PILOT_RUN_STANDARD_SMOKE=true
export ATLAS_PILOT_RUN_AUTH_SMOKE=true
export ATLAS_PILOT_GENERATE_EVIDENCE=true
make controlled-pilot-execution
```

### Full controlled deployment

Use when you intentionally want to update Cloud Run revisions.

```bash
export ATLAS_PILOT_EXECUTE_DEPLOY=true
export ATLAS_PILOT_RUN_STANDARD_SMOKE=true
export ATLAS_PILOT_RUN_AUTH_SMOKE=true
export ATLAS_PILOT_GENERATE_EVIDENCE=true
make controlled-pilot-execution
```

## Recommended pilot configuration

For a controlled authenticated pilot:

```bash
export ATLAS_AUTH_MODE=header
export ATLAS_WEB_IDENTITY_MODE=static
export ATLAS_WEB_DEMO_USER=demo.operator@atlas.local
export ATLAS_WEB_DEMO_ROLES=data_steward,committee_member,executive
export ATLAS_AUTH_SMOKE_EXPECT_ENFORCED=true
export ATLAS_AUTH_SMOKE_ALLOWED_ROLES=data_steward,committee_member,executive
export ATLAS_AUTH_SMOKE_DENIED_ROLES=viewer
```

## Generated files

The orchestrator writes to:

```text
docs/deployment/evidence/generated/<timestamp>/
```

Expected files:

```text
controlled-pilot-run.log
standard-smoke.json
authenticated-smoke.json
pilot-evidence.md
```

## Approval checklist before running with deploy enabled

- `ATLAS_GCP_PROJECT` points to the correct project.
- `ATLAS_GCP_REGION` is correct.
- Artifact Registry repository exists.
- Firestore database/collection settings are correct.
- API service account has required Firestore permissions.
- Web service account is correct.
- `ATLAS_ALLOWED_ORIGINS` is adjusted after the Web URL is known.
- `ATLAS_ALLOW_UNAUTHENTICATED` is intentional for the demo scenario.
- `ATLAS_PILOT_EXECUTE_DEPLOY=true` is explicitly approved.

## Post-run review

Review:

1. `controlled-pilot-run.log`.
2. `standard-smoke.json`.
3. `authenticated-smoke.json`.
4. `pilot-evidence.md`.
5. Cloud Run service URLs and revision IDs.

## Exit criteria

The sprint is complete when the repository provides a single controlled command that can deploy when explicitly enabled, run smoke tests, generate operational evidence and support an executive pilot release decision.
