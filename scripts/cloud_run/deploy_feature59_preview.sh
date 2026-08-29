#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
AR_REPOSITORY="${AR_REPOSITORY:-atlas-datagob}"
RUNTIME_SA="${RUNTIME_SA:-atlas-datagob-runtime@${PROJECT}.iam.gserviceaccount.com}"
STABLE_API_SERVICE="${STABLE_API_SERVICE:-atlas-datagob-api}"
STABLE_WEB_SERVICE="${STABLE_WEB_SERVICE:-atlas-datagob-web}"
PREVIEW_API_SERVICE="${PREVIEW_API_SERVICE:-atlas-datagob-api-f59-preview}"
PREVIEW_WEB_SERVICE="${PREVIEW_WEB_SERVICE:-atlas-datagob-web-f59-preview}"
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
  echo "ERROR: working tree must be clean before F59 preview build" >&2
  git status --short >&2
  exit 1
fi
if [[ ! "$AGENTOPS_DATASET" =~ _preview$ ]]; then
  echo "ERROR: refusing non-preview AgentOps dataset: ${AGENTOPS_DATASET}" >&2
  exit 1
fi
if ! bq --project_id="$PROJECT" --location="$REGION" show --dataset "${PROJECT}:${AGENTOPS_DATASET}" >/dev/null 2>&1; then
  echo "ERROR: AgentOps preview dataset does not exist: ${PROJECT}:${AGENTOPS_DATASET}" >&2
  echo "Run scripts/agentops/setup_f59_preview_bigquery.sh first." >&2
  exit 1
fi

SHA="$(git rev-parse HEAD)"
SHORT_SHA="${SHA:0:7}"
TAG="f59-preview-${SHORT_SHA}"
API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-api:${TAG}"
WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-web:${TAG}"

