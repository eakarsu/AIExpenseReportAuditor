#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
set -a
# shellcheck disable=SC1091
source "$project_root/.env"
set +a
: "${DATABASE_URL:?DATABASE_URL is required}"
for migration in "$project_root/server/migrations/"*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done
