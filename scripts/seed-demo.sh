#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
if [[ "${NODE_ENV:-development}" == "production" ]]; then
  echo "Demo seeding is forbidden in production." >&2
  exit 1
fi
if [[ "${CONFIRM_DEMO_SEED:-}" != "yes" ]]; then
  echo "Set CONFIRM_DEMO_SEED=yes to run the existing demo seed explicitly." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$project_root/.env"
set +a
(cd "$project_root" && npm run seed)
