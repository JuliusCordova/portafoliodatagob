#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
AR_REPOSITORY="${AR_REPOSITORY:-atlas-datagob}"
RUNTIME_SA="${RUNTIME_SA:-atlas-datagob-runtime@${PROJECT}.iam.gserviceaccount.com}"
STABLE_API_SERVICE="${STABLE_API_SERVICE:-atlas-datagob-api}"
STABLE_WEB_SERVICE="${STABLE_WEB_SERVICE:-atlas-datagob-web}"
API_SERVICE="${API_SERVICE:-atlas-datagob-api-f57-preview}"
WEB_SERVICE="${WEB_SERVICE:-atlas-datagob-web-f57-preview}"

for command in gcloud git jq python3 curl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "ERROR: ${command} is required" >&2
    exit 1
  fi
done

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "feature/57-business-case-docx-export" ]]; then
  echo "ERROR: expected feature/57-business-case-docx-export, current=${BRANCH:-detached}" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree must be clean before preview build" >&2
  git status --short >&2
  exit 1
fi

SHA="$(git rev-parse HEAD)"
SHORT_SHA="${SHA:0:7}"
TAG="f57-preview-${SHORT_SHA}"
API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-api:${TAG}"
WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-web:${TAG}"

BUILD_CONFIG="$(mktemp /tmp/atlas-f57-cloudbuild.XXXXXX.yaml)"
API_ENV_JSON="$(mktemp /tmp/atlas-f57-stable-api-env.XXXXXX.json)"
API_ENV_FILE="$(mktemp /tmp/atlas-f57-api-env.XXXXXX.yaml)"
WEB_ENV_FILE="$(mktemp /tmp/atlas-f57-web-env.XXXXXX.yaml)"
cleanup() { rm -f "$BUILD_CONFIG" "$API_ENV_JSON" "$API_ENV_FILE" "$WEB_ENV_FILE"; }
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

echo "=== ATLAS FEATURE 57 · PREVIEW BUILD ==="
echo "SHA=${SHA}"
echo "API_IMAGE=${API_IMAGE}"
echo "WEB_IMAGE=${WEB_IMAGE}"

gcloud builds submit . \
  --project "$PROJECT" \
  --config "$BUILD_CONFIG"

# Reuse the already-approved runtime configuration for durable ADK sessions and
# governed catalogs, but isolate demand persistence and preview identity.
gcloud run services describe "$STABLE_API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --format=json > "$API_ENV_JSON"

python3 - "$API_ENV_JSON" "$API_ENV_FILE" "$PROJECT" "$REGION" <<'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path

source_path, target_path, project, region = sys.argv[1:]
payload = json.loads(Path(source_path).read_text(encoding="utf-8"))
containers = payload.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
if not containers:
    raise SystemExit("ERROR: stable API service has no container spec")

env = {}
for item in containers[0].get("env", []):
    name = item.get("name")
    if name and "value" in item:
        env[name] = str(item["value"])

required_from_stable = [
    "ATLAS_ADK_SESSION_BACKEND",
    "ATLAS_ADK_REQUIRE_DURABLE_SESSIONS",
    "GOOGLE_CLOUD_AGENT_ENGINE_ID",
    "ATLAS_GOVERNANCE_BUCKET",
    "ATLAS_GOVERNANCE_PREFIX",
    "ATLAS_GOVERNANCE_REQUIRE_GCS",
]
missing = [name for name in required_from_stable if not env.get(name)]
if missing:
    raise SystemExit(f"ERROR: stable API is missing required Feature 54 env vars: {missing}")

preview = {
    "ATLAS_AUTH_MODE": "header",
    "ATLAS_DEMAND_REPOSITORY": "firestore",
    "ATLAS_FIRESTORE_PROJECT": project,
    "ATLAS_FIRESTORE_DATABASE": env.get("ATLAS_FIRESTORE_DATABASE", "(default)"),
    "ATLAS_FIRESTORE_COLLECTION": "atlas_demands_f57_preview",
    "ATLAS_ALLOWED_ORIGINS": "https://*.run.app",
    "ATLAS_ALLOWED_ORIGIN_REGEX": r"https://.*\.run\.app",
    "GOOGLE_CLOUD_PROJECT": env.get("GOOGLE_CLOUD_PROJECT", project),
    "GOOGLE_CLOUD_LOCATION": env.get("GOOGLE_CLOUD_LOCATION", region),
    # Gemini/ADK must use Vertex AI with the Cloud Run service account.
    # Without this flag google-genai falls back to the Developer API and asks
    # for GOOGLE_API_KEY, which is not the ATLAS production authentication model.
    "GOOGLE_GENAI_USE_VERTEXAI": "true",
}
for name in required_from_stable:
    preview[name] = env[name]


