#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
AR_REPOSITORY="${AR_REPOSITORY:-atlas-datagob}"
RUNTIME_SA="${RUNTIME_SA:-atlas-datagob-runtime@${PROJECT}.iam.gserviceaccount.com}"
ADMIN_SA_NAME="${ADMIN_SA_NAME:-atlas-f58-admin-preview}"
ADMIN_SA="${ADMIN_SA:-${ADMIN_SA_NAME}@${PROJECT}.iam.gserviceaccount.com}"
STABLE_API_SERVICE="${STABLE_API_SERVICE:-atlas-datagob-api}"
STABLE_WEB_SERVICE="${STABLE_WEB_SERVICE:-atlas-datagob-web}"
INTAKE_API_SERVICE="${INTAKE_API_SERVICE:-atlas-datagob-api-f58-preview}"
ADMIN_API_SERVICE="${ADMIN_API_SERVICE:-atlas-datagob-governance-admin-f58-preview}"
WEB_SERVICE="${WEB_SERVICE:-atlas-datagob-web-f58-preview}"
PREVIEW_BUCKET="${PREVIEW_BUCKET:-atlas-datagob-governance-f58-${PROJECT}}"
PREVIEW_DEMAND_COLLECTION="${PREVIEW_DEMAND_COLLECTION:-atlas_demands_f58_preview}"

for command in gcloud git jq python3 curl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "ERROR: ${command} is required" >&2
    exit 1
  fi
done

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "feature/58-governance-catalog-administration" ]]; then
  echo "ERROR: expected feature/58-governance-catalog-administration, current=${BRANCH:-detached}" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree must be clean before preview build" >&2
  git status --short >&2
  exit 1
fi

SHA="$(git rev-parse HEAD)"
SHORT_SHA="${SHA:0:7}"
TAG="f58-preview-${SHORT_SHA}"
PREVIEW_PREFIX="${PREVIEW_PREFIX:-atlas-governance-f58-${SHORT_SHA}}"
INTAKE_API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-api:${TAG}"
ADMIN_API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-governance-admin:${TAG}"
WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-web:${TAG}"

BUILD_CONFIG="$(mktemp /tmp/atlas-f58-cloudbuild.XXXXXX.yaml)"
STABLE_API_JSON="$(mktemp /tmp/atlas-f58-stable-api.XXXXXX.json)"
INTAKE_ENV_FILE="$(mktemp /tmp/atlas-f58-intake-env.XXXXXX.yaml)"
ADMIN_ENV_FILE="$(mktemp /tmp/atlas-f58-admin-env.XXXXXX.yaml)"
WEB_ENV_FILE="$(mktemp /tmp/atlas-f58-web-env.XXXXXX.yaml)"
STABLE_STATE_BEFORE="$(mktemp /tmp/atlas-f58-stable-before.XXXXXX.json)"
STABLE_STATE_AFTER="$(mktemp /tmp/atlas-f58-stable-after.XXXXXX.json)"
cleanup() {
  rm -f "$BUILD_CONFIG" "$STABLE_API_JSON" "$INTAKE_ENV_FILE" "$ADMIN_ENV_FILE" "$WEB_ENV_FILE" "$STABLE_STATE_BEFORE" "$STABLE_STATE_AFTER"
}
trap cleanup EXIT

stable_snapshot() {
  local target="$1"
  local stable_bucket="$2"
  local stable_prefix="$3"
  python3 - "$target" "$PROJECT" "$REGION" "$STABLE_API_SERVICE" "$STABLE_WEB_SERVICE" "$stable_bucket" "$stable_prefix" <<'PY'
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

out, project, region, api_service, web_service, bucket, prefix = sys.argv[1:]

def cmd(*args: str) -> str:
    return subprocess.check_output(args, text=True).strip()

def service(service: str) -> dict:
    raw = cmd(
        "gcloud", "run", "services", "describe", service,
        "--project", project, "--region", region, "--format=json",
    )
    payload = json.loads(raw)
    return {
        "url": payload.get("status", {}).get("url"),
        "latest_ready_revision": payload.get("status", {}).get("latestReadyRevisionName"),
        "latest_created_revision": payload.get("status", {}).get("latestCreatedRevisionName"),
    }

def obj(uri: str) -> dict:
    try:
        raw = cmd("gcloud", "storage", "objects", "describe", uri, "--format=json")
    except subprocess.CalledProcessError:
        return {"uri": uri, "exists": False}
    payload = json.loads(raw)
    return {
        "uri": uri,
        "exists": True,
        "generation": str(payload.get("generation", "")),
        "metageneration": str(payload.get("metageneration", "")),
        "crc32c": payload.get("crc32c"),
        "md5Hash": payload.get("md5Hash"),
        "size": str(payload.get("size", "")),
    }

snapshot = {
    "stable_api": service(api_service),
    "stable_web": service(web_service),
    "policy_catalog": obj(f"gs://{bucket}/{prefix}/policies/catalog.json"),
    "architecture_catalog": obj(f"gs://{bucket}/{prefix}/architecture_patterns/catalog.json"),
}
Path(out).write_text(json.dumps(snapshot, sort_keys=True, indent=2) + "\n", encoding="utf-8")
PY
}

