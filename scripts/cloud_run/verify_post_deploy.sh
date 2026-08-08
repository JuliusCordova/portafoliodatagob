#!/usr/bin/env bash
set -euo pipefail

: "${ATLAS_GCP_PROJECT:?Missing ATLAS_GCP_PROJECT}"
: "${ATLAS_GCP_REGION:?Missing ATLAS_GCP_REGION}"
: "${ATLAS_API_SERVICE:?Missing ATLAS_API_SERVICE}"
: "${ATLAS_WEB_SERVICE:?Missing ATLAS_WEB_SERVICE}"

service_url() {
  local service_name="$1"
  gcloud run services describe "${service_name}" \
    --project "${ATLAS_GCP_PROJECT}" \
    --region "${ATLAS_GCP_REGION}" \
    --format='value(status.url)'
}

API_URL="$(service_url "${ATLAS_API_SERVICE}")"
WEB_URL="$(service_url "${ATLAS_WEB_SERVICE}")"

echo "API URL: ${API_URL}"
echo "WEB URL: ${WEB_URL}"

echo "Checking API /health endpoint."
curl --fail --silent --show-error "${API_URL}/health" >/tmp/atlas_api_health.json
cat /tmp/atlas_api_health.json
printf '\n'

echo "Checking Web root endpoint."
curl --fail --silent --show-error --head "${WEB_URL}" >/tmp/atlas_web_head.txt
head -n 5 /tmp/atlas_web_head.txt

echo "Cloud Run post-deploy verification OK."
