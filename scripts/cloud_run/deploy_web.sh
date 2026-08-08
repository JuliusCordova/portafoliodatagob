#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

"${SCRIPT_DIR}/validate_cloud_run_env.sh" web

IMAGE_URI="${ATLAS_GCP_REGION}-docker.pkg.dev/${ATLAS_GCP_PROJECT}/${ATLAS_ARTIFACT_REPOSITORY}/${ATLAS_WEB_IMAGE}:${ATLAS_IMAGE_TAG:-latest}"
ENV_VARS="ATLAS_INTERNAL_API_BASE=${ATLAS_INTERNAL_API_BASE}"

cd "${REPO_ROOT}"

echo "Configuring Docker auth for Artifact Registry."
gcloud auth configure-docker "${ATLAS_GCP_REGION}-docker.pkg.dev" --quiet

echo "Building Web image: ${IMAGE_URI}"
docker build -f apps/web/Dockerfile -t "${IMAGE_URI}" apps/web

echo "Pushing Web image: ${IMAGE_URI}"
docker push "${IMAGE_URI}"

DEPLOY_ARGS=(
  "${ATLAS_WEB_SERVICE}"
  --project "${ATLAS_GCP_PROJECT}"
  --region "${ATLAS_GCP_REGION}"
  --image "${IMAGE_URI}"
  --platform managed
  --set-env-vars "${ENV_VARS}"
)

if [[ -n "${ATLAS_WEB_SERVICE_ACCOUNT:-}" ]]; then
  DEPLOY_ARGS+=(--service-account "${ATLAS_WEB_SERVICE_ACCOUNT}")
fi

if [[ "${ATLAS_ALLOW_UNAUTHENTICATED:-false}" == "true" ]]; then
  DEPLOY_ARGS+=(--allow-unauthenticated)
else
  DEPLOY_ARGS+=(--no-allow-unauthenticated)
fi

echo "Deploying Web service: ${ATLAS_WEB_SERVICE}"
gcloud run deploy "${DEPLOY_ARGS[@]}"

echo "Web deployment submitted. Service URL:"
gcloud run services describe "${ATLAS_WEB_SERVICE}" \
  --project "${ATLAS_GCP_PROJECT}" \
  --region "${ATLAS_GCP_REGION}" \
  --format='value(status.url)'
