#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
SERVICE="${PREVIEW_API_SERVICE:-atlas-datagob-api-f59-preview}"
DATASET="${ATLAS_AGENTOPS_DATASET:-agentops_f59_preview}"
TABLE="${PROJECT}.${DATASET}.agent_llm_usage"
RUNTIME_SA="${RUNTIME_SA:-atlas-datagob-runtime@${PROJECT}.iam.gserviceaccount.com}"
LOOKBACK="${LOOKBACK:-2h}"

for command in gcloud bq jq; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "ERROR: ${command} is required" >&2
    exit 1
  }
done

if [[ ! "$DATASET" =~ _preview$ ]]; then
  echo "ERROR: refusing non-preview dataset: ${DATASET}" >&2
  exit 1
fi

echo "=== F59 TELEMETRY DIAGNOSTICS ==="
echo "PROJECT=${PROJECT}"
echo "REGION=${REGION}"
echo "SERVICE=${SERVICE}"
echo "TABLE=${TABLE}"
echo

echo "=== 1. CLOUD RUN EFFECTIVE CONFIG ==="
gcloud run services describe "$SERVICE" \
  --project "$PROJECT" --region "$REGION" --format=json \
  | jq '{revision:.status.latestReadyRevisionName, serviceAccount:.spec.template.spec.serviceAccountName, env:(.spec.template.spec.containers[0].env | map(select(.name|test("ATLAS_AGENTOPS|ATLAS_ENVIRONMENT|GOOGLE_CLOUD_PROJECT"))) | map({name,value}))}'
echo

echo "=== 2. DATASET ACL ==="
bq --project_id="$PROJECT" show --format=prettyjson "${PROJECT}:${DATASET}" \
  | jq --arg sa "$RUNTIME_SA" '{location, runtimeWriter:[.access[]? | select(.userByEmail == $sa)]}'
echo

echo "=== 3. RECENT TELEMETRY ROWS (UNFILTERED) ==="
RECENT_JSON="$(bq --project_id="$PROJECT" --location="$REGION" query \
  --use_legacy_sql=false --format=json \
  "SELECT agent_system_id, run_id, trace_id, session_id, agent_id, model_name, input_tokens, output_tokens, total_tokens, latency_ms, status, requested_by, observed_at
   FROM \`${TABLE}\`
   WHERE observed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR)
   ORDER BY observed_at DESC
   LIMIT 100")"
echo "$RECENT_JSON" | jq .
ROW_COUNT="$(jq 'length' <<<"$RECENT_JSON")"
echo "RECENT_ROW_COUNT=${ROW_COUNT}"
echo

echo "=== 4. AGENTOPS CLOUD RUN LOGS (${LOOKBACK}) ==="
gcloud logging read \
  "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE}\" AND (textPayload:\"AgentOps\" OR jsonPayload.message:\"AgentOps\" OR textPayload:\"BigQuery\" OR jsonPayload.message:\"BigQuery\")" \
  --project "$PROJECT" --freshness "$LOOKBACK" --limit 100 \
  --format='table(timestamp,severity,textPayload,jsonPayload.message)' || true
echo

echo "=== 5. DIAGNOSIS HINT ==="
if [[ "$ROW_COUNT" -gt 0 ]]; then
  echo "Rows exist. The previous smoke may have filtered them out by requested_by or queried before they became visible."
  echo "Compare requested_by/run_id/session_id above with the smoke user and session." 
else
  echo "No recent rows exist. Inspect the AgentOps/BigQuery logs above."
  echo "- Permission/schema errors => persistence path problem."
  echo "- No AgentOps logs at all => callbacks or ATLAS_AGENTOPS_ENABLED path did not execute."
fi
