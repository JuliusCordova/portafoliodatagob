#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-proyectopersonal-480420}}"
DATASET="${ATLAS_AGENTOPS_DATASET:-agentops_f59_preview}"
LOCATION="${ATLAS_AGENTOPS_LOCATION:-us-central1}"
SCHEMA_FILE="${ATLAS_AGENTOPS_SCHEMA_FILE:-data/agent_governance/bigquery_schema_v1.sql}"

if [[ ! "$DATASET" =~ _preview$ ]]; then
  echo "ERROR: F59 setup refuses non-preview dataset '$DATASET'. Expected suffix: _preview" >&2
  exit 2
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "ERROR: schema file not found: $SCHEMA_FILE" >&2
  exit 2
fi

command -v bq >/dev/null 2>&1 || {
  echo "ERROR: bq CLI is required." >&2
  exit 2
}

TMP_SQL="$(mktemp)"
trap 'rm -f "$TMP_SQL"' EXIT

python - "$SCHEMA_FILE" "$TMP_SQL" "$PROJECT_ID" "$DATASET" <<'PY'
from pathlib import Path
import sys

source, target, project_id, dataset = sys.argv[1:]
sql = Path(source).read_text(encoding="utf-8")
sql = sql.replace("${PROJECT_ID}", project_id).replace("${DATASET}", dataset)
Path(target).write_text(sql, encoding="utf-8")
PY

if ! bq --project_id="$PROJECT_ID" --location="$LOCATION" show --dataset "${PROJECT_ID}:${DATASET}" >/dev/null 2>&1; then
  echo "Creating isolated preview dataset ${PROJECT_ID}:${DATASET} in ${LOCATION}..."
  bq --project_id="$PROJECT_ID" --location="$LOCATION" mk \
    --dataset \
    --description="ATLAS DataGob F59 isolated AgentOps preview" \
    "${PROJECT_ID}:${DATASET}"
else
  echo "Dataset already exists: ${PROJECT_ID}:${DATASET}"
fi

echo "Applying SPEC-059 analytical schema..."
bq --project_id="$PROJECT_ID" --location="$LOCATION" query \
  --use_legacy_sql=false \
  < "$TMP_SQL"

EXPECTED_TABLES=(
  agent_runs
  agent_run_steps
  agent_llm_usage
  agent_artifacts
  agent_evaluation_evidence
  agent_alerts
  agent_health_snapshots
  agent_cost_attribution
)

printf '\n=== F59 BIGQUERY PREVIEW ===\n'
printf 'PROJECT_ID=%s\n' "$PROJECT_ID"
printf 'DATASET=%s\n' "$DATASET"
printf 'LOCATION=%s\n' "$LOCATION"

for table in "${EXPECTED_TABLES[@]}"; do
  if bq --project_id="$PROJECT_ID" show --format=none "${PROJECT_ID}:${DATASET}.${table}" >/dev/null 2>&1; then
    printf '%-34s %s\n' "$table" "PASS"
  else
    printf '%-34s %s\n' "$table" "MISSING"
    exit 1
  fi
done

echo "F59_BIGQUERY_PREVIEW=PASS"
