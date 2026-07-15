#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose build
docker compose up -d
echo ""
echo "Stable preview rebuilt: http://192.168.68.93:8196/"