BUILD_CONFIG="$(mktemp /tmp/atlas-f59-cloudbuild.XXXXXX.yaml)"
STABLE_API_JSON="$(mktemp /tmp/atlas-f59-stable-api.XXXXXX.json)"
PREVIEW_ENV_FILE="$(mktemp /tmp/atlas-f59-preview-env.XXXXXX.yaml)"
WEB_ENV_FILE="$(mktemp /tmp/atlas-f59-web-env.XXXXXX.yaml)"
DATASET_JSON="$(mktemp /tmp/atlas-f59-dataset.XXXXXX.json)"
DATASET_UPDATED_JSON="$(mktemp /tmp/atlas-f59-dataset-updated.XXXXXX.json)"
STABLE_API_BEFORE="$(mktemp /tmp/atlas-f59-stable-api-before.XXXXXX.json)"
STABLE_API_AFTER="$(mktemp /tmp/atlas-f59-stable-api-after.XXXXXX.json)"
STABLE_WEB_BEFORE="$(mktemp /tmp/atlas-f59-stable-web-before.XXXXXX.json)"
STABLE_WEB_AFTER="$(mktemp /tmp/atlas-f59-stable-web-after.XXXXXX.json)"
SMOKE_RESPONSE="$(mktemp /tmp/atlas-f59-smoke.XXXXXX.json)"
cleanup() {
  rm -f "$BUILD_CONFIG" "$STABLE_API_JSON" "$PREVIEW_ENV_FILE" "$WEB_ENV_FILE" \
    "$DATASET_JSON" "$DATASET_UPDATED_JSON" "$STABLE_API_BEFORE" "$STABLE_API_AFTER" \
    "$STABLE_WEB_BEFORE" "$STABLE_WEB_AFTER" "$SMOKE_RESPONSE"
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

echo "=== F59 · SNAPSHOT STABLE SERVICES ==="
service_snapshot "$STABLE_API_SERVICE" "$STABLE_API_BEFORE"
service_snapshot "$STABLE_WEB_SERVICE" "$STABLE_WEB_BEFORE"
cat "$STABLE_API_BEFORE" | jq .
cat "$STABLE_WEB_BEFORE" | jq .

echo "=== F59 · RESOLVE STABLE API CONFIG ==="
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
GOV_BUCKET="${STABLE_GOVERNANCE[0]}"
GOV_PREFIX="${STABLE_GOVERNANCE[1]}"
echo "GOVERNANCE_SOURCE=gs://${GOV_BUCKET}/${GOV_PREFIX} (read-only runtime)"

for kind in policies architecture_patterns; do
  gcloud storage objects describe \
    "gs://${GOV_BUCKET}/${GOV_PREFIX}/${kind}/catalog.json" \
    --format='value(generation)' >/dev/null
done

# Dataset-scoped write access only. Preserve the full existing dataset ACL and
# append the runtime SA as WRITER if needed. This avoids a project-wide Data Editor grant.
echo "=== F59 · GRANT RUNTIME WRITE ONLY TO PREVIEW DATASET ==="
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
Path(target).write_text(json.dumps(payload, indent=2) + "\n")
PY
bq --project_id="$PROJECT" update --source "$DATASET_UPDATED_JSON" "${PROJECT}:${AGENTOPS_DATASET}" >/dev/null

bq --project_id="$PROJECT" show --format=prettyjson "${PROJECT}:${AGENTOPS_DATASET}" \
  | jq -e --arg sa "$RUNTIME_SA" '.access | any(.role == "WRITER" and .userByEmail == $sa)' >/dev/null

echo "=== F59 · BUILD ISOLATED API + WEB IMAGES ==="
echo "SHA=${SHA}"
echo "API_IMAGE=${API_IMAGE}"
echo "WEB_IMAGE=${WEB_IMAGE}"
gcloud builds submit . --project "$PROJECT" --config "$BUILD_CONFIG"

python3 - "$STABLE_API_JSON" "$PREVIEW_ENV_FILE" "$PROJECT" "$REGION" "$GOV_BUCKET" "$GOV_PREFIX" "$AGENTOPS_DATASET" "$PREVIEW_DEMAND_COLLECTION" <<'PY'
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
required = [
    "ATLAS_ADK_SESSION_BACKEND",
    "ATLAS_ADK_REQUIRE_DURABLE_SESSIONS",
    "GOOGLE_CLOUD_AGENT_ENGINE_ID",
]
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
Path(target_path).write_text(
    "".join(f"{key}: {q(value)}\n" for key, value in sorted(preview.items())),
    encoding="utf-8",
)
PY

echo "=== F59 · DEPLOY ISOLATED API PREVIEW ==="
gcloud run deploy "$PREVIEW_API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$API_IMAGE" \
  --service-account "$RUNTIME_SA" \
  --allow-unauthenticated \
  --env-vars-file "$PREVIEW_ENV_FILE"

API_URL="$(gcloud run services describe "$PREVIEW_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
API_REV="$(gcloud run services describe "$PREVIEW_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"
if [[ -z "$API_URL" || -z "$API_REV" ]]; then
  echo "ERROR: F59 preview API did not become ready" >&2
  exit 1
fi
curl -fsS "$API_URL/health" | jq .

SMOKE_USER="feature59.preview.$(date -u +%Y%m%d%H%M%S)@atlas.local"
SMOKE_START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=== F59 · REAL GEMINI ADK TELEMETRY SMOKE ==="
curl -fsS \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "X-ATLAS-USER: ${SMOKE_USER}" \
  -H 'X-ATLAS-ROLES: data_steward,committee_member' \
  "$API_URL/intake/conversation" \
  -d '{"message":"Necesitamos un dashboard ejecutivo para visualizar ventas y margen. Los datos provienen de BigQuery, son propiedad del área Comercial, se actualizan diariamente, tienen controles de calidad aprobados, acceso autorizado y no contienen datos sensibles."}' \
  > "$SMOKE_RESPONSE"

jq '{session_id, project_classification, specialist_activity, agent_trace}' "$SMOKE_RESPONSE"

sleep 5
TELEMETRY_JSON="$(bq --project_id="$PROJECT" --location="$REGION" query \
  --use_legacy_sql=false --format=json \
  "SELECT agent_system_id, run_id, trace_id, agent_id, model_name, input_tokens, output_tokens, total_tokens, latency_ms, status, requested_by, observed_at
   FROM \`${PROJECT}.${AGENTOPS_DATASET}.agent_llm_usage\`
   WHERE requested_by = '${SMOKE_USER}' AND observed_at >= TIMESTAMP('${SMOKE_START}')
   ORDER BY observed_at")"

echo "$TELEMETRY_JSON" | jq .
ROW_COUNT="$(jq 'length' <<<"$TELEMETRY_JSON")"
if [[ "$ROW_COUNT" -lt 2 ]]; then
  echo "ERROR: expected at least extractor + orchestrator LLM telemetry rows; got ${ROW_COUNT}" >&2
  exit 1
fi

UNIQUE_RUNS="$(jq '[.[].run_id] | unique | length' <<<"$TELEMETRY_JSON")"
if [[ "$UNIQUE_RUNS" != "1" ]]; then
  echo "ERROR: all model calls in one intake turn must correlate to one run_id; got ${UNIQUE_RUNS}" >&2
  exit 1
fi
if ! jq -e 'all(.[]; .status == "SUCCESS")' <<<"$TELEMETRY_JSON" >/dev/null; then
  echo "ERROR: at least one captured LLM call is not SUCCESS" >&2
  exit 1
fi

EXPECTED_AGENTS=(
  atlas_business_fact_extractor
  atlas_intake_orchestrator
  atlas_data_readiness_agent
  atlas_architecture_validation_agent
  atlas_policy_controls_agent
)
for agent_id in "${EXPECTED_AGENTS[@]}"; do
  if ! jq -e --arg agent "$agent_id" 'any(.[]; .agent_id == $agent)' <<<"$TELEMETRY_JSON" >/dev/null; then
    echo "ERROR: telemetry does not contain expected agent: ${agent_id}" >&2
    exit 1
  fi
done

echo "=== F59 · AGENT GOVERNANCE READ MODEL SMOKE ==="
OVERVIEW_JSON="$(curl -fsS \
  -H "X-ATLAS-USER: ${SMOKE_USER}" \
  -H 'X-ATLAS-ROLES: viewer' \
  "$API_URL/agent-governance/overview?days=14")"
echo "$OVERVIEW_JSON" | jq '{agent_system_id, period_days, source, summary, agent_count:(.agents|length), run_count:(.runs|length)}'
if [[ "$(jq -r '.agent_system_id // empty' <<<"$OVERVIEW_JSON")" != "ATLAS-DATAGOB" ]]; then
  echo "ERROR: Agent Governance overview returned unexpected agent system" >&2
  exit 1
fi
if [[ "$(jq -r '.source.run_semantics // empty' <<<"$OVERVIEW_JSON")" != "distinct_run_id_observed_in_agent_llm_usage" ]]; then
  echo "ERROR: Agent Governance overview lost observed-run semantics" >&2
  exit 1
fi
if [[ "$(jq -r '.source.run_lifecycle_instrumented' <<<"$OVERVIEW_JSON")" != "false" ]]; then
  echo "ERROR: dashboard must not claim agent_runs lifecycle instrumentation yet" >&2
  exit 1
fi
if [[ "$(jq -r '.summary.llm_calls // 0' <<<"$OVERVIEW_JSON")" -lt "$ROW_COUNT" ]]; then
  echo "ERROR: Agent Governance overview does not include the smoke telemetry" >&2
  exit 1
fi
if [[ "$(jq -r '.summary.observed_agents // 0' <<<"$OVERVIEW_JSON")" -lt 5 ]]; then
  echo "ERROR: expected all five ATLAS agents in Agent Governance overview" >&2
  exit 1
fi

cat > "$WEB_ENV_FILE" <<YAML
ATLAS_INTERNAL_API_BASE: "${API_URL}"
ATLAS_WEB_IDENTITY_MODE: "static"
ATLAS_WEB_DEMO_USER: "feature59.dashboard@atlas.local"
ATLAS_WEB_DEMO_ROLES: "viewer"
YAML

echo "=== F59 · DEPLOY ISOLATED WEB PREVIEW ==="
gcloud run deploy "$PREVIEW_WEB_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$WEB_IMAGE" \
  --allow-unauthenticated \
  --env-vars-file "$WEB_ENV_FILE"

WEB_URL="$(gcloud run services describe "$PREVIEW_WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
WEB_REV="$(gcloud run services describe "$PREVIEW_WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"
if [[ -z "$WEB_URL" || -z "$WEB_REV" ]]; then
  echo "ERROR: F59 preview Web did not become ready" >&2
  exit 1
fi

PAGE_STATUS="$(curl -sS -o /tmp/atlas-f59-agent-governance.html -w '%{http_code}' "$WEB_URL/agent-governance")"
if [[ "$PAGE_STATUS" != "200" ]]; then
  echo "ERROR: /agent-governance returned HTTP ${PAGE_STATUS}" >&2
  rm -f /tmp/atlas-f59-agent-governance.html
  exit 1
fi
rm -f /tmp/atlas-f59-agent-governance.html

PROXY_OVERVIEW="$(curl -fsS "$WEB_URL/api/agent-governance/overview?days=14")"
if [[ "$(jq -r '.summary.llm_calls // 0' <<<"$PROXY_OVERVIEW")" -lt "$ROW_COUNT" ]]; then
  echo "ERROR: Web -> Agent Governance API proxy does not expose persisted telemetry" >&2
  exit 1
fi

echo "=== F59 · VERIFY STABLE SERVICES UNCHANGED ==="
service_snapshot "$STABLE_API_SERVICE" "$STABLE_API_AFTER"
service_snapshot "$STABLE_WEB_SERVICE" "$STABLE_WEB_AFTER"
if ! diff -u "$STABLE_API_BEFORE" "$STABLE_API_AFTER"; then
  echo "ERROR: stable API changed during F59 preview deployment" >&2
  exit 1
fi
if ! diff -u "$STABLE_WEB_BEFORE" "$STABLE_WEB_AFTER"; then
  echo "ERROR: stable Web changed during F59 preview deployment" >&2
  exit 1
fi

echo
echo "=== FEATURE 59 AGENTOPS DASHBOARD PREVIEW: CONFORME ==="
echo "SHA=${SHA}"
echo "API_URL=${API_URL}"
echo "API_REVISION=${API_REV}"
echo "WEB_URL=${WEB_URL}"
echo "WEB_REVISION=${WEB_REV}"
echo "AGENT_GOVERNANCE_URL=${WEB_URL}/agent-governance"
echo "API_IMAGE=${API_IMAGE}"
echo "WEB_IMAGE=${WEB_IMAGE}"
echo "AGENTOPS_DATASET=${PROJECT}.${AGENTOPS_DATASET}"
echo "SMOKE_USER=${SMOKE_USER}"
echo "TELEMETRY_ROWS=${ROW_COUNT}"
echo "RUN_CORRELATION=PASS"
echo "FIVE_AGENT_COVERAGE=PASS"
echo "LLM_USAGE_CAPTURE=PASS"
echo "AGENT_GOVERNANCE_API=PASS"
echo "AGENT_GOVERNANCE_WEB=PASS"
echo "STABLE_API_UNCHANGED=PASS"
echo "STABLE_WEB_UNCHANGED=PASS"
