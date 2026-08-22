#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-proyectopersonal-480420}"
REGION="${REGION:-us-central1}"
API_SERVICE="${API_SERVICE:-atlas-datagob-api-f56-preview}"
DEPLOYMENT_ID="${DEPLOYMENT_ID:-google-adk:8881601491744325632}"
CANONICAL_NAME="${CANONICAL_NAME:-Ayniq IaC Agent · Feature 56 E2E}"
ACTOR="${ACTOR:-feature56.preview@atlas.local}"

for command in gcloud curl jq; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "ERROR: ${command} is required" >&2
    exit 1
  fi
done

if [[ ! -f data/governance/policies/catalog.json ]]; then
  echo "ERROR: run this script from the ATLAS DataGob repository root" >&2
  exit 1
fi

API_URL="${API_URL:-$(gcloud run services describe "$API_SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --format='value(status.url)')}"

if [[ -z "$API_URL" ]]; then
  echo "ERROR: could not resolve API preview URL" >&2
  exit 1
fi

AUTH_HEADERS=(
  -H "X-ATLAS-USER: ${ACTOR}"
  -H 'X-ATLAS-ROLES: data_steward,data_architect,executive'
)
JSON_HEADERS=(-H 'Content-Type: application/json')

api_get() {
  curl -fsS "${AUTH_HEADERS[@]}" "$API_URL/$1"
}

api_post() {
  local path="$1"
  local body="${2:-}"
  if [[ -n "$body" ]]; then
    curl -fsS -X POST "${AUTH_HEADERS[@]}" "${JSON_HEADERS[@]}" \
      -d "$body" "$API_URL/$path"
  else
    curl -fsS -X POST "${AUTH_HEADERS[@]}" "$API_URL/$path"
  fi
}

api_patch() {
  local path="$1"
  local body="$2"
  curl -fsS -X PATCH "${AUTH_HEADERS[@]}" "${JSON_HEADERS[@]}" \
    -d "$body" "$API_URL/$path"
}

echo "=== FEATURE 56 · CONTROLLED PREVIEW E2E ==="
echo "API_URL=${API_URL}"
echo "DEPLOYMENT_ID=${DEPLOYMENT_ID}"

DEPLOYMENTS_JSON="$(api_get agent-governance/deployments)"
DEPLOYMENT="$(jq -c --arg id "$DEPLOYMENT_ID" '.deployments[] | select(.deployment_id == $id)' <<<"$DEPLOYMENTS_JSON" | head -n1)"
if [[ -z "$DEPLOYMENT" ]]; then
  echo "ERROR: deployment ${DEPLOYMENT_ID} is not present in preview inventory" >&2
  exit 1
fi

echo "$DEPLOYMENT" | jq '{deployment_id, display_name, framework, binding_status, governed_agent_id}'

BOUND_AGENT_ID="$(jq -r '.governed_agent_id // empty' <<<"$DEPLOYMENT")"
AGENTS_JSON="$(api_get agent-governance/agents)"

if [[ -n "$BOUND_AGENT_ID" ]]; then
  AGENT_ID="$BOUND_AGENT_ID"
  echo "REUSE_BOUND_AGENT=${AGENT_ID}"
else
  AGENT_ID="$(jq -r --arg name "$CANONICAL_NAME" '.agents[] | select(.canonical_name == $name) | .agent_id' <<<"$AGENTS_JSON" | head -n1)"
  if [[ -z "$AGENT_ID" ]]; then
    CREATE_BODY="$(jq -nc --arg name "$CANONICAL_NAME" '{canonical_name:$name,description:"Controlled Feature 56 preview identity. Governance metadata is synthetic and exists only in preview collections."}')"
    CREATE_JSON="$(api_post agent-governance/agents "$CREATE_BODY")"
    AGENT_ID="$(jq -r '.agent.agent_id' <<<"$CREATE_JSON")"
    echo "CREATED_AGENT=${AGENT_ID}"
  else
    echo "REUSE_LOGICAL_AGENT=${AGENT_ID}"
  fi

  BIND_BODY="$(jq -nc --arg deployment "$DEPLOYMENT_ID" '{deployment_id:$deployment,environment:"preview",is_current:true}')"
  BIND_JSON="$(api_post "agent-governance/agents/${AGENT_ID}/deployments/bind" "$BIND_BODY")"
  echo "$BIND_JSON" | jq '{binding: .binding | {binding_id, agent_id, deployment_id, environment, is_current, binding_source}}'
fi

# Phase 1: complete governance context but intentionally leave mandatory control
# evidence empty. Deterministic assessment MUST return action_required.
PROFILE_PHASE1="$(jq -nc '{
  business_owner:"Feature56 Preview Business Owner",
  technical_owner:"Feature56 Preview Technical Owner",
  business_purpose:"Controlled validation of the external ATLAS Agent Governance control plane.",
  business_area:"ATLAS Product Engineering",
  environment:"preview",
  business_criticality:"medium",
  autonomy_level:"l1",
  risk_level:"medium",
  data_classification:["internal"],
  human_oversight:"required",
  writes_to_systems:false,
  required_controls:[],
  next_review_at:"2027-01-31T23:59:59+00:00",
  notes:"Synthetic governance metadata for Feature 56 isolated preview E2E only."
}')"

