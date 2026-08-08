#!/usr/bin/env bash
set -euo pipefail

validate_common() {
  : "${ATLAS_GCP_PROJECT:?Missing ATLAS_GCP_PROJECT}"
  : "${ATLAS_GCP_REGION:?Missing ATLAS_GCP_REGION}"
  : "${ATLAS_ARTIFACT_REPOSITORY:?Missing ATLAS_ARTIFACT_REPOSITORY}"
}

validate_api() {
  validate_common
  : "${ATLAS_API_SERVICE:?Missing ATLAS_API_SERVICE}"
  : "${ATLAS_API_IMAGE:?Missing ATLAS_API_IMAGE}"
  : "${ATLAS_DEMAND_REPOSITORY:?Missing ATLAS_DEMAND_REPOSITORY}"

  if [[ "${ATLAS_DEMAND_REPOSITORY}" == "firestore" ]]; then
    : "${ATLAS_FIRESTORE_PROJECT:?Missing ATLAS_FIRESTORE_PROJECT}"
    : "${ATLAS_FIRESTORE_COLLECTION:?Missing ATLAS_FIRESTORE_COLLECTION}"
  fi
}

validate_web() {
  validate_common
  : "${ATLAS_WEB_SERVICE:?Missing ATLAS_WEB_SERVICE}"
  : "${ATLAS_WEB_IMAGE:?Missing ATLAS_WEB_IMAGE}"
  : "${ATLAS_INTERNAL_API_BASE:?Missing ATLAS_INTERNAL_API_BASE}"
}

case "${1:-all}" in
  api)
    validate_api
    ;;
  web)
    validate_web
    ;;
  all)
    validate_api
    validate_web
    ;;
  *)
    echo "Usage: $0 [api|web|all]" >&2
    exit 1
    ;;
esac

echo "Cloud Run environment validation OK for ${1:-all}."
