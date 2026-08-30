#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
AR_REPOSITORY="${AR_REPOSITORY:-atlas-datagob}"
STABLE_API_SERVICE="${STABLE_API_SERVICE:-atlas-datagob-api}"
STABLE_WEB_SERVICE="${STABLE_WEB_SERVICE:-atlas-datagob-web}"
PREVIEW_API_SERVICE="${PREVIEW_API_SERVICE:-atlas-datagob-api-f59-preview}"
PREVIEW_WEB_SERVICE="${PREVIEW_WEB_SERVICE:-atlas-datagob-web-f59-preview}"
PREVIEW_RUNTIME_SA_NAME="${PREVIEW_RUNTIME_SA_NAME:-atlas-f59-runtime-preview}"
PREVIEW_RUNTIME_SA="${PREVIEW_RUNTIME_SA:-${PREVIEW_RUNTIME_SA_NAME}@${PROJECT}.iam.gserviceaccount.com}"
PREVIEW_GOVERNANCE_BUCKET="${PREVIEW_GOVERNANCE_BUCKET:-atlas-datagob-f59-preview-${PROJECT}}"
AGENTOPS_DATASET="${ATLAS_AGENTOPS_DATASET:-agentops_f59_preview}"
PREVIEW_DEMAND_COLLECTION="${PREVIEW_DEMAND_COLLECTION:-atlas_demands_f59_preview}"

for command in gcloud git jq python3 curl bq; do
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
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree must be clean before F59 isolated preview build" >&2
  git status --short >&2
  exit 1
fi
if [[ ! "$AGENTOPS_DATASET" =~ _preview$ ]]; then
  echo "ERROR: refusing non-preview AgentOps dataset: ${AGENTOPS_DATASET}" >&2
  exit 1
fi
if [[ "$PREVIEW_RUNTIME_SA_NAME" != *f59* || "$PREVIEW_RUNTIME_SA_NAME" != *preview* ]]; then
  echo "ERROR: preview runtime SA name must contain both f59 and preview: ${PREVIEW_RUNTIME_SA_NAME}" >&2
  exit 1
fi
if [[ "$PREVIEW_GOVERNANCE_BUCKET" != *f59* || "$PREVIEW_GOVERNANCE_BUCKET" != *preview* ]]; then
  echo "ERROR: preview governance bucket must contain both f59 and preview: ${PREVIEW_GOVERNANCE_BUCKET}" >&2
  exit 1
fi
if ! bq --project_id="$PROJECT" --location="$REGION" show --dataset "${PROJECT}:${AGENTOPS_DATASET}" >/dev/null 2>&1; then
  echo "ERROR: AgentOps preview dataset does not exist: ${PROJECT}:${AGENTOPS_DATASET}" >&2
  exit 1
fi

SHA="$(git rev-parse HEAD)"
SHORT_SHA="${SHA:0:7}"
TAG="f59-preview-${SHORT_SHA}"
PREVIEW_GOVERNANCE_PREFIX="${PREVIEW_GOVERNANCE_PREFIX:-atlas-governance-f59/${SHA}}"
API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-api:${TAG}"
WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-web:${TAG}"

