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
api_port="${BACKEND_PORT:-${SERVER_PORT:-${PORT:-3001}}}"
ui_port="${FRONTEND_PORT:-${CLIENT_PORT:-3000}}"
if [[ "$api_port" == "$ui_port" ]]; then
  echo "Backend and frontend ports must be distinct." >&2
  exit 1
fi
for port in "$api_port" "$ui_port"; do
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use; refusing to terminate its owner." >&2
    exit 1
  fi
done

if [[ "${ALLOW_SCHEMA_MIGRATION:-false}" == "true" ]]; then
  "$project_root/scripts/migrate.sh"
  node "$project_root/server/create-admin.js"
fi

cleanup() {
  [[ -n "$backend_pid" ]] && kill "$backend_pid" 2>/dev/null || true
  [[ -n "$frontend_pid" ]] && kill "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "$project_root/." && BACKEND_PORT="$api_port" node server/index.js) &
backend_pid=$!
(cd "$project_root/client" && npm run dev -- --host "${HOST:-127.0.0.1}" --port "$ui_port" --strictPort) &
frontend_pid=$!

echo "Started project-owned processes only: backend=$backend_pid frontend=$frontend_pid"
wait "$backend_pid" "$frontend_pid"
