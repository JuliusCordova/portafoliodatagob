#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
AR_REPOSITORY="${AR_REPOSITORY:-atlas-datagob}"
PREVIEW_API_SERVICE="${PREVIEW_API_SERVICE:-atlas-datagob-api-f59-preview}"
PREVIEW_WEB_SERVICE="${PREVIEW_WEB_SERVICE:-atlas-datagob-web-f59-preview}"
STABLE_API_SERVICE="${STABLE_API_SERVICE:-atlas-datagob-api}"
STABLE_WEB_SERVICE="${STABLE_WEB_SERVICE:-atlas-datagob-web}"
EXPECTED_PREVIEW_SA="${EXPECTED_PREVIEW_SA:-atlas-f59-runtime-preview@${PROJECT}.iam.gserviceaccount.com}"

for command in gcloud git curl jq; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "ERROR: ${command} is required" >&2
    exit 1
  }
done

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "feature/59-reusable-agent-governance-agentops" ]]; then
  echo "ERROR: expected F59 branch, current=${BRANCH:-detached}" >&2
  exit 1
fi

# Next.js may rewrite only next-env.d.ts during a successful local verify.
# Restore that generated-only change, but keep the guardrail strict for anything else.
PORCELAIN="$(git status --porcelain)"
if [[ -n "$PORCELAIN" ]]; then
  if [[ "$PORCELAIN" == " M apps/web/next-env.d.ts" ]]; then
    echo "Restoring generated apps/web/next-env.d.ts before evidence preview deploy"
    git restore apps/web/next-env.d.ts
  else
    echo "ERROR: working tree must be clean before F59 evidence preview deploy" >&2
    git status --short >&2
    exit 1
  fi
fi

SHA="$(git rev-parse HEAD)"
SHORT_SHA="${SHA:0:7}"
TAG="f59-evidence-${SHORT_SHA}"
API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-api:${TAG}"
WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-web:${TAG}"

BUILD_CONFIG="$(mktemp /tmp/atlas-f59-evidence-cloudbuild.XXXXXX.yaml)"
STABLE_API_BEFORE="$(mktemp /tmp/atlas-f59-evidence-api-before.XXXXXX.json)"
STABLE_API_AFTER="$(mktemp /tmp/atlas-f59-evidence-api-after.XXXXXX.json)"
STABLE_WEB_BEFORE="$(mktemp /tmp/atlas-f59-evidence-web-before.XXXXXX.json)"
STABLE_WEB_AFTER="$(mktemp /tmp/atlas-f59-evidence-web-after.XXXXXX.json)"
cleanup() {
  rm -f "$BUILD_CONFIG" "$STABLE_API_BEFORE" "$STABLE_API_AFTER" "$STABLE_WEB_BEFORE" "$STABLE_WEB_AFTER"
}
trap cleanup EXIT

snapshot_service() {
  local service="$1"
  local target="$2"
  gcloud run services describe "$service" \
    --project "$PROJECT" --region "$REGION" --format=json \
    | jq '{url:.status.url, latestReadyRevisionName:.status.latestReadyRevisionName, latestCreatedRevisionName:.status.latestCreatedRevisionName}' \
    > "$target"
}

PREVIEW_SA="$(gcloud run services describe "$PREVIEW_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(spec.template.spec.serviceAccountName)')"
if [[ "$PREVIEW_SA" != "$EXPECTED_PREVIEW_SA" ]]; then
  echo "ERROR: preview API is not using the isolated F59 runtime identity: ${PREVIEW_SA}" >&2
  exit 1
fi

snapshot_service "$STABLE_API_SERVICE" "$STABLE_API_BEFORE"
snapshot_service "$STABLE_WEB_SERVICE" "$STABLE_WEB_BEFORE"

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

echo "=== F59 EVIDENCE · BUILD API + WEB ==="
echo "SHA=${SHA}"
gcloud builds submit . --project "$PROJECT" --config "$BUILD_CONFIG"

echo "=== F59 EVIDENCE · DEPLOY API PREVIEW ==="
gcloud run deploy "$PREVIEW_API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$API_IMAGE" \
  --service-account "$EXPECTED_PREVIEW_SA" \
  --allow-unauthenticated

API_URL="$(gcloud run services describe "$PREVIEW_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
API_REV="$(gcloud run services describe "$PREVIEW_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"

OVERVIEW="$(curl -fsS \
  -H 'X-ATLAS-USER: feature59.evidence@atlas.local' \
  -H 'X-ATLAS-ROLES: viewer' \
  "$API_URL/agent-governance/overview?days=14")"

echo "$OVERVIEW" | jq '{agent_system_id, period_days, artifact_count:(.artifacts|length), alert_count:(.alerts|length), source}'
echo "$OVERVIEW" | jq -e '
  .agent_system_id == "ATLAS-DATAGOB"
  and (.artifacts | type) == "array"
  and (.alerts | type) == "array"
  and .source.artifact_semantics == "persisted_artifacts_linked_to_llm_observed_runs"
  and .source.alert_semantics == "persisted_alerts_for_agent_system_or_observed_runs"
' >/dev/null

echo "=== F59 EVIDENCE · DEPLOY WEB PREVIEW ==="
gcloud run deploy "$PREVIEW_WEB_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$WEB_IMAGE" \
  --allow-unauthenticated

WEB_URL="$(gcloud run services describe "$PREVIEW_WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
WEB_REV="$(gcloud run services describe "$PREVIEW_WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"

PAGE_STATUS="$(curl -sS -o /tmp/atlas-f59-evidence-page.html -w '%{http_code}' "$WEB_URL/agent-governance")"
rm -f /tmp/atlas-f59-evidence-page.html
if [[ "$PAGE_STATUS" != "200" ]]; then
  echo "ERROR: /agent-governance returned HTTP ${PAGE_STATUS}" >&2
  exit 1
fi

WEB_OVERVIEW="$(curl -fsS "$WEB_URL/api/agent-governance/overview?days=14")"
echo "$WEB_OVERVIEW" | jq -e '(.artifacts | type) == "array" and (.alerts | type) == "array"' >/dev/null

snapshot_service "$STABLE_API_SERVICE" "$STABLE_API_AFTER"
snapshot_service "$STABLE_WEB_SERVICE" "$STABLE_WEB_AFTER"
if ! diff -u "$STABLE_API_BEFORE" "$STABLE_API_AFTER"; then
  echo "ERROR: stable API changed during F59 evidence preview deployment" >&2
  exit 1
fi
if ! diff -u "$STABLE_WEB_BEFORE" "$STABLE_WEB_AFTER"; then
  echo "ERROR: stable Web changed during F59 evidence preview deployment" >&2
  exit 1
fi

echo
echo "=== FEATURE 59 ARTIFACTS + ALERTS PREVIEW: CONFORME ==="
echo "SHA=${SHA}"
echo "API_REVISION=${API_REV}"
echo "WEB_REVISION=${WEB_REV}"
echo "AGENT_GOVERNANCE_URL=${WEB_URL}/agent-governance"
echo "ARTIFACT_COUNT=$(jq '.artifacts|length' <<<"$OVERVIEW")"
echo "ALERT_COUNT=$(jq '.alerts|length' <<<"$OVERVIEW")"
echo "RUNTIME_IDENTITY_ISOLATION=PASS"
echo "ARTIFACTS_READ_MODEL=PASS"
echo "ALERTS_READ_MODEL=PASS"
echo "AGENT_GOVERNANCE_WEB=PASS"
echo "STABLE_API_UNCHANGED=PASS"
echo "STABLE_WEB_UNCHANGED=PASS"
