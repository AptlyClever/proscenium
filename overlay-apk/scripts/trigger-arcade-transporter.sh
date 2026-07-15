#!/usr/bin/env bash
# Fire a transporter hail on Arcade Google TV only when the operator is ready.
# Full lifecycle: entrance (~1.9s) + stable hold + exit (~1.4s).
#
# Usage:
#   ./scripts/trigger-arcade-transporter.sh [voyaging|generation-next|spoon] [--now]
#
# Without --now, waits for Enter so you can get in position before the hail plays.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LCARD_ENV="${LCARD_ENV:-$ROOT/../.env}"
TV_HOST="${TV_HOST:-192.168.68.105}"
TV_PORT="${TV_PORT:-8765}"

VARIATION="voyaging"
WAIT_FOR_ENTER=1

for arg in "$@"; do
  case "$arg" in
    voyaging|generation-next|spoon) VARIATION="$arg" ;;
    --now) WAIT_FOR_ENTER=0 ;;
    -h|--help)
      sed -n '1,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

case "$VARIATION" in
  voyaging)
    LABEL="Voyager"
    MESSAGE="Voyager transporter"
    PARTICLE="scanfall"
    CHOREO='{"glyphResolveStart":0.42,"glyphImpactPeak":0.74,"glyphLockIn":0.90,"messageRevealStart":0.82,"stableReady":0.95}'
    ;;
  generation-next)
    LABEL="TNG"
    MESSAGE="TNG transporter"
    PARTICLE="sparkle_rise"
    CHOREO='{"glyphResolveStart":0.38,"glyphImpactPeak":0.70,"glyphLockIn":0.88,"messageRevealStart":0.80,"stableReady":0.94}'
    ;;
  spoon)
    LABEL="Cardassian"
    MESSAGE="Cardassian transporter"
    PARTICLE="scanfall_dense"
    CHOREO='{"glyphResolveStart":0.40,"glyphImpactPeak":0.68,"glyphLockIn":0.86,"messageRevealStart":0.78,"stableReady":0.92}'
    ;;
esac

if [[ -f "$LCARD_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  source <(grep -E '^LCARD_OVERLAY_BROKER_SECRET=' "$LCARD_ENV" | sed 's/\r$//')
  set +a
fi

if [[ -z "${LCARD_OVERLAY_BROKER_SECRET:-}" ]]; then
  echo "LCARD_OVERLAY_BROKER_SECRET is not set. Export it or add to $LCARD_ENV" >&2
  exit 1
fi

HEALTH_URL="http://${TV_HOST}:${TV_PORT}/health"
SHOW_URL="http://${TV_HOST}:${TV_PORT}/hail/show"

echo "Checking overlay health at $HEALTH_URL ..."
HEALTH="$(curl -fsS "$HEALTH_URL")"
echo "$HEALTH"

echo
echo "Variation: $LABEL ($VARIATION)"
echo "Stable hold: 5.5s | Full lifecycle: ~8.8s (entrance + stable + exit)"
echo "Target: Arcade ($TV_HOST)"
echo

if [[ "$WAIT_FOR_ENTER" -eq 1 ]]; then
  echo "Press Enter when you are ready to watch the full hail, or Ctrl+C to cancel."
  read -r
fi

export VARIATION MESSAGE PARTICLE CHOREO SHOW_URL SERVICE_ROOT
SERVICE_ROOT="${LCARD_SERVICE_ROOT:-$(cd "$ROOT/../../control-alt-lcard/service" 2>/dev/null && pwd || true)}"
if [[ -z "$SERVICE_ROOT" ]]; then
  echo "ERROR: LCARD service not found. Set LCARD_SERVICE_ROOT to a control-alt-lcard/service checkout." >&2
  exit 1
fi
node <<'NODE'
const crypto = require("crypto");
const path = require("path");
const { attachBrokerProofToOverlayPayload } = require(
  path.join(process.env.SERVICE_ROOT, "lib", "hail-overlay-broker-proof"),
);

const payload = attachBrokerProofToOverlayPayload(
  {
    hail_id: `hail.operator.${process.env.VARIATION}`,
    effect_id: "transporter_beam",
    glyph_id: "default",
    palette_id: "axiom_dark_cyan",
    message: process.env.MESSAGE,
    duration_ms: 5500,
    placement_id: "upper_center",
    placement_mode: "preset",
    size_tier: "large",
    effect_variation_id: process.env.VARIATION,
    android_effect_tuning: { beam_intensity: 0.78, beam_scale: 1.0 },
    effect_identity: {
      particle_style: process.env.PARTICLE,
      choreography_anchors: JSON.parse(process.env.CHOREO),
    },
  },
  process.env,
);

fetch(process.env.SHOW_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify(payload),
})
  .then(async (response) => {
    const body = await response.json();
    if (!response.ok) {
      console.error("Hail rejected:", body);
      process.exit(1);
    }
    console.log(JSON.stringify(body, null, 2));
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
NODE
