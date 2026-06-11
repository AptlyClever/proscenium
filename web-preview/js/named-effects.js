/**
 * Lane 3 — Axiom Hails named effect registry (preview workbench).
 *
 * Runtime/end-user model: effect_id ∈ { none, pop, burst, transporter }.
 * Legacy workbench presets (clean_hail, transporter_soft, …) map 1:1 for
 * renderer params and animation profiles until contract gains named blocks.
 */

import { getAnimationProfile } from "./animation-profile.js";

/** Canonical named effect ids — primary runtime selection model. */
export const NAMED_EFFECT_IDS = ["none", "pop", "burst", "transporter"];

export const NAMED_EFFECT_LABELS = {
  none: "None",
  pop: "Pop",
  burst: "Burst",
  transporter: "Transporter",
};

const NAMED_EFFECT_INTENTS = {
  none: "Static hail — immediate or soft appear/clear, no transport field",
  pop: "Quick punchy entrance — 150–350ms, 0–8 particles, no stable residual",
  burst: "Stronger materialization burst — 500–900ms entrance, size-capped particles",
  transporter:
    "Contained transport field inside Paint Box — field establishes before glyph materializes",
};

/** Handoff timing guidance (ms ranges) — Lane 5 may refine behavior. */
const NAMED_EFFECT_TIMING = {
  none: {
    entrance_ms: { min: 0, max: 200, default: 120 },
    exit_ms: { min: 0, max: 200, default: 120 },
    stable_residual_particles: { min: 0, max: 0, default: 0 },
  },
  pop: {
    entrance_ms: { min: 150, max: 350, default: 280 },
    exit_ms: { min: 150, max: 300, default: 240 },
    stable_residual_particles: { min: 0, max: 0, default: 0 },
  },
  burst: {
    entrance_ms: { min: 500, max: 900, default: 680 },
    exit_ms: { min: 350, max: 700, default: 520 },
    stable_residual_particles: { min: 0, max: 8, default: 4 },
  },
  transporter: {
    entrance_ms: { min: 1200, max: 1800, default: 1500 },
    exit_ms: { min: 900, max: 1400, default: 1150 },
    stable_residual_particles: { min: 0, max: 0, default: 0 },
  },
};

/**
 * Lane 3 handoff legacy mapping (canonical for preview registry).
 * Note: contract legacyEffectPresets may still list transporter_dense→transporter (L1);
 * registry applies HANDOFF_LEGACY_OVERRIDES for transporter_dense→burst.
 */
export const LEGACY_PRESET_TO_NAMED = {
  clean_hail: "none",
  transporter_soft: "transporter",
  transporter_dense: "burst",
  subtle_ping: "pop",
  high_attention: "burst",
};

const HANDOFF_LEGACY_OVERRIDES = {
  transporter_dense: "burst",
  high_attention: "burst",
};

/** Primary legacy preset used to hydrate renderer + animation from contract. */
export const NAMED_TO_LEGACY_PRESET = {
  none: "clean_hail",
  pop: "subtle_ping",
  burst: "transporter_dense",
  transporter: "transporter_soft",
};

export function isNamedEffectId(value) {
  return NAMED_EFFECT_IDS.includes(value);
}

export function normalizeNamedEffectId(effectId) {
  if (isNamedEffectId(effectId)) {
    return effectId;
  }
  if (effectId && LEGACY_PRESET_TO_NAMED[effectId]) {
    return LEGACY_PRESET_TO_NAMED[effectId];
  }
  return "transporter";
}

function contractLegacyAliases(contract) {
  const block =
    contract &&
    contract.previewVisual &&
    contract.previewVisual.legacyEffectPresets;
  return (block && block.aliasesToNamedEffects) || null;
}

export function legacyPresetToNamed(presetId, contract) {
  if (presetId && HANDOFF_LEGACY_OVERRIDES[presetId]) {
    return HANDOFF_LEGACY_OVERRIDES[presetId];
  }
  const aliases = contractLegacyAliases(contract);
  if (aliases && aliases[presetId]) {
    return aliases[presetId];
  }
  return LEGACY_PRESET_TO_NAMED[presetId] || normalizeNamedEffectId(presetId);
}

