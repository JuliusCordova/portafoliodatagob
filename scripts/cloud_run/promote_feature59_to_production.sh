#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
AR_REPOSITORY="${AR_REPOSITORY:-atlas-datagob}"
API_SERVICE="${API_SERVICE:-atlas-datagob-api}"
WEB_SERVICE="${WEB_SERVICE:-atlas-datagob-web}"
AGENTOPS_DATASET="${ATLAS_AGENTOPS_DATASET:-agentops_prod}"
PRODUCTION_APPROVED="${ATLAS_PRODUCTION_APPROVED:-NO}"

for command in gcloud git jq python3 curl bq; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "ERROR: ${command} is required" >&2
    exit 1
  }
done

if [[ "$PRODUCTION_APPROVED" != "YES" ]]; then
  echo "ERROR: production promotion requires ATLAS_PRODUCTION_APPROVED=YES" >&2
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "main" ]]; then
  echo "ERROR: production promotion must run from main; current=${BRANCH:-detached}" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree must be clean before production promotion" >&2
  git status --short >&2
  exit 1
fi
if [[ "$AGENTOPS_DATASET" != "agentops_prod" ]]; then
  echo "ERROR: refusing unexpected production AgentOps dataset: ${AGENTOPS_DATASET}" >&2
  exit 1
fi
if [[ "$AGENTOPS_DATASET" == *preview* ]]; then
  echo "ERROR: refusing preview dataset in production promotion" >&2
  exit 1
fi

git fetch origin main --quiet
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  echo "ERROR: local main must exactly match origin/main" >&2
  echo "LOCAL_SHA=${LOCAL_SHA}" >&2
  echo "REMOTE_SHA=${REMOTE_SHA}" >&2
  exit 1
fi

SHA="$LOCAL_SHA"
SHORT_SHA="${SHA:0:7}"
TAG="prod-${SHORT_SHA}"
API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-api:${TAG}"
WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-web:${TAG}"

BUILD_CONFIG="$(mktemp /tmp/atlas-f59-prod-build.XXXXXX.yaml)"
API_BEFORE="$(mktemp /tmp/atlas-f59-prod-api-before.XXXXXX.json)"
WEB_BEFORE="$(mktemp /tmp/atlas-f59-prod-web-before.XXXXXX.json)"
DATASET_JSON="$(mktemp /tmp/atlas-f59-prod-dataset.XXXXXX.json)"
DATASET_UPDATED_JSON="$(mktemp /tmp/atlas-f59-prod-dataset-updated.XXXXXX.json)"
API_OVERVIEW="$(mktemp /tmp/atlas-f59-prod-overview.XXXXXX.json)"
WEB_OVERVIEW="$(mktemp /tmp/atlas-f59-prod-web-overview.XXXXXX.json)"
PROMOTION_STARTED=false
PROMOTION_COMPLETE=false

cleanup() {
  rm -f "$BUILD_CONFIG" "$API_BEFORE" "$WEB_BEFORE" "$DATASET_JSON" \
    "$DATASET_UPDATED_JSON" "$API_OVERVIEW" "$WEB_OVERVIEW"
}

rollback_traffic() {
  local api_revision="$1"
  local web_revision="$2"
  echo "=== F59 PRODUCTION · ROLLBACK TRAFFIC ===" >&2
  if [[ -n "$api_revision" ]]; then
    gcloud run services update-traffic "$API_SERVICE" \
      --project "$PROJECT" --region "$REGION" \
      --to-revisions="${api_revision}=100" >/dev/null || true
    echo "API_ROLLBACK_REVISION=${api_revision}" >&2
  fi
  if [[ -n "$web_revision" ]]; then
    gcloud run services update-traffic "$WEB_SERVICE" \
      --project "$PROJECT" --region "$REGION" \
      --to-revisions="${web_revision}=100" >/dev/null || true
    echo "WEB_ROLLBACK_REVISION=${web_revision}" >&2
  fi
  echo "NOTE: additive AgentOps dataset/IAM preparation is retained after traffic rollback." >&2
}

on_error() {
  local exit_code=$?
  if [[ "$PROMOTION_STARTED" == "true" && "$PROMOTION_COMPLETE" != "true" ]]; then
    rollback_traffic "${PREVIOUS_API_REVISION:-}" "${PREVIOUS_WEB_REVISION:-}"
  fi
  exit "$exit_code"
}
trap on_error ERR
trap cleanup EXIT