cat > "$BUILD_CONFIG" <<YAML
steps:
  - name: gcr.io/cloud-builders/docker
    args: ["build", "-f", "apps/api/Dockerfile", "-t", "${INTAKE_API_IMAGE}", "."]
  - name: gcr.io/cloud-builders/docker
    args: ["build", "-f", "apps/api/Dockerfile.governance-admin", "-t", "${ADMIN_API_IMAGE}", "."]
  - name: gcr.io/cloud-builders/docker
    args: ["build", "-f", "apps/web/Dockerfile", "-t", "${WEB_IMAGE}", "apps/web"]
images:
  - "${INTAKE_API_IMAGE}"
  - "${ADMIN_API_IMAGE}"
  - "${WEB_IMAGE}"
YAML

echo "=== ATLAS FEATURE 58 · RESOLVE STABLE GOVERNANCE SOURCE ==="
gcloud run services describe "$STABLE_API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --format=json > "$STABLE_API_JSON"

readarray -t STABLE_GOVERNANCE < <(python3 - "$STABLE_API_JSON" <<'PY'
import json
import sys
from pathlib import Path
payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
containers = payload.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
if not containers:
    raise SystemExit("ERROR: stable API service has no container spec")
env = {item.get("name"): str(item.get("value", "")) for item in containers[0].get("env", []) if item.get("name")}
bucket = env.get("ATLAS_GOVERNANCE_BUCKET", "").strip()
prefix = env.get("ATLAS_GOVERNANCE_PREFIX", "").strip()
if not bucket or not prefix:
    raise SystemExit("ERROR: stable API does not expose ATLAS_GOVERNANCE_BUCKET / ATLAS_GOVERNANCE_PREFIX")
print(bucket)
print(prefix)
PY
)
STABLE_GOVERNANCE_BUCKET="${STABLE_GOVERNANCE[0]}"
STABLE_GOVERNANCE_PREFIX="${STABLE_GOVERNANCE[1]}"

echo "STABLE_GOVERNANCE_BUCKET=${STABLE_GOVERNANCE_BUCKET}"
echo "STABLE_GOVERNANCE_PREFIX=${STABLE_GOVERNANCE_PREFIX}"
stable_snapshot "$STABLE_STATE_BEFORE" "$STABLE_GOVERNANCE_BUCKET" "$STABLE_GOVERNANCE_PREFIX"
cat "$STABLE_STATE_BEFORE" | jq .

for kind in policies architecture_patterns; do
  source_uri="gs://${STABLE_GOVERNANCE_BUCKET}/${STABLE_GOVERNANCE_PREFIX}/${kind}/catalog.json"
  if ! gcloud storage objects describe "$source_uri" --format='value(generation)' >/dev/null 2>&1; then
    echo "ERROR: stable aggregate catalog does not exist: ${source_uri}" >&2
    exit 1
  fi
done

echo "=== CREATE / REUSE ISOLATED PREVIEW BUCKET ==="
if ! gcloud storage buckets describe "gs://${PREVIEW_BUCKET}" --format='value(name)' >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${PREVIEW_BUCKET}" \
    --project "$PROJECT" \
    --location "$REGION" \
    --uniform-bucket-level-access
else
  echo "Preview bucket already exists: gs://${PREVIEW_BUCKET}"
fi

if ! gcloud iam service-accounts describe "$ADMIN_SA" --project "$PROJECT" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$ADMIN_SA_NAME" \
    --project "$PROJECT" \
    --display-name "ATLAS Feature 58 Governance Admin Preview"
