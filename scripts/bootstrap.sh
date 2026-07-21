#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "$0")/.." && pwd)"
(cd "$project_root/." && npm ci)
(cd "$project_root/client" && npm ci)
echo "Locked dependencies installed. No database changes were made."