BUILD_CONFIG="$(mktemp /tmp/atlas-f59-isolated-cloudbuild.XXXXXX.yaml)"
STABLE_API_JSON="$(mktemp /tmp/atlas-f59-isolated-stable-api.XXXXXX.json)"
PREVIEW_ENV_FILE="$(mktemp /tmp/atlas-f59-isolated-api-env.XXXXXX.yaml)"
WEB_ENV_FILE="$(mktemp /tmp/atlas-f59-isolated-web-env.XXXXXX.yaml)"
DATASET_JSON="$(mktemp /tmp/atlas-f59-isolated-dataset.XXXXXX.json)"
DATASET_UPDATED_JSON="$(mktemp /tmp/atlas-f59-isolated-dataset-updated.XXXXXX.json)"
STABLE_API_BEFORE="$(mktemp /tmp/atlas-f59-stable-api-before.XXXXXX.json)"
STABLE_API_AFTER="$(mktemp /tmp/atlas-f59-stable-api-after.XXXXXX.json)"
STABLE_WEB_BEFORE="$(mktemp /tmp/atlas-f59-stable-web-before.XXXXXX.json)"
STABLE_WEB_AFTER="$(mktemp /tmp/atlas-f59-stable-web-after.XXXXXX.json)"
STABLE_GOV_BEFORE="$(mktemp /tmp/atlas-f59-stable-gov-before.XXXXXX.json)"
STABLE_GOV_AFTER="$(mktemp /tmp/atlas-f59-stable-gov-after.XXXXXX.json)"
SMOKE_RESPONSE="$(mktemp /tmp/atlas-f59-isolated-smoke.XXXXXX.json)"
cleanup() {
  rm -f "$BUILD_CONFIG" "$STABLE_API_JSON" "$PREVIEW_ENV_FILE" "$WEB_ENV_FILE" \
    "$DATASET_JSON" "$DATASET_UPDATED_JSON" "$STABLE_API_BEFORE" "$STABLE_API_AFTER" \
    "$STABLE_WEB_BEFORE" "$STABLE_WEB_AFTER" "$STABLE_GOV_BEFORE" "$STABLE_GOV_AFTER" "$SMOKE_RESPONSE"
}
trap cleanup EXIT

service_snapshot() {
  local service="$1"
  local target="$2"
  gcloud run services describe "$service" \
    --project "$PROJECT" --region "$REGION" --format=json \
    | jq '{url:.status.url, latestReadyRevisionName:.status.latestReadyRevisionName, latestCreatedRevisionName:.status.latestCreatedRevisionName}' \
    > "$target"
}

object_snapshot() {
  local bucket="$1"
  local prefix="$2"
  local target="$3"
  python3 - "$bucket" "$prefix" "$target" <<'PY'
import json, subprocess, sys
from pathlib import Path
bucket, prefix, target = sys.argv[1:]
out = {}
for kind in ("policies", "architecture_patterns"):
    uri = f"gs://{bucket}/{prefix}/{kind}/catalog.json"
    raw = subprocess.check_output(["gcloud", "storage", "objects", "describe", uri, "--format=json"], text=True)
    payload = json.loads(raw)
    out[kind] = {
        "uri": uri,
        "generation": str(payload.get("generation", "")),
        "metageneration": str(payload.get("metageneration", "")),
        "crc32c": payload.get("crc32c"),
        "md5Hash": payload.get("md5Hash"),
        "size": str(payload.get("size", "")),
    }
Path(target).write_text(json.dumps(out, sort_keys=True, indent=2) + "\n", encoding="utf-8")
PY
}

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

echo "=== F59 ISOLATED · SNAPSHOT STABLE SERVICES ==="
service_snapshot "$STABLE_API_SERVICE" "$STABLE_API_BEFORE"
service_snapshot "$STABLE_WEB_SERVICE" "$STABLE_WEB_BEFORE"
cat "$STABLE_API_BEFORE" | jq .
cat "$STABLE_WEB_BEFORE" | jq .

echo "=== F59 ISOLATED · RESOLVE STABLE CONFIG READ-ONLY ==="
gcloud run services describe "$STABLE_API_SERVICE" \
  --project "$PROJECT" --region "$REGION" --format=json > "$STABLE_API_JSON"
readarray -t STABLE_GOVERNANCE < <(python3 - "$STABLE_API_JSON" <<'PY'
import json, sys
from pathlib import Path
payload = json.loads(Path(sys.argv[1]).read_text())
containers = payload.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
if not containers:
    raise SystemExit("ERROR: stable API has no container spec")
env = {e.get("name"): str(e.get("value", "")) for e in containers[0].get("env", []) if e.get("name")}
for key in ("ATLAS_GOVERNANCE_BUCKET", "ATLAS_GOVERNANCE_PREFIX"):
    if not env.get(key):
        raise SystemExit(f"ERROR: stable API missing {key}")
print(env["ATLAS_GOVERNANCE_BUCKET"])
print(env["ATLAS_GOVERNANCE_PREFIX"])
PY
)
STABLE_GOV_BUCKET="${STABLE_GOVERNANCE[0]}"
STABLE_GOV_PREFIX="${STABLE_GOVERNANCE[1]}"
echo "STABLE_GOVERNANCE_SOURCE=gs://${STABLE_GOV_BUCKET}/${STABLE_GOV_PREFIX} (copy source only)"
object_snapshot "$STABLE_GOV_BUCKET" "$STABLE_GOV_PREFIX" "$STABLE_GOV_BEFORE"
cat "$STABLE_GOV_BEFORE" | jq .

