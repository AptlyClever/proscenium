#!/usr/bin/env bash
# Phase III stable-phase interest matrix on Away Team.
#
# Usage:
#   ./scripts/trigger-away-team-stable-interest-matrix.sh [--now]
#
# Room: away_team only. Hold on stable frame - glyph breathe, message at t=0, Yellow/Red rim pulse.

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

fire_priority() {
  local priority="$1"
  local code="$2"
  export PRIORITY="$priority"
  export CODE="$code"
  export SHOW_URL
  export SERVICE_ROOT

  echo
  echo "=== Priority: $priority ($code) - stable interest ==="
  if [[ "$WAIT_FOR_ENTER" -eq 1 ]]; then
    echo "Press Enter to play $priority on Away Team ($TV_HOST). Watch stable hold."
    read -r
  fi

  node <<'NODE'
const path = require("path");
const { attachBrokerProofToOverlayPayload } = require(
  path.join(process.env.SERVICE_ROOT, "lib", "hail-overlay-broker-proof"),
);

const priority = process.env.PRIORITY;
const presets = {
  green: { scrim: 0.2, plate: 0.5, rim: 0.06, shadow: 0.26, entrance: 1.0, shimmer: 0.32, rimPulse: false },
  yellow: { scrim: 0.26, plate: 0.64, rim: 0.14, shadow: 0.36, entrance: 1.1, shimmer: 0.368, rimPulse: true },
  red: { scrim: 0.34, plate: 0.78, rim: 0.2, shadow: 0.44, entrance: 1.18, shimmer: 0.41, rimPulse: true },
};
const kit = presets[priority] || presets.green;
const holdMs = 6500;

const payload = attachBrokerProofToOverlayPayload(
  {
    hail_id: `hail.stable.${priority}.001`,
    effect_id: "transporter_beam",
    glyph_id: "default",
    palette_id: "axiom_dark_cyan",
    message: `Stable ${priority.toUpperCase()} - hero-led hold`,
    duration_ms: holdMs,
    placement_id: "upper_center",
    placement_mode: "preset",
    size_tier: "medium",
    priority_level: priority,
    package_schema_version: 2,
    message_entity: {
      text: `Stable ${priority.toUpperCase()} - hero-led hold`,
      sidekick_id: "message_band_fade",
      entrance_ms: 480,
      exit_ms: 360,
      opacity: 0.92,
      entrance_offset_ms: 0,
      exit_offset_ms: holdMs - 360,
      stable_hold_ms: holdMs,
    },
    stable_interest: {
      stable_residual: "optional_glyph_local",
      glyph_breathe_amplitude: 0.06,
      glyph_shimmer_intensity: kit.shimmer,
      stable_rim_pulse_ms: 420,
      rim_pulse_enabled: kit.rimPulse,
    },
    presentation_entity: {
      preset_id: priority === "green" ? "operational" : priority === "yellow" ? "card_lift" : "cinematic",
      priority_level: priority,
      modifiers: {
        package_scrim_opacity: kit.scrim,
        message_backing_opacity: kit.plate,
        rim_glow_alpha: kit.rim,
        package_shadow_alpha: kit.shadow,
        entrance_presence_scale: kit.entrance,
      },
    },
    palette_presentation: {
      palette_id: "axiom_dark_cyan",
      backdrop_tint: "#0A2E24",
      package_scrim_opacity: kit.scrim,
      message_backing_opacity: kit.plate,
      message_backing: "#121618",
      message_color: "#F0FAF6",
      package_corner_radius_px: 12,
      message_plate_radius_px: 6,
      package_shadow_alpha: kit.shadow,
      rim_glow_alpha: kit.rim,
      entrance_presence_scale: kit.entrance,
    },
    android_effect_tuning: {
      beam_intensity: Math.min(1, 0.78 * kit.entrance),
      beam_scale: 1.0,
    },
    effect_variation_id: "voyaging",
    size_code: "M",
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

  echo "Waiting 12s before next priority ..."
  sleep 12
}

fire_priority green G
fire_priority yellow Y
fire_priority red R

echo
echo "Stable interest matrix complete on Away Team ($TV_HOST)."
echo "Sign-off: stable beam-off; glyph breathe; message at t=0; Yellow/Red rim pulse once."