api_patch "agent-governance/agents/${AGENT_ID}/profile" "$PROFILE_PHASE1" >/dev/null
ASSESS1="$(api_post "agent-governance/agents/${AGENT_ID}/assess")"
STATUS1="$(jq -r '.assessment.status' <<<"$ASSESS1")"
SCORE1="$(jq -r '.assessment.score' <<<"$ASSESS1")"
FINDINGS1="$(jq -r '.findings | length' <<<"$ASSESS1")"
CONTROL_CHECK1="$(jq -r '.assessment.checks.mandatory_controls_registered' <<<"$ASSESS1")"

echo "=== PHASE 1 · EXPECT ACTION REQUIRED ==="
echo "$ASSESS1" | jq '{assessment: {assessment_id: .assessment.assessment_id, status: .assessment.status, score: .assessment.score, checks: .assessment.checks, policy_refs: .assessment.policy_refs}, findings: [.findings[] | {finding_id, check_key, policy_id, policy_version, severity, status, title}]}'

if [[ "$STATUS1" != "action_required" || "$CONTROL_CHECK1" != "false" || "$FINDINGS1" -lt 1 ]]; then
  echo "ERROR: phase 1 expected action_required with mandatory control finding" >&2
  exit 1
fi

# Phase 2: controls are sourced from the versioned local copy of the same ATLAS
# governance catalog contract. This marks the explicit preview evidence supplied by
# the governance operator; ATLAS never derives compliance from the LLM.
CONTROLS_JSON="$(jq -c '[
  .[]
  | select((.status // "active") == "active")
  | select((.applies_to.project_types // []) | index("agentic_ai"))
  | (.mandatory_controls // [])[]
] | unique' data/governance/policies/catalog.json)"

PROFILE_PHASE2="$(jq -nc --argjson controls "$CONTROLS_JSON" '{required_controls:$controls}')"
api_patch "agent-governance/agents/${AGENT_ID}/profile" "$PROFILE_PHASE2" >/dev/null
ASSESS2="$(api_post "agent-governance/agents/${AGENT_ID}/assess")"
STATUS2="$(jq -r '.assessment.status' <<<"$ASSESS2")"
SCORE2="$(jq -r '.assessment.score' <<<"$ASSESS2")"
FINDINGS2="$(jq -r '.findings | length' <<<"$ASSESS2")"

echo "=== PHASE 2 · EXPECT GOVERNED ==="
echo "$ASSESS2" | jq '{assessment: {assessment_id: .assessment.assessment_id, status: .assessment.status, score: .assessment.score, checks: .assessment.checks, policy_refs: .assessment.policy_refs, mandatory_controls: .assessment.mandatory_controls}, findings: .findings}'

if [[ "$STATUS2" != "governed" || "$SCORE2" != "100" || "$FINDINGS2" != "0" ]]; then
  echo "ERROR: phase 2 expected governed / score 100 / zero current findings" >&2
  exit 1
fi

FINDINGS_ALL="$(api_get agent-governance/findings)"
AGENT_FINDINGS="$(jq -c --arg agent "$AGENT_ID" '[.findings[] | select(.agent_id == $agent)]' <<<"$FINDINGS_ALL")"
OPEN_COUNT="$(jq '[.[] | select(.status == "open")] | length' <<<"$AGENT_FINDINGS")"
CLOSED_COUNT="$(jq '[.[] | select(.status == "closed")] | length' <<<"$AGENT_FINDINGS")"

if [[ "$OPEN_COUNT" != "0" || "$CLOSED_COUNT" -lt 1 ]]; then
  echo "ERROR: finding history was not preserved/closed as expected" >&2
  echo "$AGENT_FINDINGS" | jq . >&2
  exit 1
fi

SUMMARY="$(api_get agent-governance/summary)"
DETAIL="$(api_get "agent-governance/agents/${AGENT_ID}")"

echo "=== FINAL GOVERNED AGENT ==="
echo "$DETAIL" | jq '{agent: {agent_id: .agent.agent_id, canonical_name: .agent.canonical_name, governance_status: .agent.governance_profile.governance_status, risk_level: .agent.governance_profile.risk_level, autonomy_level: .agent.governance_profile.autonomy_level, deployment_count: (.agent.deployments | length), finding_history_count: (.agent.findings | length)}}'

echo "=== FINAL SUMMARY ==="
echo "$SUMMARY" | jq .

echo "=== FINDING HISTORY ==="
echo "$AGENT_FINDINGS" | jq '[.[] | {finding_id, check_key, policy_id, policy_version, severity, status, detected_at, resolved_at}]'

echo
echo "=== FEATURE 56 CONTROLLED E2E: CONFORME ==="
echo "AGENT_ID=${AGENT_ID}"
echo "DEPLOYMENT_ID=${DEPLOYMENT_ID}"
echo "PHASE1_STATUS=${STATUS1}"
echo "PHASE1_SCORE=${SCORE1}"
echo "PHASE2_STATUS=${STATUS2}"
echo "PHASE2_SCORE=${SCORE2}"
echo "CLOSED_FINDINGS=${CLOSED_COUNT}"
echo "OPEN_FINDINGS=${OPEN_COUNT}"
echo "RUNTIME_AGENT_MODIFIED=false"
