#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")" && pwd)"
if [[ ! -f "$project_root/.env" ]]; then
  echo "Missing .env. Copy .env.example and set real secrets." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$project_root/.env"
set +a

if [[ ! -d "$project_root/./node_modules" || ! -d "$project_root/client/node_modules" ]]; then
  echo "Dependencies are absent. Run ./scripts/bootstrap.sh explicitly." >&2
  exit 1
fi

backend_pid=""
frontend_pid=""
cleanup() {
  [[ -n "$backend_pid" ]] && kill "$backend_pid" 2>/dev/null || true
  [[ -n "$frontend_pid" ]] && kill "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "$project_root/." && node server/index.js) &
backend_pid=$!
(cd "$project_root/client" && npm run dev) &
frontend_pid=$!

echo "Started project-owned processes only: backend=$backend_pid frontend=$frontend_pid"
wait "$backend_pid" "$frontend_pid"
