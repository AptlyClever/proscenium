#!/usr/bin/env bash
# Step 15 — pop effect variety matrix on Away Team (Green quick ping).
#
# Usage:
#   ./scripts/trigger-away-team-pop-matrix.sh [--now]
#
# Room: away_team only. Compare pop ingress vs transporter baseline.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LCARD_ENV="${LCARD_ENV:-$ROOT/../.env}"
TV_HOST="${TV_HOST:-100.87.93.94}"
TV_PORT="${TV_PORT:-8765}"
WAIT_FOR_ENTER=1

for arg in "$@"; do
  case "$arg" in
    --now) WAIT_FOR_ENTER=0 ;;
    -h|--help)
      sed -n '1,10p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
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

HEALTH_URL="http://${TV_HOST}:${TV_PORT}/health"
SHOW_URL="http://${TV_HOST}:${TV_PORT}/hail/show"
SERVICE_ROOT="$(cd "$ROOT/../service" && pwd)"

echo "Room: away_team (Tailscale)"
echo "Checking overlay health at $HEALTH_URL ..."
curl -fsS "$HEALTH_URL"
echo

fire_effect() {
  local effect_id="$1"
  local label="$2"
  local hold_ms=5000
  local entrance_ms=680
  local exit_ms=400
  if [[ "$effect_id" == "transporter_beam" ]]; then
    hold_ms=5500
    entrance_ms=1900
    exit_ms=1400
  fi
  local wait_s=$(( (entrance_ms + hold_ms + exit_ms + 1500) / 1000 ))
  export EFFECT_ID="$effect_id"
  export LABEL="$label"
  export SHOW_URL
  export SERVICE_ROOT

  echo
  echo "=== Effect: $effect_id ($label) ==="
  if [[ "$WAIT_FOR_ENTER" -eq 1 ]]; then
    echo "Press Enter to play $effect_id on Away Team ($TV_HOST)."
    read -r
  fi

  node <<'NODE'
const path = require("path");
const { attachBrokerProofToOverlayPayload } = require(
  path.join(process.env.SERVICE_ROOT, "lib", "hail-overlay-broker-proof"),
);

const effectId = process.env.EFFECT_ID;
const holdMs = effectId === "pop" ? 5000 : 5500;
const entranceMs = effectId === "pop" ? 680 : 1900;
const exitMs = effectId === "pop" ? 400 : 1400;

const stickOledLayout = {
  paint_box: { left: 0, top: 0, width: 652.8, height: 453.6 },
  safe_zone: { left: 65.28, top: 45.36, width: 522.24, height: 362.88 },
  glyph_focus: {
    left: 169.728, top: 110.6784, width: 313.344, height: 232.2432,
    center_x: 326.4, center_y: 226.8,
  },
  effect_field: {
    left: 157.19424, top: 45.36, width: 338.41152, height: 362.88,
    center_x: 326.4, center_y: 226.8,
  },
  message_band: { left: 169.728, top: 342.9216, width: 313.344, height: 44.4528 },
};

const popIdentity = {
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
};

const payload = attachBrokerProofToOverlayPayload(
  {
    hail_id: `hail.variety.${effectId}.001`,
    effect_id: effectId,
    glyph_id: "default",
    palette_id: "axiom_dark_cyan",
    message: `${process.env.LABEL} - ${effectId}`,
    duration_ms: holdMs,
    placement_id: "upper_center",
    placement_mode: "preset",
    size_tier: "medium",
    priority_level: "green",
    package_schema_version: 2,
    reference_viewport: { width: 1920, height: 1080 },
    paint_box_screen: {
      left: 633.6, top: 129.6, width: 652.8, height: 453.6,
      placement_id: "upper_center", paint_box_tier: "medium",
    },
    layout_regions: stickOledLayout,
    message_entity: {
      text: `${process.env.LABEL} - ${effectId}`,
      sidekick_id: "message_band_fade",
      entrance_ms: 480,
      exit_ms: 360,
      opacity: 0.92,
      entrance_offset_ms: 0,
      exit_offset_ms: holdMs - 360,
      stable_hold_ms: holdMs,
    },
    palette_presentation: {
      palette_id: "axiom_dark_cyan",
      package_scrim_opacity: 0.2,
      message_backing_opacity: 0.5,
      message_color: "#F0FAF6",
      message_backing: "#121618",
    },
    lifecycle_timing: {
      entrance_animation_ms: entranceMs,
      exit_animation_ms: exitMs,
      stable_hold_ms: holdMs,
    },
    effect_identity: effectId === "pop" ? popIdentity : {
      glyph_resolve_style: "scan_resolve",
      field_style: "vertical_phase",
      particle_style: "scanfall",
      choreography_anchors: {
        effectStart: 0.05,
        glyphImpactPeak: 0.74,
        glyphLockIn: 0.9,
        glyphLockInOvershoot: 0.04,
        glyphResolveStart: 0.42,
        messageRevealStart: 0.82,
        stableReady: 0.95,
      },
    },
    effect_variation_id: effectId === "transporter_beam" ? "voyaging" : undefined,
    android_effect_tuning: effectId === "transporter_beam"
      ? { beam_intensity: 0.78, beam_scale: 1.0 }
      : undefined,
  },
  process.env,
);

fetch(process.env.SHOW_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify(payload),
})
  .then(async (res) => {
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
    console.log(text);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
NODE

  local wait_s=$(( (entrance_ms + hold_ms + exit_ms + 1500) / 1000 ))
  echo "Waiting ${wait_s}s for lifecycle ..."
  sleep "$wait_s"
}

fire_effect pop "Green quick ping"
fire_effect transporter_beam "Transporter baseline"

echo
echo "Pop variety matrix complete on Away Team ($TV_HOST)."
echo "Sign-off: pop reads as short punchy ping; transporter reads as full transmit."
