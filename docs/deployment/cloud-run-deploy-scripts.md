# Cloud Run deploy scripts

Sprint 21 adds non-destructive deployment scripts for ATLAS DataGob Cloud Run services.

## Scope

The scripts prepare and deploy revisions for existing Cloud Run targets. They do not create or delete foundational infrastructure such as projects, Artifact Registry repositories, Firestore databases or IAM roles.

## Files

- `scripts/cloud_run/validate_cloud_run_env.sh`
- `scripts/cloud_run/deploy_api.sh`
- `scripts/cloud_run/deploy_web.sh`
- `scripts/cloud_run/verify_post_deploy.sh`
- `docs/deployment/cloud-run.env.example`

## Required order

1. Configure variables.
2. Validate variables.
3. Deploy API.
4. Capture API service URL.
5. Set `ATLAS_INTERNAL_API_BASE` for Web.
6. Deploy Web.
7. Run post-deploy verification.

## Environment setup

Use the example file as a starting point:

```bash
cp docs/deployment/cloud-run.env.example /tmp/atlas-cloud-run.env
source /tmp/atlas-cloud-run.env
```

Adjust at least:

```bash
export ATLAS_GCP_PROJECT="<project-id>"
export ATLAS_GCP_REGION="<region>"
export ATLAS_ARTIFACT_REPOSITORY="<artifact-registry-repo>"
export ATLAS_API_SERVICE_ACCOUNT="<api-service-account>"
export ATLAS_WEB_SERVICE_ACCOUNT="<web-service-account>"
```

For Firestore persistence:

```bash
export ATLAS_DEMAND_REPOSITORY="firestore"
export ATLAS_FIRESTORE_PROJECT="${ATLAS_GCP_PROJECT}"
export ATLAS_FIRESTORE_COLLECTION="demand_backlog"
```

## Commands

Validate variables:

```bash
make deploy-validate
```

Deploy API:

```bash
make deploy-api
```

After API deploy, capture the printed URL and update:

```bash
export ATLAS_INTERNAL_API_BASE="https://<api-cloud-run-url>"
```

Deploy Web:

```bash
make deploy-web
```

Verify both services:

```bash
make deploy-verify
```

## Governance notes

- `local_json` remains useful for local development.
- `firestore` is recommended for Cloud Run demo and pilot mode.
- Public access should only be enabled for controlled demos using `ATLAS_ALLOW_UNAUTHENTICATED=true`.
- Production-like environments should use authenticated access and explicit IAM.
- Service accounts should follow least privilege and should not use owner/editor roles.

## Expected outputs

API verification checks:

```text
/health
```

Web verification checks:

```text
HEAD /
```

## Not included in this sprint

- Automatic creation of Artifact Registry repositories.
- Automatic creation of Firestore databases.
- Automatic IAM binding.
- Domain mapping.
- Secret Manager integration.
- CI/CD deploy from GitHub Actions.