echo "=== F59 ISOLATED · CREATE / REUSE PREVIEW RUNTIME IDENTITY ==="
if ! gcloud iam service-accounts describe "$PREVIEW_RUNTIME_SA" --project "$PROJECT" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$PREVIEW_RUNTIME_SA_NAME" \
    --project "$PROJECT" \
    --display-name "ATLAS F59 AgentOps Preview Runtime"
fi
for role in roles/aiplatform.user roles/datastore.user roles/bigquery.jobUser; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${PREVIEW_RUNTIME_SA}" \
    --role="$role" \
    --condition=None >/dev/null
done

echo "=== F59 ISOLATED · CREATE / REUSE PREVIEW GOVERNANCE BUCKET ==="
if ! gcloud storage buckets describe "gs://${PREVIEW_GOVERNANCE_BUCKET}" --format='value(name)' >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${PREVIEW_GOVERNANCE_BUCKET}" \
    --project "$PROJECT" \
    --location "$REGION" \
    --uniform-bucket-level-access
fi
gcloud storage buckets add-iam-policy-binding "gs://${PREVIEW_GOVERNANCE_BUCKET}" \
  --member="serviceAccount:${PREVIEW_RUNTIME_SA}" \
  --role="roles/storage.objectViewer" >/dev/null

for kind in policies architecture_patterns; do
  source_uri="gs://${STABLE_GOV_BUCKET}/${STABLE_GOV_PREFIX}/${kind}/catalog.json"
  target_uri="gs://${PREVIEW_GOVERNANCE_BUCKET}/${PREVIEW_GOVERNANCE_PREFIX}/${kind}/catalog.json"
  if gcloud storage objects describe "$target_uri" --format='value(generation)' >/dev/null 2>&1; then
    echo "Preview governance snapshot already exists; reusing immutable copy: ${target_uri}"
  else
    gcloud storage cp "$source_uri" "$target_uri"
  fi
done

echo "=== F59 ISOLATED · GRANT DATASET ACCESS TO PREVIEW IDENTITY ==="
bq --project_id="$PROJECT" show --format=prettyjson "${PROJECT}:${AGENTOPS_DATASET}" > "$DATASET_JSON"
python3 - "$DATASET_JSON" "$DATASET_UPDATED_JSON" "$PREVIEW_RUNTIME_SA" <<'PY'
import json, sys
from pathlib import Path
source, target, service_account = sys.argv[1:]
payload = json.loads(Path(source).read_text())
access = list(payload.get("access", []))
entry = {"role": "WRITER", "userByEmail": service_account}
if entry not in access:
    access.append(entry)
payload["access"] = access
Path(target).write_text(json.dumps(payload, indent=2) + "\n")
PY
bq --project_id="$PROJECT" update --source "$DATASET_UPDATED_JSON" "${PROJECT}:${AGENTOPS_DATASET}" >/dev/null
bq --project_id="$PROJECT" show --format=prettyjson "${PROJECT}:${AGENTOPS_DATASET}" \
  | jq -e --arg sa "$PREVIEW_RUNTIME_SA" '.access | any(.role == "WRITER" and .userByEmail == $sa)' >/dev/null

echo "=== F59 ISOLATED · VERIFY MINIMUM RUNTIME IAM ==="
PROJECT_ROLES="$(gcloud projects get-iam-policy "$PROJECT" --format=json \
  | jq -c --arg member "serviceAccount:${PREVIEW_RUNTIME_SA}" '[.bindings[] | select(.members // [] | index($member)) | .role] | unique | sort')"
echo "$PROJECT_ROLES" | jq .
for role in roles/aiplatform.user roles/datastore.user roles/bigquery.jobUser; do
  if ! jq -e --arg role "$role" 'index($role) != null' <<<"$PROJECT_ROLES" >/dev/null; then
    echo "ERROR: preview runtime identity missing required role ${role}" >&2
    exit 1
  fi
done