fi

gcloud storage buckets add-iam-policy-binding "gs://${PREVIEW_BUCKET}" \
  --member="serviceAccount:${ADMIN_SA}" \
  --role="roles/storage.objectAdmin" >/dev/null

gcloud storage buckets add-iam-policy-binding "gs://${PREVIEW_BUCKET}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectViewer" >/dev/null

echo "=== COPY GOVERNANCE BASELINE TO ISOLATED PREFIX ==="
for kind in policies architecture_patterns; do
  source_uri="gs://${STABLE_GOVERNANCE_BUCKET}/${STABLE_GOVERNANCE_PREFIX}/${kind}/catalog.json"
  target_uri="gs://${PREVIEW_BUCKET}/${PREVIEW_PREFIX}/${kind}/catalog.json"
  if gcloud storage objects describe "$target_uri" --format='value(generation)' >/dev/null 2>&1; then
    echo "ERROR: preview target already exists for this SHA; refusing to overwrite: ${target_uri}" >&2
    echo "Use a new commit SHA or explicitly set PREVIEW_PREFIX to a fresh value." >&2
    exit 1
  fi
  gcloud storage cp "$source_uri" "$target_uri"
done

POLICY_COUNT="$(gcloud storage cat "gs://${PREVIEW_BUCKET}/${PREVIEW_PREFIX}/policies/catalog.json" | jq '[.[] | select(.status == "active")] | length')"
ARCH_COUNT="$(gcloud storage cat "gs://${PREVIEW_BUCKET}/${PREVIEW_PREFIX}/architecture_patterns/catalog.json" | jq '[.[] | select(.status == "active")] | length')"
if [[ "$POLICY_COUNT" -lt 1 || "$ARCH_COUNT" -lt 1 ]]; then
  echo "ERROR: preview baseline is empty" >&2
  exit 1
fi

echo "Preview baseline: policies=${POLICY_COUNT}, architecture_patterns=${ARCH_COUNT}"

echo "=== BUILD THREE ISOLATED IMAGES ==="
echo "SHA=${SHA}"
echo "INTAKE_API_IMAGE=${INTAKE_API_IMAGE}"
echo "ADMIN_API_IMAGE=${ADMIN_API_IMAGE}"
echo "WEB_IMAGE=${WEB_IMAGE}"
gcloud builds submit . \
  --project "$PROJECT" \
  --config "$BUILD_CONFIG"

python3 - "$STABLE_API_JSON" "$INTAKE_ENV_FILE" "$PROJECT" "$REGION" "$PREVIEW_BUCKET" "$PREVIEW_PREFIX" "$PREVIEW_DEMAND_COLLECTION" <<'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path

source_path, target_path, project, region, bucket, prefix, collection = sys.argv[1:]
payload = json.loads(Path(source_path).read_text(encoding="utf-8"))
containers = payload.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
if not containers:
    raise SystemExit("ERROR: stable API service has no container spec")
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
    raise SystemExit(f"ERROR: stable API is missing required ADK env vars: {missing}")
preview = {
    "ATLAS_AUTH_MODE": "header",
    "ATLAS_DEMAND_REPOSITORY": "firestore",
    "ATLAS_FIRESTORE_PROJECT": project,
    "ATLAS_FIRESTORE_DATABASE": env.get("ATLAS_FIRESTORE_DATABASE", "(default)"),
    "ATLAS_FIRESTORE_COLLECTION": collection,
    "ATLAS_ALLOWED_ORIGINS": "https://*.run.app",
    "ATLAS_ALLOWED_ORIGIN_REGEX": r"https://.*\.run\.app",
    "ATLAS_GOVERNANCE_BUCKET": bucket,
    "ATLAS_GOVERNANCE_PREFIX": prefix,
    "ATLAS_GOVERNANCE_REQUIRE_GCS": "true",
    "GOOGLE_CLOUD_PROJECT": env.get("GOOGLE_CLOUD_PROJECT", project),
    "GOOGLE_CLOUD_LOCATION": env.get("GOOGLE_CLOUD_LOCATION", region),
    "GOOGLE_GENAI_USE_VERTEXAI": "true",
}
for name in required:
    preview[name] = env[name]

