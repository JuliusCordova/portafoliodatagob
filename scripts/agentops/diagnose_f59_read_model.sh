#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
SERVICE="${PREVIEW_API_SERVICE:-atlas-datagob-api-f59-preview}"
RUNTIME_SA="${RUNTIME_SA:-atlas-datagob-runtime@${PROJECT}.iam.gserviceaccount.com}"
DAYS="${DAYS:-14}"

for command in gcloud jq curl; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "ERROR: ${command} is required" >&2
    exit 1
  }
done

API_URL="$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
REVISION="$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"

if [[ -z "$API_URL" || -z "$REVISION" ]]; then
  echo "ERROR: preview API is not ready" >&2
  exit 1
fi

echo "=== F59 READ MODEL DIAGNOSTICS ==="
echo "PROJECT=${PROJECT}"
echo "SERVICE=${SERVICE}"
echo "REVISION=${REVISION}"
echo "API_URL=${API_URL}"
echo "RUNTIME_SA=${RUNTIME_SA}"
echo

echo "=== 1. EFFECTIVE CLOUD RUN SERVICE ACCOUNT ==="
gcloud run services describe "$SERVICE" \
  --project "$PROJECT" --region "$REGION" --format=json \
  | jq '{revision:.status.latestReadyRevisionName, serviceAccount:.spec.template.spec.serviceAccountName}'
echo

echo "=== 2. PROJECT IAM ROLES FOR RUNTIME SA ==="
gcloud projects get-iam-policy "$PROJECT" --format=json \
  | jq --arg member "serviceAccount:${RUNTIME_SA}" \
      '[.bindings[] | select(any(.members[]?; . == $member)) | .role] | sort'
echo

echo "=== 3. DIRECT READ MODEL RESPONSE ==="
BODY_FILE="$(mktemp /tmp/atlas-f59-read-model.XXXXXX.json)"
trap 'rm -f "$BODY_FILE"' EXIT
HTTP_CODE="$(curl -sS -o "$BODY_FILE" -w '%{http_code}' \
  -H 'X-ATLAS-USER: feature59.diagnostics@atlas.local' \
  -H 'X-ATLAS-ROLES: data_steward,committee_member' \
  "${API_URL}/agent-governance/overview?days=${DAYS}")"
echo "HTTP_CODE=${HTTP_CODE}"
if jq . "$BODY_FILE" >/dev/null 2>&1; then
  jq . "$BODY_FILE"
else
  cat "$BODY_FILE"
fi
echo

echo "=== 4. CLOUD RUN LOGS FOR READ MODEL (1h) ==="
gcloud logging read \
  "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE}\" AND (textPayload:\"AgentOps observability unavailable\" OR jsonPayload.message:\"AgentOps observability unavailable\" OR textPayload:\"bigquery.jobs.create\" OR jsonPayload.message:\"bigquery.jobs.create\")" \
  --project "$PROJECT" --freshness=1h --limit=50 \
  --format='table(timestamp,severity,textPayload,jsonPayload.message)' || true
echo

echo "=== 5. DIAGNOSIS HINT ==="
if grep -qi 'bigquery.jobs.create' "$BODY_FILE"; then
  echo "CONFIRMED: runtime identity lacks bigquery.jobs.create for query jobs."
  echo "Do not broaden dataset access. Use a query-job permission such as roles/bigquery.jobUser on the job project, preferably on a preview-dedicated runtime identity."
elif [[ "$HTTP_CODE" == "200" ]]; then
  echo "Read model is now healthy. The previous 503 was transient or configuration propagation related."
else
  echo "The exact 503 detail above identifies the next fix. Do not change IAM until the error is confirmed."
fi
