#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
AR_REPOSITORY="${AR_REPOSITORY:-atlas-datagob}"
RUNTIME_SA="${RUNTIME_SA:-atlas-datagob-runtime@${PROJECT}.iam.gserviceaccount.com}"
API_SERVICE="${API_SERVICE:-atlas-datagob-api-f56-preview}"
WEB_SERVICE="${WEB_SERVICE:-atlas-datagob-web-f56-preview}"
GOVERNANCE_BUCKET="${GOVERNANCE_BUCKET:-atlas-datagob-governance-${PROJECT}}"
GOVERNANCE_PREFIX="${GOVERNANCE_PREFIX:-atlas-governance}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud is required" >&2
  exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required" >&2
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "feature/56-adk-agent-governance-spec" ]]; then
  echo "ERROR: expected feature/56-adk-agent-governance-spec, current=${BRANCH:-detached}" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree must be clean before preview build" >&2
  git status --short >&2
  exit 1
fi

SHA="$(git rev-parse HEAD)"
SHORT_SHA="${SHA:0:7}"
TAG="f56-preview-${SHORT_SHA}"
API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-api:${TAG}"
WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-web:${TAG}"

BUILD_CONFIG="$(mktemp /tmp/atlas-f56-cloudbuild.XXXXXX.yaml)"
cleanup() { rm -f "$BUILD_CONFIG"; }
trap cleanup EXIT

cat > "$BUILD_CONFIG" <<YAML
steps:
  - name: gcr.io/cloud-builders/docker
    args: ["build", "-f", "apps/api/Dockerfile", "-t", "${API_IMAGE}", "."]
  - name: gcr.io/cloud-builders/docker
    args: ["build", "-f", "apps/web/Dockerfile", "-t", "${WEB_IMAGE}", "apps/web"]
images:
  - "${API_IMAGE}"
  - "${WEB_IMAGE}"
YAML

echo "=== ATLAS FEATURE 56 · PREVIEW BUILD ==="
echo "SHA=${SHA}"
echo "API_IMAGE=${API_IMAGE}"
echo "WEB_IMAGE=${WEB_IMAGE}"

gcloud builds submit . \
  --project "$PROJECT" \
  --config "$BUILD_CONFIG"

echo "=== DEPLOY API PREVIEW ==="
gcloud run deploy "$API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$API_IMAGE" \
  --service-account "$RUNTIME_SA" \
  --allow-unauthenticated \
  --set-env-vars "ATLAS_AUTH_MODE=header,ATLAS_DEMAND_REPOSITORY=firestore,ATLAS_FIRESTORE_PROJECT=${PROJECT},ATLAS_FIRESTORE_DATABASE=(default),ATLAS_FIRESTORE_COLLECTION=atlas_demands_f56_preview,GOOGLE_CLOUD_PROJECT=${PROJECT},GOOGLE_CLOUD_LOCATION=${REGION},ATLAS_AGENT_DISCOVERY_PROJECT=${PROJECT},ATLAS_AGENT_DISCOVERY_LOCATION=${REGION},ATLAS_AGENT_DEPLOYMENTS_COLLECTION=atlas_agent_deployments_f56_preview,ATLAS_AGENTS_COLLECTION=atlas_agents_f56_preview,ATLAS_AGENT_BINDINGS_COLLECTION=atlas_agent_deployment_bindings_f56_preview,ATLAS_AGENT_GOVERNANCE_COLLECTION=atlas_agent_governance_f56_preview,ATLAS_AGENT_GOVERNANCE_EVENTS_COLLECTION=atlas_agent_governance_events_f56_preview,ATLAS_AGENT_FINDINGS_COLLECTION=atlas_agent_findings_f56_preview,ATLAS_GOVERNANCE_BUCKET=${GOVERNANCE_BUCKET},ATLAS_GOVERNANCE_PREFIX=${GOVERNANCE_PREFIX},ATLAS_GOVERNANCE_REQUIRE_GCS=true"

API_URL="$(gcloud run services describe "$API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
if [[ -z "$API_URL" ]]; then
  echo "ERROR: API preview URL not resolved" >&2
  exit 1
fi

echo "=== API HEALTH + DISCOVERY ==="
curl -fsS "$API_URL/health" | jq .

AUTH_HEADERS=(
  -H 'X-ATLAS-USER: feature56.preview@atlas.local'
  -H 'X-ATLAS-ROLES: data_steward,data_architect,executive'
)

curl -fsS "${AUTH_HEADERS[@]}" "$API_URL/agent-governance/summary" | jq .
REFRESH_JSON="$(curl -fsS -X POST "${AUTH_HEADERS[@]}" "$API_URL/agent-governance/discovery/refresh")"
echo "$REFRESH_JSON" | jq .
TOTAL_ADK="$(jq -r '.total_google_adk // 0' <<<"$REFRESH_JSON")"
if [[ "$TOTAL_ADK" -lt 1 ]]; then
  echo "ERROR: preview discovery returned no Google ADK deployments" >&2
  exit 1
fi

DEPLOYMENTS_JSON="$(curl -fsS "${AUTH_HEADERS[@]}" "$API_URL/agent-governance/deployments")"
echo "$DEPLOYMENTS_JSON" | jq '{count, first: (.deployments[0] // null)}'
DEPLOYMENT_COUNT="$(jq -r '.count // 0' <<<"$DEPLOYMENTS_JSON")"
if [[ "$DEPLOYMENT_COUNT" != "$TOTAL_ADK" ]]; then
  echo "ERROR: persisted deployment count ${DEPLOYMENT_COUNT} != discovery ${TOTAL_ADK}" >&2
  exit 1
fi

echo "=== DEPLOY WEB PREVIEW ==="
gcloud run deploy "$WEB_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$WEB_IMAGE" \
  --allow-unauthenticated \
  --set-env-vars "ATLAS_INTERNAL_API_BASE=${API_URL},ATLAS_WEB_IDENTITY_MODE=static,ATLAS_WEB_DEMO_USER=feature56.preview@atlas.local,ATLAS_WEB_DEMO_ROLES=data_steward,data_architect,executive"

WEB_URL="$(gcloud run services describe "$WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
if [[ -z "$WEB_URL" ]]; then
  echo "ERROR: Web preview URL not resolved" >&2
  exit 1
fi

HTTP_CODE="$(curl -sS -o /tmp/atlas-f56-web.html -w '%{http_code}' "$WEB_URL/agent-governance")"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "ERROR: /agent-governance returned HTTP ${HTTP_CODE}" >&2
  exit 1
fi

PROXY_SUMMARY="$(curl -fsS "$WEB_URL/api/agent-governance/summary")"
PROXY_DEPLOYMENTS="$(jq -r '.deployments_adk // 0' <<<"$PROXY_SUMMARY")"
if [[ "$PROXY_DEPLOYMENTS" != "$TOTAL_ADK" ]]; then
  echo "ERROR: Web -> API proxy summary mismatch: ${PROXY_DEPLOYMENTS} != ${TOTAL_ADK}" >&2
  exit 1
fi

echo
echo "=== FEATURE 56 PREVIEW: CONFORME ==="
echo "SHA=${SHA}"
echo "API_URL=${API_URL}"
echo "WEB_URL=${WEB_URL}"
echo "AGENT_GOVERNANCE_URL=${WEB_URL}/agent-governance"
echo "GOOGLE_ADK_DEPLOYMENTS=${TOTAL_ADK}"
echo "PREVIEW_COLLECTIONS=atlas_*_f56_preview"
echo "STABLE_SERVICES_UNCHANGED=atlas-datagob-api,atlas-datagob-web"