def y(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)
Path(target_path).write_text(
    "".join(f"{key}: {y(value)}\n" for key, value in sorted(preview.items())),
    encoding="utf-8",
)
PY

cat > "$ADMIN_ENV_FILE" <<YAML
ATLAS_AUTH_MODE: "header"
ATLAS_GOVERNANCE_BUCKET: "${PREVIEW_BUCKET}"
ATLAS_GOVERNANCE_PREFIX: "${PREVIEW_PREFIX}"
ATLAS_GOVERNANCE_ADMIN_REQUIRE_GCS: "true"
ATLAS_ALLOWED_ORIGINS: "https://*.run.app"
ATLAS_ALLOWED_ORIGIN_REGEX: "https://.*[.]run[.]app"
GOOGLE_CLOUD_PROJECT: "${PROJECT}"
YAML

echo "=== DEPLOY INTAKE API PREVIEW ==="
gcloud run deploy "$INTAKE_API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$INTAKE_API_IMAGE" \
  --service-account "$RUNTIME_SA" \
  --allow-unauthenticated \
  --env-vars-file "$INTAKE_ENV_FILE"
INTAKE_API_URL="$(gcloud run services describe "$INTAKE_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
if [[ -z "$INTAKE_API_URL" ]]; then
  echo "ERROR: Intake API preview URL not resolved" >&2
  exit 1
fi

echo "=== DEPLOY GOVERNANCE ADMIN API PREVIEW ==="
gcloud run deploy "$ADMIN_API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$ADMIN_API_IMAGE" \
  --service-account "$ADMIN_SA" \
  --allow-unauthenticated \
  --env-vars-file "$ADMIN_ENV_FILE"
ADMIN_API_URL="$(gcloud run services describe "$ADMIN_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
if [[ -z "$ADMIN_API_URL" ]]; then
  echo "ERROR: Governance Admin API preview URL not resolved" >&2
  exit 1
fi

echo "=== API SECURITY + BASELINE SMOKE ==="
curl -fsS "$INTAKE_API_URL/health" | jq .
INTAKE_HEADERS=(
  -H 'X-ATLAS-USER: feature58.preview@atlas.local'
  -H 'X-ATLAS-ROLES: data_steward,committee_member'
)
CATALOG_JSON="$(curl -fsS "${INTAKE_HEADERS[@]}" "$INTAKE_API_URL/intake/governance-catalog")"
echo "$CATALOG_JSON" | jq '{source, policy_count, architecture_pattern_count}'
if [[ "$(jq -r '.source // empty' <<<"$CATALOG_JSON")" != "gcs" ]]; then
  echo "ERROR: Intake preview is not reading governance from GCS" >&2
  exit 1
fi
if [[ "$(jq -r '.policy_count // 0' <<<"$CATALOG_JSON")" != "$POLICY_COUNT" ]]; then
  echo "ERROR: Intake preview policy count does not match isolated baseline" >&2
  exit 1
fi
if [[ "$(jq -r '.architecture_pattern_count // 0' <<<"$CATALOG_JSON")" != "$ARCH_COUNT" ]]; then
  echo "ERROR: Intake preview architecture count does not match isolated baseline" >&2
  exit 1
fi

ADMIN_HEALTH="$(curl -fsS "$ADMIN_API_URL/health")"
echo "$ADMIN_HEALTH" | jq .
if [[ "$(jq -r '.access_boundary // empty' <<<"$ADMIN_HEALTH")" != "committee_member" ]]; then
  echo "ERROR: Governance Admin API is missing committee_member boundary" >&2
  exit 1
fi

BUSINESS_STATUS="$(curl -sS -o /tmp/atlas-f58-business-denied.json -w '%{http_code}' \
  -H 'X-ATLAS-USER: business.preview@atlas.local' \
  -H 'X-ATLAS-ROLES: data_owner' \
  "$ADMIN_API_URL/governance/catalog/policies")"
if [[ "$BUSINESS_STATUS" != "403" ]]; then
  echo "ERROR: business user must receive 403 from Governance Admin API; got ${BUSINESS_STATUS}" >&2
  cat /tmp/atlas-f58-business-denied.json >&2 || true
  exit 1
fi

PLATFORM_STATUS="$(curl -sS -o /tmp/atlas-f58-platform-denied.json -w '%{http_code}' \
  -H 'X-ATLAS-USER: platform.preview@atlas.local' \
  -H 'X-ATLAS-ROLES: platform_admin' \
  "$ADMIN_API_URL/governance/catalog/policies")"