snapshot_service() {
  local service="$1"
  local target="$2"
  gcloud run services describe "$service" \
    --project "$PROJECT" --region "$REGION" --format=json > "$target"
  jq -e '(.status.traffic | length) == 1 and (.status.traffic[0].percent // 0) == 100' "$target" >/dev/null || {
    echo "ERROR: ${service} must have one 100% traffic target before governed promotion" >&2
    jq '.status.traffic' "$target" >&2
    return 1
  }
}

echo "=== F59 PRODUCTION · SNAPSHOT CURRENT SERVICES ==="
snapshot_service "$API_SERVICE" "$API_BEFORE"
snapshot_service "$WEB_SERVICE" "$WEB_BEFORE"
PREVIOUS_API_REVISION="$(jq -r '.status.traffic[0].revisionName // .status.latestReadyRevisionName' "$API_BEFORE")"
PREVIOUS_WEB_REVISION="$(jq -r '.status.traffic[0].revisionName // .status.latestReadyRevisionName' "$WEB_BEFORE")"
RUNTIME_SA="$(jq -r '.spec.template.spec.serviceAccountName // empty' "$API_BEFORE")"
if [[ -z "$RUNTIME_SA" ]]; then
  echo "ERROR: stable API has no explicit runtime service account" >&2
  exit 1
fi
printf 'SHA=%s\nPREVIOUS_API_REVISION=%s\nPREVIOUS_WEB_REVISION=%s\nRUNTIME_SA=%s\n' \
  "$SHA" "$PREVIOUS_API_REVISION" "$PREVIOUS_WEB_REVISION" "$RUNTIME_SA"

echo "=== F59 PRODUCTION · PREPARE AGENTOPS DATASET ==="
if ! bq --project_id="$PROJECT" --location="$REGION" show --dataset "${PROJECT}:${AGENTOPS_DATASET}" >/dev/null 2>&1; then
  bq --project_id="$PROJECT" --location="$REGION" mk --dataset "${PROJECT}:${AGENTOPS_DATASET}" >/dev/null
fi
sed \
  -e "s|\${PROJECT_ID}|${PROJECT}|g" \
  -e "s|\${DATASET}|${AGENTOPS_DATASET}|g" \
  data/agent_governance/bigquery_schema_v1.sql \
  | bq --project_id="$PROJECT" --location="$REGION" query --use_legacy_sql=false >/dev/null

for table in agent_runs agent_run_steps agent_llm_usage agent_artifacts agent_evaluation_evidence agent_alerts agent_health_snapshots agent_cost_attribution; do
  bq --project_id="$PROJECT" --location="$REGION" show "${PROJECT}:${AGENTOPS_DATASET}.${table}" >/dev/null
  echo "${table}=PASS"
done

echo "=== F59 PRODUCTION · GRANT DATASET-SCOPED ACCESS ==="
bq --project_id="$PROJECT" show --format=prettyjson "${PROJECT}:${AGENTOPS_DATASET}" > "$DATASET_JSON"
python3 - "$DATASET_JSON" "$DATASET_UPDATED_JSON" "$RUNTIME_SA" <<'PY'
import json, sys
from pathlib import Path
source, target, service_account = sys.argv[1:]
payload = json.loads(Path(source).read_text())
access = list(payload.get("access", []))
entry = {"role": "WRITER", "userByEmail": service_account}
if entry not in access:
    access.append(entry)
payload["access"] = access
Path(target).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY
bq --project_id="$PROJECT" update --source "$DATASET_UPDATED_JSON" "${PROJECT}:${AGENTOPS_DATASET}" >/dev/null
bq --project_id="$PROJECT" show --format=prettyjson "${PROJECT}:${AGENTOPS_DATASET}" \
  | jq -e --arg sa "$RUNTIME_SA" '.access | any(.role == "WRITER" and .userByEmail == $sa)' >/dev/null

echo "=== F59 PRODUCTION · ENSURE QUERY-JOB PERMISSION ==="
if ! gcloud projects get-iam-policy "$PROJECT" --format=json \
  | jq -e --arg member "serviceAccount:${RUNTIME_SA}" \
      '.bindings | any(.role == "roles/bigquery.jobUser" and (.members // [] | index($member)))' >/dev/null; then
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/bigquery.jobUser" \
    --condition=None >/dev/null
fi
gcloud projects get-iam-policy "$PROJECT" --format=json \
  | jq -e --arg member "serviceAccount:${RUNTIME_SA}" \
      '.bindings | any(.role == "roles/bigquery.jobUser" and (.members // [] | index($member)))' >/dev/null
echo "BIGQUERY_JOB_PERMISSION=PASS"

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

echo "=== F59 PRODUCTION · BUILD EXACT MAIN SHA ==="
echo "API_IMAGE=${API_IMAGE}"
echo "WEB_IMAGE=${WEB_IMAGE}"
gcloud builds submit . --project "$PROJECT" --config "$BUILD_CONFIG"

