#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f docker-compose.dev.yml down
echo "Fast dev preview stopped (stable :8196 unaffected if running)"
