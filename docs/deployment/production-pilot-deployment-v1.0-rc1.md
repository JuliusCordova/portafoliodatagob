# ATLAS DataGob · Production pilot deployment v1.0-rc1

## Purpose

This guide prepares ATLAS DataGob for a controlled production pilot deployment on Cloud Run using the release candidate `atlas-datagob-v1.0-rc1`.

The Sprint 47 objective is not to add new product functionality. It is to move from a pilot-ready package to a controlled production pilot execution with explicit commands, validation gates, evidence capture, and GO / NO-GO criteria.

## Current baseline

- Product: ATLAS DataGob
- Repository: `JuliusCordova/portafoliodatagob`
- Release candidate tag: `atlas-datagob-v1.0-rc1`
- Deployment target: Google Cloud Run
- Runtime mode: controlled pilot
- Expected posture: demo/pilot-ready, not full managed production operations

## Deployment sequence

### 1. Prepare Cloud Shell

```bash
cd ~/portafoliodatagob
git checkout main
git pull origin main
```

### 2. Confirm expected tag exists

```bash
git fetch --tags
git tag --list "atlas-datagob-v1.0-rc1"
```

If the tag does not exist yet, create it only after the Sprint 47 PR is merged into `main`.

### 3. Configure pilot variables

```bash
export ATLAS_PROJECT_ID="proyectopersonal-480420"
export ATLAS_REGION="us-central1"
export ATLAS_API_SERVICE="atlas-datagob-api"
export ATLAS_WEB_SERVICE="atlas-datagob-web"
```

Recommended controlled pilot identity posture:

```bash
export ATLAS_AUTH_MODE="header"
export ATLAS_WEB_IDENTITY_MODE="static"
export ATLAS_WEB_DEMO_USER="demo.operator@atlas.local"
export ATLAS_WEB_DEMO_ROLES="data_steward,committee_member,executive"
```

Recommended persistence posture for pilot:

```bash
export ATLAS_DEMAND_REPOSITORY="firestore"
export ATLAS_FIRESTORE_PROJECT="proyectopersonal-480420"
export ATLAS_FIRESTORE_DATABASE="(default)"
export ATLAS_FIRESTORE_COLLECTION="atlas_demands"
```

## Controlled deploy execution

Use the existing controlled pilot execution entrypoint.

Dry-run posture:

```bash
export ATLAS_PILOT_EXECUTE_DEPLOY="false"
make controlled-pilot-execution
```

Execution posture:

```bash
export ATLAS_PILOT_EXECUTE_DEPLOY="true"
make controlled-pilot-execution
```

## Post-deployment variables

After Cloud Run deployment, capture the generated URLs:

```bash
export ATLAS_API_URL="https://atlas-datagob-api-CHANGE.run.app"
export ATLAS_WEB_URL="https://atlas-datagob-web-CHANGE.run.app"
```

## Validation gates

### Gate 1 · Health and readiness

```bash
curl "$ATLAS_API_URL/health"
curl "$ATLAS_API_URL/ops/readiness"
```

Expected result:

- API responds successfully.
- Readiness endpoint is available.
- No critical configuration gaps are reported for the selected pilot posture.

### Gate 2 · Cloud Run smoke

```bash
make cloud-smoke
```

Expected result:

- API URL reachable.
- Web URL reachable.
- Demo reset and demo case endpoints behave as expected when enabled for the pilot.

### Gate 3 · Authenticated smoke

Use when identity posture is enabled.

```bash
export ATLAS_AUTH_SMOKE_EXPECT_ENFORCED="true"
export ATLAS_AUTH_SMOKE_ALLOWED_USER="steward@example.com"
export ATLAS_AUTH_SMOKE_ALLOWED_ROLES="data_steward,committee_member,executive"
export ATLAS_AUTH_SMOKE_DENIED_USER="viewer@example.com"
export ATLAS_AUTH_SMOKE_DENIED_ROLES="viewer"
export ATLAS_AUTH_SMOKE_ALLOW_DEMO_RESET="false"
make authenticated-cloud-smoke
```

Expected result:

- Allowed roles can access protected pilot flows.
- Restricted roles are denied for protected paths.
- Demo reset is not available unless explicitly enabled for the pilot.

### Gate 4 · Production promotion gate

```bash
make production-promotion-gate
```

Expected result:

- Required environment variables are present.
- Smoke tests have been executed.
- Promotion evidence can be captured.
- GO / NO-GO decision can be declared.

## Evidence capture

```bash
make collect-pilot-evidence
```

Evidence should include:

- Git branch and commit.
- Release tag.
- API URL.
- Web URL.
- Cloud smoke result.
- Authenticated smoke result, if applicable.
- Production promotion gate result.
- GO / NO-GO decision.

## GO criteria

Declare GO only when:

- Tag `atlas-datagob-v1.0-rc1` points to the approved `main` commit.
- API and Web deploy successfully.
- Cloud smoke passes.
- Authenticated smoke passes when auth is enabled.
- Production promotion gate passes.
- Evidence is stored.
- Sponsor/pilot owner accepts controlled pilot execution.

## NO-GO criteria

Declare NO-GO when:

- Cloud Run deployment fails.
- Smoke tests fail.
- Authenticated access is not enforcing the expected role behavior.
- Persistence points to an unintended repository or collection.
- Critical readiness gaps are present.
- Evidence cannot be captured.

## Operational note

This sprint prepares the pilot production deployment path. Actual Cloud Run deployment still requires execution in the target Google Cloud project from Cloud Shell or the approved CI/CD environment.
