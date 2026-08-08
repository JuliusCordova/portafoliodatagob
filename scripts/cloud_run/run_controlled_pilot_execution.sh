#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_DIR="${ATLAS_PILOT_EVIDENCE_DIR:-${REPO_ROOT}/docs/deployment/evidence/generated/${TIMESTAMP}}"
RUN_LOG="${OUTPUT_DIR}/controlled-pilot-run.log"
STANDARD_SMOKE_JSON="${OUTPUT_DIR}/standard-smoke.json"
AUTH_SMOKE_JSON="${OUTPUT_DIR}/authenticated-smoke.json"
EVIDENCE_MD="${OUTPUT_DIR}/pilot-evidence.md"

mkdir -p "${OUTPUT_DIR}"

touch "${RUN_LOG}"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "${RUN_LOG}"
}

run_and_capture() {
  local label="$1"
  local output_file="$2"
  shift 2
  log "START ${label}"
  set +e
  "$@" >"${output_file}" 2>&1
  local rc=$?
  set -e
  cat "${output_file}" >>"${RUN_LOG}"
  log "END ${label} rc=${rc}"
  return "${rc}"
}

required_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    log "Missing required environment variable: ${name}"
    exit 1
  fi
}

cd "${REPO_ROOT}"

log "ATLAS DataGob controlled pilot execution started"
log "Output directory: ${OUTPUT_DIR}"
log "Deploy execution flag: ${ATLAS_PILOT_EXECUTE_DEPLOY:-false}"
log "Standard smoke flag: ${ATLAS_PILOT_RUN_STANDARD_SMOKE:-true}"
log "Authenticated smoke flag: ${ATLAS_PILOT_RUN_AUTH_SMOKE:-true}"
log "Evidence generation flag: ${ATLAS_PILOT_GENERATE_EVIDENCE:-true}"

required_env ATLAS_GCP_PROJECT
required_env ATLAS_GCP_REGION
required_env ATLAS_API_SERVICE
required_env ATLAS_WEB_SERVICE

log "Validating Cloud Run environment"
bash scripts/cloud_run/validate_cloud_run_env.sh all | tee -a "${RUN_LOG}"

if [[ "${ATLAS_PILOT_EXECUTE_DEPLOY:-false}" == "true" ]]; then
  log "Deployment enabled. Deploying API first."
  bash scripts/cloud_run/deploy_api.sh | tee -a "${RUN_LOG}"

  log "Resolving API URL for Web internal base."
  export ATLAS_INTERNAL_API_BASE="$(gcloud run services describe "${ATLAS_API_SERVICE}" \
    --project "${ATLAS_GCP_PROJECT}" \
    --region "${ATLAS_GCP_REGION}" \
    --format='value(status.url)')"
  export ATLAS_API_URL="${ATLAS_INTERNAL_API_BASE}"
  log "Resolved ATLAS_API_URL=${ATLAS_API_URL}"

  log "Deploying Web."
  bash scripts/cloud_run/deploy_web.sh | tee -a "${RUN_LOG}"
else
  log "Deployment disabled. Skipping deploy_api.sh and deploy_web.sh."
fi

log "Resolving current Cloud Run service URLs."
export ATLAS_API_URL="${ATLAS_API_URL:-$(gcloud run services describe "${ATLAS_API_SERVICE}" \
  --project "${ATLAS_GCP_PROJECT}" \
  --region "${ATLAS_GCP_REGION}" \
  --format='value(status.url)')}"
export ATLAS_WEB_URL="${ATLAS_WEB_URL:-$(gcloud run services describe "${ATLAS_WEB_SERVICE}" \
  --project "${ATLAS_GCP_PROJECT}" \
  --region "${ATLAS_GCP_REGION}" \
  --format='value(status.url)')}"
log "Resolved ATLAS_API_URL=${ATLAS_API_URL}"
log "Resolved ATLAS_WEB_URL=${ATLAS_WEB_URL}"

if [[ "${ATLAS_PILOT_RUN_STANDARD_SMOKE:-true}" == "true" ]]; then
  log "Running standard Cloud Run smoke test."
  run_and_capture "standard-smoke" "${STANDARD_SMOKE_JSON}" python scripts/cloud_run/smoke_test_cloud_run.py
else
  log "Standard smoke skipped by ATLAS_PILOT_RUN_STANDARD_SMOKE=false."
  echo '{"skipped": true, "reason": "ATLAS_PILOT_RUN_STANDARD_SMOKE=false"}' >"${STANDARD_SMOKE_JSON}"
fi

if [[ "${ATLAS_PILOT_RUN_AUTH_SMOKE:-true}" == "true" ]]; then
  log "Running authenticated Cloud Run smoke test."
  run_and_capture "authenticated-smoke" "${AUTH_SMOKE_JSON}" python scripts/cloud_run/authenticated_smoke_test_cloud_run.py
else
  log "Authenticated smoke skipped by ATLAS_PILOT_RUN_AUTH_SMOKE=false."
  echo '{"skipped": true, "reason": "ATLAS_PILOT_RUN_AUTH_SMOKE=false"}' >"${AUTH_SMOKE_JSON}"
fi

if [[ "${ATLAS_PILOT_GENERATE_EVIDENCE:-true}" == "true" ]]; then
  log "Generating pilot evidence package."
  python scripts/cloud_run/collect_pilot_evidence.py \
    --standard-smoke "${STANDARD_SMOKE_JSON}" \
    --authenticated-smoke "${AUTH_SMOKE_JSON}" \
    --run-log "${RUN_LOG}" \
    --output "${EVIDENCE_MD}" | tee -a "${RUN_LOG}"
else
  log "Evidence generation skipped by ATLAS_PILOT_GENERATE_EVIDENCE=false."
fi

log "Controlled pilot execution completed."
log "Evidence output directory: ${OUTPUT_DIR}"
