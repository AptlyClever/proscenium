#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f docker-compose.dev.yml up -d
echo ""
echo "Fast dev preview: http://192.168.68.93:8197/ (file watch + auto-reload)"
echo "Stable preview:   http://192.168.68.93:8196/ (unchanged)"