def yaml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)

Path(target_path).write_text(
    "".join(f"{key}: {yaml_string(value)}\n" for key, value in sorted(preview.items())),
    encoding="utf-8",
)
PY

echo "=== DEPLOY API PREVIEW ==="
gcloud run deploy "$API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$API_IMAGE" \
  --service-account "$RUNTIME_SA" \
  --allow-unauthenticated \
  --env-vars-file "$API_ENV_FILE"

API_URL="$(gcloud run services describe "$API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
if [[ -z "$API_URL" ]]; then
  echo "ERROR: API preview URL not resolved" >&2
  exit 1
fi

AUTH_HEADERS=(
  -H 'X-ATLAS-USER: feature57.preview@atlas.local'
  -H 'X-ATLAS-ROLES: data_steward,data_architect,executive'
)

echo "=== API HEALTH + GOVERNANCE CATALOG ==="
HEALTH_JSON="$(curl -fsS "$API_URL/health")"
echo "$HEALTH_JSON" | jq .
if [[ "$(jq -r '.version // empty' <<<"$HEALTH_JSON")" != "0.8.0" ]]; then
  echo "ERROR: Feature 57 must preserve API version 0.8.0" >&2
  exit 1
fi

CATALOG_JSON="$(curl -fsS "${AUTH_HEADERS[@]}" "$API_URL/intake/governance-catalog")"
echo "$CATALOG_JSON" | jq '{source, policy_count, architecture_pattern_count}'
if [[ "$(jq -r '.policy_count // 0' <<<"$CATALOG_JSON")" -lt 1 ]]; then
  echo "ERROR: governed policy catalog is not available" >&2
  exit 1
fi

# Verify the deployed revision is explicitly configured for Vertex AI rather
# than relying on the Gemini Developer API / API-key fallback.
GENAI_PROVIDER="$(gcloud run services describe "$API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --format='json(spec.template.spec.containers[0].env)' \
  | jq -r '.spec.template.spec.containers[0].env[]? | select(.name=="GOOGLE_GENAI_USE_VERTEXAI") | .value' 2>/dev/null || true)"
if [[ "$GENAI_PROVIDER" != "true" ]]; then
  echo "ERROR: preview runtime is not explicitly configured for Vertex AI" >&2
  exit 1
fi

cat > "$WEB_ENV_FILE" <<YAML
ATLAS_INTERNAL_API_BASE: "${API_URL}"
ATLAS_WEB_IDENTITY_MODE: "static"
ATLAS_WEB_DEMO_USER: "feature57.preview@atlas.local"
ATLAS_WEB_DEMO_ROLES: "data_steward,data_architect,executive"
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

HTTP_CODE="$(curl -sS -o /tmp/atlas-f57-intake.html -w '%{http_code}' "$WEB_URL/intake")"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "ERROR: /intake returned HTTP ${HTTP_CODE}" >&2
  exit 1
fi

PROXY_CATALOG="$(curl -fsS "$WEB_URL/api/intake/governance-catalog")"
if [[ "$(jq -r '.policy_count // 0' <<<"$PROXY_CATALOG")" -lt 1 ]]; then
  echo "ERROR: Web -> API governance proxy failed" >&2
  exit 1
fi

STABLE_API_URL="$(gcloud run services describe "$STABLE_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
STABLE_WEB_URL="$(gcloud run services describe "$STABLE_WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"

echo
echo "=== FEATURE 57 PREVIEW: CONFORME ==="
echo "SHA=${SHA}"
echo "API_URL=${API_URL}"
echo "WEB_URL=${WEB_URL}"
echo "INTAKE_URL=${WEB_URL}/intake"
echo "PREVIEW_DEMAND_COLLECTION=atlas_demands_f57_preview"
echo "API_VERSION=0.8.0"
echo "GOOGLE_GENAI_USE_VERTEXAI=true"
echo "STABLE_API_URL=${STABLE_API_URL}"
echo "STABLE_WEB_URL=${STABLE_WEB_URL}"
echo "STABLE_SERVICES_UNCHANGED=${STABLE_API_SERVICE},${STABLE_WEB_SERVICE}"