# Official BigQuery query jobs require bigquery.jobs.create; bigquery.jobUser is the
# smallest predefined project role used here to supply that permission.
echo "PREVIEW_RUNTIME_SA=${PREVIEW_RUNTIME_SA}"
echo "BIGQUERY_QUERY_JOB_ROLE=roles/bigquery.jobUser"

echo "=== F59 ISOLATED · BUILD API + WEB ==="
echo "SHA=${SHA}"
echo "API_IMAGE=${API_IMAGE}"
echo "WEB_IMAGE=${WEB_IMAGE}"
gcloud builds submit . --project "$PROJECT" --config "$BUILD_CONFIG"

python3 - "$STABLE_API_JSON" "$PREVIEW_ENV_FILE" "$PROJECT" "$REGION" "$PREVIEW_GOVERNANCE_BUCKET" "$PREVIEW_GOVERNANCE_PREFIX" "$AGENTOPS_DATASET" "$PREVIEW_DEMAND_COLLECTION" <<'PY'
from __future__ import annotations
import json, sys
from pathlib import Path
source_path, target_path, project, region, gov_bucket, gov_prefix, dataset, demand_collection = sys.argv[1:]
payload = json.loads(Path(source_path).read_text())
containers = payload.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
if not containers:
    raise SystemExit("ERROR: stable API has no container spec")
env = {}
for item in containers[0].get("env", []):
    name = item.get("name")
    if name and "value" in item:
        env[name] = str(item["value"])
required = ["ATLAS_ADK_SESSION_BACKEND", "ATLAS_ADK_REQUIRE_DURABLE_SESSIONS", "GOOGLE_CLOUD_AGENT_ENGINE_ID"]
missing = [name for name in required if not env.get(name)]
if missing:
    raise SystemExit(f"ERROR: stable API missing required ADK env vars: {missing}")
preview = dict(env)
preview.update({
    "ATLAS_AUTH_MODE": "header",
    "ATLAS_DEMAND_REPOSITORY": "firestore",
    "ATLAS_FIRESTORE_PROJECT": project,
    "ATLAS_FIRESTORE_DATABASE": env.get("ATLAS_FIRESTORE_DATABASE", "(default)"),
    "ATLAS_FIRESTORE_COLLECTION": demand_collection,
    "ATLAS_GOVERNANCE_BUCKET": gov_bucket,
    "ATLAS_GOVERNANCE_PREFIX": gov_prefix,
    "ATLAS_GOVERNANCE_REQUIRE_GCS": "true",
    "GOOGLE_CLOUD_PROJECT": env.get("GOOGLE_CLOUD_PROJECT", project),
    "GOOGLE_CLOUD_LOCATION": env.get("GOOGLE_CLOUD_LOCATION", region),
    "GOOGLE_GENAI_USE_VERTEXAI": "true",
    "ATLAS_AGENTOPS_ENABLED": "true",
    "ATLAS_AGENTOPS_DATASET": dataset,
    "ATLAS_AGENTOPS_LLM_USAGE_TABLE": f"{project}.{dataset}.agent_llm_usage",
    "ATLAS_ENVIRONMENT": "preview",
    "ATLAS_ALLOWED_ORIGINS": "https://*.run.app",
    "ATLAS_ALLOWED_ORIGIN_REGEX": r"https://.*\.run\.app",
})
def q(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)
Path(target_path).write_text("".join(f"{key}: {q(value)}\n" for key, value in sorted(preview.items())), encoding="utf-8")
PY

echo "=== F59 ISOLATED · DEPLOY API PREVIEW ==="
gcloud run deploy "$PREVIEW_API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$API_IMAGE" \
  --service-account "$PREVIEW_RUNTIME_SA" \
  --allow-unauthenticated \
  --env-vars-file "$PREVIEW_ENV_FILE"
API_URL="$(gcloud run services describe "$PREVIEW_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
API_REV="$(gcloud run services describe "$PREVIEW_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"
[[ -n "$API_URL" && -n "$API_REV" ]] || { echo "ERROR: isolated F59 API did not become ready" >&2; exit 1; }
curl -fsS "$API_URL/health" | jq .

