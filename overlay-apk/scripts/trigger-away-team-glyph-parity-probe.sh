#!/usr/bin/env bash
# Phase A — TV glyph parity probe on Away Team (Tailscale).
#
# Fires five procedural glyph cases via POST /hail/show with broker proof.
# Captures HTTP responses, ADB screencaps, and logcat snippets per case.
#
# Usage:
#   ./scripts/trigger-away-team-glyph-parity-probe.sh [--now] [--case baseline|fill_paths|circles|depth_layers|round_caps]
#
# Room scope (locked): away_team only — 100.87.93.94:8765

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LCARD_ENV="${LCARD_ENV:-$ROOT/../.env}"
TV_HOST="${TV_HOST:-100.87.93.94}"
TV_PORT="${TV_PORT:-8765}"
ADB_SERIAL="${ADB_SERIAL:-${TV_HOST}:5555}"
WAIT_FOR_ENTER=1
CASE_FILTER=""
ARTIFACT_DIR="${ARTIFACT_DIR:-$ROOT/../reports/tv-glyph-parity-probe-artifacts}"

for arg in "$@"; do
  case "$arg" in
    --now) WAIT_FOR_ENTER=0 ;;
    --case=*) CASE_FILTER="${arg#--case=}" ;;
    --case)
      echo "Use --case=name" >&2
      exit 1
      ;;
    -h|--help)
      sed -n '1,18p' "$0"
      exit 0
      ;;
    *)
      if [[ -z "$CASE_FILTER" && "$arg" != --* ]]; then
        CASE_FILTER="$arg"
      else
        echo "Unknown argument: $arg" >&2
        exit 1
      fi
      ;;
  esac
done

