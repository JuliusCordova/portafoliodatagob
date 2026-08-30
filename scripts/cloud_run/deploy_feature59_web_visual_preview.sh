#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
AR_REPOSITORY="${AR_REPOSITORY:-atlas-datagob}"
PREVIEW_API_SERVICE="${PREVIEW_API_SERVICE:-atlas-datagob-api-f59-preview}"
PREVIEW_WEB_SERVICE="${PREVIEW_WEB_SERVICE:-atlas-datagob-web-f59-preview}"
STABLE_WEB_SERVICE="${STABLE_WEB_SERVICE:-atlas-datagob-web}"

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

# Next.js may rewrite next-env.d.ts during a successful local verify/build.
# Normalize only that exact, unstaged generated-file change. Any other dirty
# state (including staged/untracked changes) remains a hard safety stop.
DIRTY_STATE="$(git status --porcelain)"
if [[ -n "$DIRTY_STATE" ]]; then
  if [[ "$DIRTY_STATE" == " M apps/web/next-env.d.ts" ]]; then
    echo "F59 VISUAL · restoring generated apps/web/next-env.d.ts after Next.js verify"
    git restore --worktree -- apps/web/next-env.d.ts
  else
    echo "ERROR: working tree must be clean before F59 visual preview deploy" >&2
    git status --short >&2
    exit 1
  fi
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree remains dirty after generated-file normalization" >&2
  git status --short >&2
  exit 1
fi

SHA="$(git rev-parse HEAD)"
SHORT_SHA="${SHA:0:7}"
TAG="f59-visual-${SHORT_SHA}"
WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/atlas-datagob-web:${TAG}"

STABLE_BEFORE="$(mktemp /tmp/atlas-f59-visual-stable-before.XXXXXX.json)"
STABLE_AFTER="$(mktemp /tmp/atlas-f59-visual-stable-after.XXXXXX.json)"
WEB_ENV_FILE="$(mktemp /tmp/atlas-f59-visual-web-env.XXXXXX.yaml)"
cleanup() {
  rm -f "$STABLE_BEFORE" "$STABLE_AFTER" "$WEB_ENV_FILE"
}
trap cleanup EXIT

snapshot_stable() {
  gcloud run services describe "$STABLE_WEB_SERVICE" \
    --project "$PROJECT" --region "$REGION" --format=json \
    | jq '{url:.status.url, latestReadyRevisionName:.status.latestReadyRevisionName, latestCreatedRevisionName:.status.latestCreatedRevisionName}'
}

snapshot_stable > "$STABLE_BEFORE"

API_URL="$(gcloud run services describe "$PREVIEW_API_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
if [[ -z "$API_URL" ]]; then
  echo "ERROR: F59 preview API is not available" >&2
  exit 1
fi

curl -fsS \
  -H 'X-ATLAS-USER: feature59.visual@atlas.local' \
  -H 'X-ATLAS-ROLES: viewer' \
  "$API_URL/agent-governance/overview?days=14" \
  | jq -e '.agent_system_id == "ATLAS-DATAGOB" and (.summary.observed_agents // 0) >= 5' >/dev/null

echo "=== F59 VISUAL · BUILD WEB ONLY ==="
echo "SHA=${SHA}"
echo "WEB_IMAGE=${WEB_IMAGE}"
gcloud builds submit apps/web \
  --project "$PROJECT" \
  --tag "$WEB_IMAGE"

cat > "$WEB_ENV_FILE" <<YAML
ATLAS_INTERNAL_API_BASE: "${API_URL}"
ATLAS_WEB_IDENTITY_MODE: "static"
ATLAS_WEB_DEMO_USER: "feature59.dashboard@atlas.local"
ATLAS_WEB_DEMO_ROLES: "viewer"
YAML

echo "=== F59 VISUAL · DEPLOY WEB PREVIEW ONLY ==="
gcloud run deploy "$PREVIEW_WEB_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --platform managed \
  --image "$WEB_IMAGE" \
  --allow-unauthenticated \
  --env-vars-file "$WEB_ENV_FILE"

WEB_URL="$(gcloud run services describe "$PREVIEW_WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
WEB_REV="$(gcloud run services describe "$PREVIEW_WEB_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"

PAGE_STATUS="$(curl -sS -o /tmp/atlas-f59-visual-page.html -w '%{http_code}' "$WEB_URL/agent-governance")"
rm -f /tmp/atlas-f59-visual-page.html
if [[ "$PAGE_STATUS" != "200" ]]; then
  echo "ERROR: /agent-governance returned HTTP ${PAGE_STATUS}" >&2
  exit 1
fi

curl -fsS "$WEB_URL/api/agent-governance/overview?days=14" \
  | jq -e '.agent_system_id == "ATLAS-DATAGOB" and (.summary.observed_agents // 0) >= 5' >/dev/null

snapshot_stable > "$STABLE_AFTER"
if ! diff -u "$STABLE_BEFORE" "$STABLE_AFTER"; then
  echo "ERROR: stable Web changed during F59 visual-only preview deployment" >&2
  exit 1
fi

echo
echo "=== FEATURE 59 WEB VISUAL PREVIEW: CONFORME ==="
echo "SHA=${SHA}"
echo "WEB_URL=${WEB_URL}"
echo "WEB_REVISION=${WEB_REV}"
echo "AGENT_GOVERNANCE_URL=${WEB_URL}/agent-governance"
echo "WEB_IMAGE=${WEB_IMAGE}"
echo "AGENT_GOVERNANCE_API_REACHABLE=PASS"
echo "AGENT_GOVERNANCE_WEB=PASS"
echo "STABLE_WEB_UNCHANGED=PASS"
echo "WEB_ONLY_VISUAL_DEPLOY=PASS"
