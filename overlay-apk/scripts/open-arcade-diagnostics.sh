#!/usr/bin/env bash
# Open Control Alt Hails diagnostics on Arcade Google TV (manual trigger UI).

set -euo pipefail

ADB_TARGET="${ADB_TARGET:-192.168.68.105:5555}"

adb -s "$ADB_TARGET" shell am start \
  -a com.controlalt.hailoverlay.action.OPEN_DIAGNOSTICS \
  -n com.controlalt.hailoverlay/.DiagnosticsActivity

echo "Diagnostics open on $ADB_TARGET — use the variation buttons when ready."
