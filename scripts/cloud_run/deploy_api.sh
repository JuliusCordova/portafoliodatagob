#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

"${SCRIPT_DIR}/validate_cloud_run_env.sh" api

IMAGE_URI="${ATLAS_GCP_REGION}-docker.pkg.dev/${ATLAS_GCP_PROJECT}/${ATLAS_ARTIFACT_REPOSITORY}/${ATLAS_API_IMAGE}:${ATLAS_IMAGE_TAG:-latest}"
FIRESTORE_DATABASE="${ATLAS_FIRESTORE_DATABASE:-}"

ENV_VARS="ATLAS_DEMAND_REPOSITORY=${ATLAS_DEMAND_REPOSITORY},ATLAS_FIRESTORE_PROJECT=${ATLAS_FIRESTORE_PROJECT:-},ATLAS_FIRESTORE_DATABASE=${FIRESTORE_DATABASE},ATLAS_FIRESTORE_COLLECTION=${ATLAS_FIRESTORE_COLLECTION:-},ATLAS_ALLOWED_ORIGINS=${ATLAS_ALLOWED_ORIGINS:-http://localhost:3000},ATLAS_ALLOWED_ORIGIN_REGEX=${ATLAS_ALLOWED_ORIGIN_REGEX:-https://.*\\.run\\.app}"

cd "${REPO_ROOT}"

echo "Building API image: ${IMAGE_URI}"
gcloud builds submit \
  --project "${ATLAS_GCP_PROJECT}" \
  --tag "${IMAGE_URI}" \
  --file apps/api/Dockerfile \
  .

echo "Deploying API service: ${ATLAS_API_SERVICE}"
gcloud run deploy "${ATLAS_API_SERVICE}" \
  --project "${ATLAS_GCP_PROJECT}" \
  --region "${ATLAS_GCP_REGION}" \
  --image "${IMAGE_URI}" \
  --platform managed \
  --service-account "${ATLAS_API_SERVICE_ACCOUNT:-}" \
  --set-env-vars "${ENV_VARS}" \
  --allow-unauthenticated="${ATLAS_ALLOW_UNAUTHENTICATED:-false}"

echo "API deployment submitted."
gcloud run services describe "${ATLAS_API_SERVICE}" \
  --project "${ATLAS_GCP_PROJECT}" \
  --region "${ATLAS_GCP_REGION}" \
  --format='value(status.url)'
