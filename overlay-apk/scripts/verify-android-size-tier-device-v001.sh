#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_ROOT="${LCARD_SERVICE_ROOT:-$(cd "$ROOT/../../control-alt-lcard/service" 2>/dev/null && pwd || true)}"
if [[ -z "$SERVICE_ROOT" ]]; then
  echo "ERROR: LCARD service not found. Set LCARD_SERVICE_ROOT to a control-alt-lcard/service checkout." >&2
  exit 1
fi
# Operator runbook lives in the LCARD repo alongside its service.
LCARD_REPO_ROOT="$(cd "$SERVICE_ROOT/.." && pwd)"

echo "==> verify-android-size-tier-device-v001"
echo "    overlay: $ROOT"
echo "    service: $SERVICE_ROOT"

echo "==> LCARD contract + adapter smoke"
node "$SERVICE_ROOT/scripts/smoke-android-size-tier-contract.js"
node "$SERVICE_ROOT/scripts/smoke-axiom-hail-delivery-adapter.js"

echo "==> Android unit tests (PaintBoxTier + PaintBoxLayout)"
cd "$ROOT"
./gradlew :app:testDebugUnitTest \
  --tests com.controlalt.hailoverlay.PaintBoxTierTest \
  --tests com.controlalt.hailoverlay.PaintBoxLayoutTest \
  -q

REPORT="$LCARD_REPO_ROOT/reports/lcard-android-size-tier-device-v001.md"
if [[ ! -f "$REPORT" ]]; then
  echo "ERROR: missing operator runbook $REPORT" >&2
  exit 1
fi

if [[ "${ANDROID_SIZE_TIER_LIVE_SKIP:-}" == "1" ]]; then
  echo "==> Live TV check skipped (ANDROID_SIZE_TIER_LIVE_SKIP=1)"
else
  TV_HOST="${TV_HOST:-100.87.93.94}"
  TV_PORT="${TV_PORT:-8765}"
  HEALTH_URL="http://${TV_HOST}:${TV_PORT}/health"
  echo "==> Away Team overlay health ($HEALTH_URL)"
  if curl -fsS --max-time 8 "$HEALTH_URL" >/dev/null; then
    echo "    overlay healthy — run ./scripts/trigger-away-team-size-tier-matrix.sh for operator visual proof"
  else
    echo "WARN: Away Team overlay not reachable; structural gate passed, device matrix still required for step exit" >&2
  fi
fi

echo "verify-android-size-tier-device-v001: structural OK"