if [[ "$PLATFORM_STATUS" != "403" ]]; then
  echo "ERROR: platform_admin without committee_member must receive 403; got ${PLATFORM_STATUS}" >&2
  exit 1
fi

ADMIN_POLICIES="$(curl -fsS \
  -H 'X-ATLAS-USER: committee.preview@atlas.local' \
  -H 'X-ATLAS-ROLES: committee_member' \
  "$ADMIN_API_URL/governance/catalog/policies")"
if [[ "$(jq -r '.records | map(select(.status == "active")) | length' <<<"$ADMIN_POLICIES")" != "$POLICY_COUNT" ]]; then
  echo "ERROR: committee catalog listing does not match isolated baseline" >&2
  exit 1
fi

cat > "$WEB_ENV_FILE" <<YAML
ATLAS_INTERNAL_API_BASE: "${INTAKE_API_URL}"
ATLAS_INTERNAL_GOVERNANCE_ADMIN_BASE: "${ADMIN_API_URL}"
ATLAS_WEB_IDENTITY_MODE: "static"
ATLAS_WEB_DEMO_USER: "feature58.preview@atlas.local"
ATLAS_WEB_DEMO_ROLES: "data_steward,committee_member"
YAML

echo "=== DEPLOY WEB PREVIEW ==="
gcloud run deploy "$WEB_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$WEB_IMAGE" \
  --allow-unauthenticated \
  --env-vars-file "$WEB_ENV_FILE"
WEB_URL="$(gcloud run services describe "$WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
if [[ -z "$WEB_URL" ]]; then
  echo "ERROR: Web preview URL not resolved" >&2
  exit 1
fi

PAGE_STATUS="$(curl -sS -o /tmp/atlas-f58-governance-catalog.html -w '%{http_code}' "$WEB_URL/governance-catalog")"
if [[ "$PAGE_STATUS" != "200" ]]; then
  echo "ERROR: /governance-catalog returned HTTP ${PAGE_STATUS}" >&2
  exit 1
fi
PROXY_POLICIES="$(curl -fsS "$WEB_URL/api/governance-catalog?kind=policies")"
if [[ "$(jq -r '.records | map(select(.status == "active")) | length' <<<"$PROXY_POLICIES")" != "$POLICY_COUNT" ]]; then
  echo "ERROR: Web -> Governance Admin proxy failed" >&2
  exit 1
fi

echo "=== VERIFY STABLE ASSETS UNCHANGED ==="
stable_snapshot "$STABLE_STATE_AFTER" "$STABLE_GOVERNANCE_BUCKET" "$STABLE_GOVERNANCE_PREFIX"
if ! diff -u "$STABLE_STATE_BEFORE" "$STABLE_STATE_AFTER"; then
  echo "ERROR: stable services or stable governance catalogs changed during Feature 58 preview deployment" >&2
  exit 1
fi

echo
echo "=== FEATURE 58 PREVIEW: CONFORME ==="
echo "SHA=${SHA}"
echo "INTAKE_API_URL=${INTAKE_API_URL}"
echo "ADMIN_API_URL=${ADMIN_API_URL}"
echo "WEB_URL=${WEB_URL}"
echo "GOVERNANCE_CATALOG_URL=${WEB_URL}/governance-catalog"
echo "INTAKE_URL=${WEB_URL}/intake"
echo "PREVIEW_GOVERNANCE_BUCKET=gs://${PREVIEW_BUCKET}"
echo "PREVIEW_GOVERNANCE_PREFIX=${PREVIEW_PREFIX}"
echo "PREVIEW_POLICY_COUNT=${POLICY_COUNT}"
echo "PREVIEW_ARCHITECTURE_PATTERN_COUNT=${ARCH_COUNT}"
echo "PREVIEW_DEMAND_COLLECTION=${PREVIEW_DEMAND_COLLECTION}"
echo "COMMITTEE_BOUNDARY=PASS"
echo "BUSINESS_DIRECT_ADMIN_ACCESS=403"
echo "PLATFORM_ADMIN_WITHOUT_COMMITTEE=403"
echo "STABLE_SERVICES_AND_CATALOGS_UNCHANGED=PASS"