SMOKE_USER="feature59.isolated.$(date -u +%Y%m%d%H%M%S)@atlas.local"
SMOKE_START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=== F59 ISOLATED · REAL GEMINI ADK TELEMETRY SMOKE ==="
curl -fsS -X POST \
  -H 'Content-Type: application/json' \
  -H "X-ATLAS-USER: ${SMOKE_USER}" \
  -H 'X-ATLAS-ROLES: data_steward,committee_member' \
  "$API_URL/intake/conversation" \
  -d '{"message":"Necesitamos un dashboard ejecutivo para visualizar ventas y margen. Los datos provienen de BigQuery, son propiedad del área Comercial, se actualizan diariamente, tienen controles de calidad aprobados, acceso autorizado y no contienen datos sensibles."}' \
  > "$SMOKE_RESPONSE"
jq '{session_id, project_classification, specialist_activity, agent_trace}' "$SMOKE_RESPONSE"

sleep 5
TELEMETRY_JSON="$(bq --project_id="$PROJECT" --location="$REGION" query --use_legacy_sql=false --format=json \
  "SELECT agent_system_id, run_id, trace_id, agent_id, model_name, input_tokens, output_tokens, total_tokens, latency_ms, status, requested_by, observed_at
   FROM \`${PROJECT}.${AGENTOPS_DATASET}.agent_llm_usage\`
   WHERE requested_by = '${SMOKE_USER}' AND observed_at >= TIMESTAMP('${SMOKE_START}')
   ORDER BY observed_at")"
echo "$TELEMETRY_JSON" | jq .
ROW_COUNT="$(jq 'length' <<<"$TELEMETRY_JSON")"
[[ "$ROW_COUNT" -ge 2 ]] || { echo "ERROR: expected real AgentOps telemetry rows; got ${ROW_COUNT}" >&2; exit 1; }
UNIQUE_RUNS="$(jq '[.[].run_id] | unique | length' <<<"$TELEMETRY_JSON")"
[[ "$UNIQUE_RUNS" == "1" ]] || { echo "ERROR: expected one canonical run_id; got ${UNIQUE_RUNS}" >&2; exit 1; }
jq -e 'all(.[]; .status == "SUCCESS")' <<<"$TELEMETRY_JSON" >/dev/null || { echo "ERROR: at least one LLM call is not SUCCESS" >&2; exit 1; }
for agent_id in atlas_business_fact_extractor atlas_intake_orchestrator atlas_data_readiness_agent atlas_architecture_validation_agent atlas_policy_controls_agent; do
  jq -e --arg agent "$agent_id" 'any(.[]; .agent_id == $agent)' <<<"$TELEMETRY_JSON" >/dev/null || {
    echo "ERROR: telemetry missing expected agent ${agent_id}" >&2
    exit 1
  }
done

echo "=== F59 ISOLATED · AGENT GOVERNANCE READ MODEL SMOKE ==="
OVERVIEW_JSON="$(curl -fsS \
  -H "X-ATLAS-USER: ${SMOKE_USER}" \
  -H 'X-ATLAS-ROLES: viewer' \
  "$API_URL/agent-governance/overview?days=14")"
echo "$OVERVIEW_JSON" | jq '{agent_system_id, period_days, source, summary, agent_count:(.agents|length), run_count:(.runs|length)}'
[[ "$(jq -r '.agent_system_id // empty' <<<"$OVERVIEW_JSON")" == "ATLAS-DATAGOB" ]] || { echo "ERROR: unexpected agent system" >&2; exit 1; }
[[ "$(jq -r '.source.run_semantics // empty' <<<"$OVERVIEW_JSON")" == "distinct_run_id_observed_in_agent_llm_usage" ]] || { echo "ERROR: observed-run semantics changed" >&2; exit 1; }
[[ "$(jq -r '.source.run_lifecycle_instrumented' <<<"$OVERVIEW_JSON")" == "false" ]] || { echo "ERROR: dashboard must not claim run lifecycle instrumentation" >&2; exit 1; }
[[ "$(jq -r '.summary.llm_calls // 0' <<<"$OVERVIEW_JSON")" -ge "$ROW_COUNT" ]] || { echo "ERROR: overview does not include smoke telemetry" >&2; exit 1; }
[[ "$(jq -r '.summary.observed_agents // 0' <<<"$OVERVIEW_JSON")" -ge 5 ]] || { echo "ERROR: overview does not include five agents" >&2; exit 1; }

cat > "$WEB_ENV_FILE" <<YAML
ATLAS_INTERNAL_API_BASE: "${API_URL}"
ATLAS_WEB_IDENTITY_MODE: "static"
ATLAS_WEB_DEMO_USER: "feature59.dashboard@atlas.local"
ATLAS_WEB_DEMO_ROLES: "viewer"
YAML

echo "=== F59 ISOLATED · DEPLOY WEB PREVIEW ==="
gcloud run deploy "$PREVIEW_WEB_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$WEB_IMAGE" \
  --allow-unauthenticated \
  --env-vars-file "$WEB_ENV_FILE"
WEB_URL="$(gcloud run services describe "$PREVIEW_WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
WEB_REV="$(gcloud run services describe "$PREVIEW_WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"
[[ -n "$WEB_URL" && -n "$WEB_REV" ]] || { echo "ERROR: isolated F59 Web did not become ready" >&2; exit 1; }
PAGE_STATUS="$(curl -sS -o /tmp/atlas-f59-isolated-agent-governance.html -w '%{http_code}' "$WEB_URL/agent-governance")"
rm -f /tmp/atlas-f59-isolated-agent-governance.html
[[ "$PAGE_STATUS" == "200" ]] || { echo "ERROR: /agent-governance returned HTTP ${PAGE_STATUS}" >&2; exit 1; }
PROXY_OVERVIEW="$(curl -fsS "$WEB_URL/api/agent-governance/overview?days=14")"
[[ "$(jq -r '.summary.llm_calls // 0' <<<"$PROXY_OVERVIEW")" -ge "$ROW_COUNT" ]] || { echo "ERROR: Web proxy does not expose AgentOps telemetry" >&2; exit 1; }

echo "=== F59 ISOLATED · VERIFY STABLE ASSETS UNCHANGED ==="
service_snapshot "$STABLE_API_SERVICE" "$STABLE_API_AFTER"
service_snapshot "$STABLE_WEB_SERVICE" "$STABLE_WEB_AFTER"
object_snapshot "$STABLE_GOV_BUCKET" "$STABLE_GOV_PREFIX" "$STABLE_GOV_AFTER"
diff -u "$STABLE_API_BEFORE" "$STABLE_API_AFTER" || { echo "ERROR: stable API changed" >&2; exit 1; }
diff -u "$STABLE_WEB_BEFORE" "$STABLE_WEB_AFTER" || { echo "ERROR: stable Web changed" >&2; exit 1; }
diff -u "$STABLE_GOV_BEFORE" "$STABLE_GOV_AFTER" || { echo "ERROR: stable governance objects changed" >&2; exit 1; }

echo
echo "=== FEATURE 59 ISOLATED AGENTOPS DASHBOARD PREVIEW: CONFORME ==="
echo "SHA=${SHA}"
echo "PREVIEW_RUNTIME_SA=${PREVIEW_RUNTIME_SA}"
echo "PREVIEW_GOVERNANCE_SOURCE=gs://${PREVIEW_GOVERNANCE_BUCKET}/${PREVIEW_GOVERNANCE_PREFIX}"
echo "API_URL=${API_URL}"
echo "API_REVISION=${API_REV}"
echo "WEB_URL=${WEB_URL}"
echo "WEB_REVISION=${WEB_REV}"
echo "AGENT_GOVERNANCE_URL=${WEB_URL}/agent-governance"
echo "AGENTOPS_DATASET=${PROJECT}.${AGENTOPS_DATASET}"
echo "TELEMETRY_ROWS=${ROW_COUNT}"
echo "RUNTIME_IDENTITY_ISOLATION=PASS"
echo "BIGQUERY_JOB_PERMISSION=PASS"
echo "RUN_CORRELATION=PASS"
echo "FIVE_AGENT_COVERAGE=PASS"
echo "LLM_USAGE_CAPTURE=PASS"
echo "AGENT_GOVERNANCE_API=PASS"
echo "AGENT_GOVERNANCE_WEB=PASS"
echo "STABLE_API_UNCHANGED=PASS"
echo "STABLE_WEB_UNCHANGED=PASS"
echo "STABLE_GOVERNANCE_UNCHANGED=PASS"