export function namedEffectToLegacyPreset(namedId) {
  const id = normalizeNamedEffectId(namedId);
  return NAMED_TO_LEGACY_PRESET[id] || "transporter_soft";
}

/**
 * Resolve a named effect to animation profile + renderer params (via legacy preset).
 * @param {object} contract hail-render-contract.json
 * @param {string} effectId named effect id or legacy preset id
 */
function contractNamedEffectBlock(contract, id) {
  const ne = contract && contract.previewVisual && contract.previewVisual.namedEffects;
  if (!ne) {
    return null;
  }
  if (ne.effects && ne.effects[id]) {
    return ne.effects[id];
  }
  if (ne[id]) {
    return ne[id];
  }
  return null;
}

function timingFromContractBlock(block, fallback) {
  if (!block || !block.timingMs) {
    return fallback;
  }
  const t = block.timingMs;
  return {
    entrance_ms: t.entrance || fallback.entrance_ms,
    exit_ms: t.exit || fallback.exit_ms,
    stable: t.stable || "static",
    particles: block.particles || null,
    stableResidual: block.stableResidual || null,
  };
}

export function getNamedEffect(contract, effectId) {
  const id = normalizeNamedEffectId(effectId);
  const legacyPresetId = namedEffectToLegacyPreset(id);
  const contractBlock = contractNamedEffectBlock(contract, id);

  const animationProfile = getAnimationProfile(contract, legacyPresetId);
  const timing = timingFromContractBlock(
    contractBlock,
    NAMED_EFFECT_TIMING[id] || NAMED_EFFECT_TIMING.transporter,
  );
  const rawRendererParams =
    contract &&
    contract.previewVisual &&
    contract.previewVisual.effectPresets &&
    contract.previewVisual.effectPresets[legacyPresetId];

  return {
    effectId: id,
    label: (contractBlock && contractBlock.label) || NAMED_EFFECT_LABELS[id] || id,
    intent: (contractBlock && contractBlock.intent) || NAMED_EFFECT_INTENTS[id] || "",
    legacyPresetId: legacyPresetId,
    rendererParams: rawRendererParams || null,
    animationProfile: animationProfile,
    presetPresenceId: legacyPresetId,
    timing: timing,
    stableBeamSuppressed: id === "none" || id === "pop",
    effectImpactFloor:
      contractBlock && contractBlock.effectImpactFloor != null
        ? contractBlock.effectImpactFloor
        : id === "none"
          ? 0
          : id === "pop"
            ? 0.72
            : id === "burst"
              ? 0.78
              : 0.85,
    glyphResolveStyle:
      (contractBlock && contractBlock.glyphResolveStyle) ||
      (id === "none"
        ? "fade"
        : id === "pop"
          ? "overshoot_pop"
          : id === "burst"
            ? "center_snap"
            : "scan_resolve"),
    fieldStyle:
      (contractBlock && contractBlock.fieldStyle) ||
      (id === "none"
        ? "none"
        : id === "pop"
          ? "micro_flash"
          : id === "burst"
            ? "radial_bloom"
            : "vertical_phase"),
    particleStyle:
      (contractBlock && contractBlock.particleStyle) ||
      (id === "none"
        ? "none"
        : id === "pop"
          ? "tiny_sparks"
          : id === "burst"
            ? "radial_burst"
            : "scanfall"),
    messageRevealStyle:
      (contractBlock && contractBlock.messageRevealStyle) ||
      (id === "none"
        ? "fade"
        : id === "pop"
          ? "quick_follow"
          : id === "burst"
            ? "post_impact_fade"
            : "secondary_scan_fade"),
    sequence: contractBlock && contractBlock.sequence ? contractBlock.sequence : null,
  };
}

export function namedEffectIntent(effectId, contract) {
  return getNamedEffect(contract || {}, effectId).intent;
}

export function namedEffectHint(effectId, contract) {
  return namedEffectIntent(effectId, contract);
}

export function namedEffectLabel(effectId) {
  const id = normalizeNamedEffectId(effectId);
  return NAMED_EFFECT_LABELS[id] || id;
}