PROMOTION_STARTED=true

echo "=== F59 PRODUCTION · DEPLOY API ==="
gcloud run deploy "$API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$API_IMAGE" \
  --service-account "$RUNTIME_SA" \
  --update-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT},ATLAS_AGENTOPS_ENABLED=true,ATLAS_AGENTOPS_DATASET=${AGENTOPS_DATASET},ATLAS_AGENTOPS_LLM_USAGE_TABLE=${PROJECT}.${AGENTOPS_DATASET}.agent_llm_usage,ATLAS_ENVIRONMENT=production"

API_URL="$(gcloud run services describe "$API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
API_REVISION="$(gcloud run services describe "$API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"
API_RUNTIME_AFTER="$(gcloud run services describe "$API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(spec.template.spec.serviceAccountName)')"
if [[ "$API_RUNTIME_AFTER" != "$RUNTIME_SA" ]]; then
  echo "ERROR: production API runtime identity changed unexpectedly" >&2
  exit 1
fi
curl -fsS "$API_URL/health" | jq -e '.status == "ok"' >/dev/null
curl -fsS \
  -H 'X-ATLAS-USER: feature59.production.gate@atlas.local' \
  -H 'X-ATLAS-ROLES: viewer' \
  "$API_URL/agent-governance/overview?days=14" > "$API_OVERVIEW"
jq -e --arg table "${PROJECT}.${AGENTOPS_DATASET}.agent_llm_usage" '
  .agent_system_id == "ATLAS-DATAGOB"
  and .source.table == $table
  and .source.run_lifecycle_instrumented == false
  and (.artifacts | type == "array")
  and (.alerts | type == "array")
' "$API_OVERVIEW" >/dev/null

echo "=== F59 PRODUCTION · DEPLOY WEB ==="
gcloud run deploy "$WEB_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$WEB_IMAGE"

WEB_URL="$(gcloud run services describe "$WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
WEB_REVISION="$(gcloud run services describe "$WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"
PAGE_STATUS="$(curl -sS -o /tmp/atlas-f59-prod-page.html -w '%{http_code}' "$WEB_URL/agent-governance")"
rm -f /tmp/atlas-f59-prod-page.html
if [[ "$PAGE_STATUS" != "200" ]]; then
  echo "ERROR: production /agent-governance returned HTTP ${PAGE_STATUS}" >&2
  exit 1
fi
curl -fsS "$WEB_URL/api/agent-governance/overview?days=14" > "$WEB_OVERVIEW"
jq -e --arg table "${PROJECT}.${AGENTOPS_DATASET}.agent_llm_usage" '
  .agent_system_id == "ATLAS-DATAGOB"
  and .source.table == $table
  and (.artifacts | type == "array")
  and (.alerts | type == "array")
' "$WEB_OVERVIEW" >/dev/null

PROMOTION_COMPLETE=true
trap - ERR

echo
echo "=== FEATURE 59 PRODUCTION PROMOTION: CONFORME ==="
echo "SHA=${SHA}"
echo "API_URL=${API_URL}"
echo "API_REVISION=${API_REVISION}"
echo "WEB_URL=${WEB_URL}"
echo "WEB_REVISION=${WEB_REVISION}"
echo "AGENT_GOVERNANCE_URL=${WEB_URL}/agent-governance"
echo "AGENTOPS_DATASET=${PROJECT}.${AGENTOPS_DATASET}"
echo "RUNTIME_SA=${RUNTIME_SA}"
echo "PREVIOUS_API_REVISION=${PREVIOUS_API_REVISION}"
echo "PREVIOUS_WEB_REVISION=${PREVIOUS_WEB_REVISION}"
echo "MAIN_SHA_EXACT=PASS"
echo "AGENTOPS_SCHEMA=PASS"
echo "DATASET_SCOPED_ACCESS=PASS"
echo "BIGQUERY_JOB_PERMISSION=PASS"
echo "RUNTIME_IDENTITY_UNCHANGED=PASS"
echo "AGENT_GOVERNANCE_API=PASS"
echo "AGENT_GOVERNANCE_WEB=PASS"
echo "PRODUCTION_PROMOTION=PASS"
echo
echo "Rollback commands if a later manual visual check requires reversal:"
echo "gcloud run services update-traffic ${API_SERVICE} --project ${PROJECT} --region ${REGION} --to-revisions=${PREVIOUS_API_REVISION}=100"
echo "gcloud run services update-traffic ${WEB_SERVICE} --project ${PROJECT} --region ${REGION} --to-revisions=${PREVIOUS_WEB_REVISION}=100"
