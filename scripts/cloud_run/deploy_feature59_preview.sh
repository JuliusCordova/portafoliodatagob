#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "F59 preview now uses a dedicated preview runtime identity and isolated governance snapshot."
exec "${SCRIPT_DIR}/deploy_feature59_preview_isolated_identity.sh" "$@"
