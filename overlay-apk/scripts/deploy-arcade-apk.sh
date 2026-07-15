#!/usr/bin/env bash
# Build (optional), install, and start the Hail overlay listener on Arcade Google TV.
#
# Praxis protocol: objects/protocols/arcade-hail-overlay-live-deploy.md
# Praxis #173: adb install does not start the listener — launcher trampoline must run
# after every install so LCARD send and /health work without manual TV interaction.
#
# Usage:
#   ./scripts/deploy-arcade-apk.sh              # install existing debug APK + start listener
#   ./scripts/deploy-arcade-apk.sh --build      # assembleDebug then deploy
#   ./scripts/deploy-arcade-apk.sh --apk /path/to.apk
#
# Env:
#   ADB_TARGET   default 192.168.68.105:5555
#   TV_HOST      default 192.168.68.105 (HTTP health host)
#   TV_PORT      default 8765
#   LCARD_ENV    default ../.env (broker secret for --build)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LCARD_ENV="${LCARD_ENV:-$ROOT/../.env}"
ADB_TARGET="${ADB_TARGET:-192.168.68.105:5555}"
TV_HOST="${TV_HOST:-192.168.68.105}"
TV_PORT="${TV_PORT:-8765}"
APK_PATH="${APK_PATH:-$ROOT/app/build/outputs/apk/debug/app-debug.apk}"
LAUNCHER_COMPONENT="com.controlalt.hailoverlay/.LauncherStartActivity"
PACKAGE="com.controlalt.hailoverlay"
DO_BUILD=0
DO_CONNECT=1

usage() {
  sed -n '1,16p' "$0"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) DO_BUILD=1; shift ;;
    --no-connect) DO_CONNECT=0; shift ;;
    --apk)
      shift
      APK_PATH="${1:?--apk requires a path}"
      shift
      ;;
    --apk=*) APK_PATH="${1#--apk=}"; shift ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ $DO_BUILD -eq 1 ]]; then
  if [[ -f "$LCARD_ENV" ]]; then
    # shellcheck disable=SC1090
    set -a
    source <(grep -E '^LCARD_OVERLAY_BROKER_SECRET=' "$LCARD_ENV" | sed 's/\r$//')
    set +a
  fi
  if [[ -z "${LCARD_OVERLAY_BROKER_SECRET:-}" ]]; then
    echo "LCARD_OVERLAY_BROKER_SECRET is required for --build. Set in $LCARD_ENV or export." >&2
    exit 1
  fi
  export JAVA_HOME="${JAVA_HOME:-$ROOT/.tools/jdk-17}"
  echo "Building debug APK ..."
  (cd "$ROOT" && ./gradlew :app:assembleDebug)
fi

if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found: $APK_PATH (use --build or --apk)" >&2
  exit 1
fi

if [[ $DO_CONNECT -eq 1 ]]; then
  echo "Connecting adb to $ADB_TARGET ..."
  adb connect "$ADB_TARGET" >/dev/null
fi

echo "Installing $APK_PATH on $ADB_TARGET ..."
adb -s "$ADB_TARGET" install -r "$APK_PATH"

echo "Ensuring overlay permission ..."
adb -s "$ADB_TARGET" shell appops set "$PACKAGE" SYSTEM_ALERT_WINDOW allow >/dev/null || true

echo "Starting listener (launcher trampoline) ..."
adb -s "$ADB_TARGET" shell am start -n "$LAUNCHER_COMPONENT" >/dev/null

sleep 5

HEALTH_URL="http://${TV_HOST}:${TV_PORT}/health"
echo "Health check: $HEALTH_URL"
HEALTH="$(curl -fsS "$HEALTH_URL")"
echo "$HEALTH"

if ! python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('status')=='ok' else 1)" <<<"$HEALTH"; then
  echo "FAIL: overlay listener not healthy after deploy" >&2
  exit 1
fi

echo "OK: Arcade Hail listener ready on $TV_HOST:$TV_PORT"
