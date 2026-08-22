#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-${GOOGLE_CLOUD_PROJECT:-proyectopersonal-480420}}"
REGION="${REGION:-${GOOGLE_CLOUD_LOCATION:-us-central1}}"
PAGE_SIZE="${PAGE_SIZE:-100}"

command -v gcloud >/dev/null 2>&1 || { echo "ERROR: gcloud no disponible" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl no disponible" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq no disponible" >&2; exit 1; }

TOKEN="$(gcloud auth print-access-token)"
BASE_URL="https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/reasoningEngines"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RAW_FILE="${RAW_FILE:-/tmp/atlas-f56-agent-engines-${STAMP}.json}"
OUT_FILE="${OUT_FILE:-/tmp/atlas-f56-observed-agents-${STAMP}.json}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

printf '{"reasoningEngines":[' > "$RAW_FILE"
FIRST=1
PAGE_TOKEN=""
PAGE=0

while :; do
  PAGE=$((PAGE + 1))
  URL="${BASE_URL}?pageSize=${PAGE_SIZE}"
  if [[ -n "$PAGE_TOKEN" ]]; then
    URL+="&pageToken=$(python3 - <<PY
import urllib.parse
print(urllib.parse.quote('''$PAGE_TOKEN''', safe=''))
PY
)"
  fi

  PAGE_FILE="${TMP_DIR}/page-${PAGE}.json"
  HTTP_CODE="$(curl -sS -o "$PAGE_FILE" -w '%{http_code}' \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Accept: application/json' \
    "$URL")"

  if [[ "$HTTP_CODE" != "200" ]]; then
    echo "ERROR: Agent Platform list devolvio HTTP ${HTTP_CODE}" >&2
    cat "$PAGE_FILE" >&2
    exit 1
  fi

  if jq -e '.error' "$PAGE_FILE" >/dev/null 2>&1; then
    jq '.error' "$PAGE_FILE" >&2
    exit 1
  fi

  COUNT="$(jq '(.reasoningEngines // []) | length' "$PAGE_FILE")"
  if [[ "$COUNT" -gt 0 ]]; then
    while IFS= read -r ROW; do
      if [[ "$FIRST" -eq 0 ]]; then printf ',' >> "$RAW_FILE"; fi
      FIRST=0
      printf '%s' "$ROW" >> "$RAW_FILE"
    done < <(jq -c '.reasoningEngines[]?' "$PAGE_FILE")
  fi

  PAGE_TOKEN="$(jq -r '.nextPageToken // empty' "$PAGE_FILE")"
  [[ -z "$PAGE_TOKEN" ]] && break
done
printf ']}' >> "$RAW_FILE"

jq --arg project "$PROJECT" --arg location "$REGION" --arg observed_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
  def tail_id: (.name // "" | split("/") | last);
  def source_kind:
    if (.spec.sourceCodeSpec? != null) then "source_code"
    elif (.spec.containerSpec? != null) then "container"
    elif (.spec.packageSpec? != null) then "package"
    else null end;
  {
    discovery_contract_version: "f56-spike-v1",
    provider: "google-agent-platform",
    project_id: $project,
    location: $location,
    observed_at: $observed_at,
    total_reasoning_engines: ((.reasoningEngines // []) | length),
    total_google_adk: ([.reasoningEngines[]? | select((.spec.agentFramework // "") == "google-adk")] | length),
    agents: [
      .reasoningEngines[]?
      | select((.spec.agentFramework // "") == "google-adk")
      | {
          provider_agent_id: tail_id,
          resource_name: (.name // null),
          display_name: (.displayName // null),
          description: (.description // null),
          framework: (.spec.agentFramework // null),
          runtime_type: "vertex_ai_agent_engine",
          project_id: $project,
          location: $location,
          deployment_target: "reasoning_engine",
          model_name: null,
          resource_status: null,
          created_at: (.createTime // null),
          updated_at: (.updateTime // null),
          labels: (.labels // {}),
          service_account: (.spec.serviceAccount // null),
          identity_type: (.spec.identityType // null),
          deployment_source_kind: source_kind,
          discovery_source: "aiplatform.v1.projects.locations.reasoningEngines.list",
          last_observed_at: $observed_at,
          governance_status: "not_assessed",
          raw_observed: {
            etag: (.etag // null),
            encryption_spec_present: (.encryptionSpec? != null),
            class_method_count: ((.spec.classMethods // []) | length)
          }
        }
    ]
  }
' "$RAW_FILE" > "$OUT_FILE"

echo "=== ATLAS FEATURE 56 · ADK DISCOVERY SPIKE ==="
echo "PROJECT=$PROJECT"
echo "REGION=$REGION"
echo "RAW_FILE=$RAW_FILE"
echo "OUT_FILE=$OUT_FILE"
echo
jq '{total_reasoning_engines,total_google_adk,agents:[.agents[]|{provider_agent_id,display_name,framework,created_at,updated_at,service_account,deployment_source_kind,governance_status}]}' "$OUT_FILE"
echo
echo "[PASS] Discovery completed. No agent was modified."
