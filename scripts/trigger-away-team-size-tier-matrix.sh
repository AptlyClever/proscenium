#!/usr/bin/env bash
# Fire small → medium → large transporter hails on Away Team Google TV (Tailscale).
#
# Usage:
#   ./scripts/trigger-away-team-size-tier-matrix.sh [--now]
#
# Room scope (locked): away_team only — do NOT use Arcade or Master Bedroom for this gate.
# Without --now, waits for Enter between each tier so you can compare Paint Box scale on screen.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LCARD_ENV="${LCARD_ENV:-$ROOT/../.env}"
TV_HOST="${TV_HOST:-100.87.93.94}"
TV_PORT="${TV_PORT:-8765}"
WAIT_FOR_ENTER=1

for arg in "$@"; do
  case "$arg" in
    --now)
      WAIT_FOR_ENTER=0
      ;;
    -h|--help)
      sed -n '1,14p' "$0"
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

fire_tier() {
  local tier="$1"
  local code="$2"
  export TIER="$tier"
  export CODE="$code"
  export SHOW_URL
  export SERVICE_ROOT

  echo
  echo "=== Tier: $tier ($code) ==="
  if [[ "$WAIT_FOR_ENTER" -eq 1 ]]; then
    echo "Press Enter to play $tier on Away Team ($TV_HOST) (Ctrl+C to abort)."
    read -r
  fi

  node <<'NODE'
const path = require("path");
const { attachBrokerProofToOverlayPayload } = require(
  path.join(process.env.SERVICE_ROOT, "lib", "hail-overlay-broker-proof"),
);

const payload = attachBrokerProofToOverlayPayload(
  {
    hail_id: `hail.size_tier.${process.env.TIER}.001`,
    effect_id: "transporter_beam",
    glyph_id: "default",
    palette_id: "axiom_dark_cyan",
    message: `Size tier ${process.env.TIER.toUpperCase()} check`,
    duration_ms: 4500,
    placement_id: "upper_center",
    placement_mode: "preset",
    size_tier: process.env.TIER,
    size_code: process.env.CODE,
    effect_variation_id: "voyaging",
    android_effect_tuning: { beam_intensity: 0.78, beam_scale: 1.0 },
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
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    console.log(text);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
NODE

  echo "Waiting 9s for lifecycle to finish before next tier ..."
  sleep 9
}

fire_tier small S
fire_tier medium M
fire_tier large L

echo
echo "Size-tier matrix complete on Away Team ($TV_HOST)."
echo "Operator sign-off: small < medium < large Paint Box footprint on 1080p TV."