if [[ -f "$LCARD_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^LCARD_OVERLAY_BROKER_SECRET=' "$LCARD_ENV" | sed 's/\r$//')
  set +a
fi

if [[ -z "${LCARD_OVERLAY_BROKER_SECRET:-}" ]]; then
  echo "LCARD_OVERLAY_BROKER_SECRET is not set. Export it or add to $LCARD_ENV" >&2
  exit 1
fi

ADB="${ROOT}/.tools/android-sdk/platform-tools/adb"
HEALTH_URL="http://${TV_HOST}:${TV_PORT}/health"
SHOW_URL="http://${TV_HOST}:${TV_PORT}/hail/show"
SERVICE_ROOT="${LCARD_SERVICE_ROOT:-$(cd "$ROOT/../../control-alt-lcard/service" 2>/dev/null && pwd || true)}"
if [[ -z "$SERVICE_ROOT" ]]; then
  echo "ERROR: LCARD service not found. Set LCARD_SERVICE_ROOT to a control-alt-lcard/service checkout." >&2
  exit 1
fi
PROBE_NODE="$ROOT/scripts/lib/glyph-parity-probe-cases.js"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$ARTIFACT_DIR/$TIMESTAMP"

echo "Room: away_team (Tailscale)"
echo "Artifacts: $ARTIFACT_DIR/$TIMESTAMP"
echo "Checking overlay health at $HEALTH_URL ..."
curl -fsS "$HEALTH_URL"
echo

if [[ -x "$ADB" ]]; then
  "$ADB" connect "$TV_HOST" >/dev/null 2>&1 || true
fi

fire_case() {
  local case_id="$1"
  export CASE_ID="$case_id"
  export SHOW_URL
  export SERVICE_ROOT
  export PROBE_NODE
  export ARTIFACT_DIR
  export TIMESTAMP

  echo
  echo "=== Probe: $case_id ==="
  if [[ "$WAIT_FOR_ENTER" -eq 1 ]]; then
    echo "Press Enter to fire $case_id on Away Team ($TV_HOST) (Ctrl+C to abort)."
    read -r
  fi

  local out_json="$ARTIFACT_DIR/$TIMESTAMP/${case_id}.response.json"
  local cap_png="$ARTIFACT_DIR/$TIMESTAMP/${case_id}.screencap.png"
  local log_txt="$ARTIFACT_DIR/$TIMESTAMP/${case_id}.logcat.txt"

  node <<'NODE'
const fs = require("fs");
const path = require("path");
const { attachBrokerProofToOverlayPayload } = require(
  path.join(process.env.SERVICE_ROOT, "lib", "hail-overlay-broker-proof"),
);
const { buildProbeCase } = require(process.env.PROBE_NODE);

const caseId = process.env.CASE_ID;
const probe = buildProbeCase(caseId);
if (!probe) {
  console.error(`Unknown probe case: ${caseId}`);
  process.exit(1);
}

const payload = attachBrokerProofToOverlayPayload(
  {
    hail_id: `hail.glyph_probe.${caseId}.001`,
    effect_id: "pop",
    glyph_id: "custom-glyph-parity-probe",
    palette_id: "axiom_dark_cyan",
    message: `Probe ${caseId}`,
    duration_ms: 6000,
    placement_id: "upper_center",
    placement_mode: "preset",
    size_tier: "large",
    size_code: "L",
    glyph_render: {
      kind: "procedural",
      glyph_id: "custom-glyph-parity-probe",
      google_tv_deliverable: true,
      procedural_graph: probe.graph,
    },
    lifecycle_timing: {
      entrance_animation_ms: 680,
      exit_animation_ms: 400,
      stable_hold_ms: 4500,
    },
    effect_identity: {
      glyph_resolve_style: "overshoot_pop",
      field_style: "micro_flash",
      particle_style: "tiny_sparks",
      choreography_anchors: {
        effectStart: 0,
        glyphImpactPeak: 0.4,
        glyphLockIn: 0.6,
        glyphLockInOvershoot: 0.08,
        glyphResolveStart: 0.08,
        messageRevealStart: 0.58,
        stableReady: 0.75,
      },
    },
  },
  process.env,
);

(async () => {
  const res = await fetch(process.env.SHOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  const record = {
    case_id: caseId,
    http_status: res.status,
    ok: res.ok,
    body,
    graph_signature: probe.graph.signature,
    path_count: probe.graph.paths.length,
    circle_count: (probe.graph.circles || []).length,
    notes: probe.notes,
  };
  const outPath = path.join(
    process.env.ARTIFACT_DIR,
    process.env.TIMESTAMP,
    `${caseId}.response.json`,
  );
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
  console.log(JSON.stringify(record, null, 2));
  if (!res.ok) {
    process.exit(1);
  }
})();
NODE

  echo "Waiting 3.5s for stable glyph frame ..."
  sleep 3.5

  if [[ -x "$ADB" ]]; then
    if "$ADB" -s "$ADB_SERIAL" exec-out screencap -p > "$cap_png" 2>/dev/null; then
      echo "Screencap: $cap_png"
    else
      echo "Screencap skipped (adb unavailable or device offline)"
    fi
    "$ADB" -s "$ADB_SERIAL" logcat -d -t 40 --pid="$("$ADB" -s "$ADB_SERIAL" shell pidof com.controlalt.hailoverlay 2>/dev/null || echo 0)" 2>/dev/null \
      | rg -i "glyph|path|compose|error|exception|parit" > "$log_txt" || true
    echo "Logcat snippet: $log_txt"
  fi

  echo "Waiting 7s before next case ..."
  sleep 7
}

ALL_CASES=(baseline fill_paths circles depth_layers round_caps)
CASES=()
if [[ -n "$CASE_FILTER" ]]; then
  CASES=("$CASE_FILTER")
else
  CASES=("${ALL_CASES[@]}")
fi

for c in "${CASES[@]}"; do
  fire_case "$c"
done

echo
echo "Probe complete. Artifacts under $ARTIFACT_DIR/$TIMESTAMP"
echo "Summarize into ctrl-alt-axiom:reports/tv-glyph-parity-probe-v001.md"
