/**
 * Apply Axiom consumer render-payload fields to LCARD web-preview workbench state.
 * Variation profile + merged effect_identity come from Axiom — not redefined here.
 */

import { mergeEffectParams } from "./effect-config.js";

const TRANSPORTER_VARIATION_PROFILES = {
  voyaging: { beamWidth: 0.2, beamHeight: 0.58, beamShape: "column", particleDensity: 45 },
  "generation-next": { beamWidth: 0.34, beamHeight: 0.72, beamShape: "shimmer", particleDensity: 58 },
  spoon: { beamWidth: 0.28, beamHeight: 0.66, beamShape: "column", particleDensity: 72 },
};

const POP_VARIATION_PROFILES = {
  "soft-tap": { popScaleMul: 1, flashMul: 1, sparkMul: 1 },
  "snap-back": { popScaleMul: 0.92, flashMul: 1.15, sparkMul: 0.75 },
  "bubble-pop": { popScaleMul: 1.18, flashMul: 0.88, sparkMul: 1.35 },
};

const BURST_VARIATION_PROFILES = {
  pulse: { bloomMul: 1, spreadMul: 1, snapMul: 1 },
  "solar-flare": { bloomMul: 1.22, spreadMul: 0.88, snapMul: 1.05 },
  rippler: { bloomMul: 0.95, spreadMul: 1.28, snapMul: 0.92 },
};

function trim(value) {
  if (typeof value !== "string") {
    return "";
  }
  const t = value.trim();
  return t.length ? t : "";
}

export function resolveVariationProfile(payload) {
  const preview = payload && payload.effect_variation && payload.effect_variation.preview;
  if (preview && trim(preview.profile)) {
    return trim(preview.profile);
  }
  return trim(payload && payload.effect_variation_id);
}

export function resolveVariationPreviewPaletteId(payload) {
  const variation = payload && payload.effect_variation;
  if (variation && trim(variation.recommended_palette_id)) {
    return trim(variation.recommended_palette_id);
  }
  return "";
}

function transporterVariationOverrides(payload) {
  const profile = resolveVariationProfile(payload) || "voyaging";
  const profileBeam = TRANSPORTER_VARIATION_PROFILES[profile] || TRANSPORTER_VARIATION_PROFILES.voyaging;
  const android = (payload && payload.android_effect_tuning) || {};
  const tuning = (payload && payload.effect_tuning) || {};
  const beamIntensity =
    typeof android.beam_intensity === "number"
      ? android.beam_intensity
      : typeof tuning.beam_intensity === "number"
        ? tuning.beam_intensity
        : null;
  const beamScale =
    typeof android.beam_scale === "number"
      ? android.beam_scale
      : typeof tuning.beam_scale === "number"
        ? tuning.beam_scale
        : 1;

  const overrides = {
    beamShape: profileBeam.beamShape,
    beamWidth: profileBeam.beamWidth * beamScale,
    beamHeight: profileBeam.beamHeight * (0.92 + beamScale * 0.16),
    particleDensity: profileBeam.particleDensity,
    _fieldStyle:
      (payload.effect_identity && payload.effect_identity.field_style) || "vertical_phase",
  };

  if (beamIntensity != null) {
    overrides.beamOpacity = Math.min(1, Math.max(0, beamIntensity));
  }

  if (payload.effect_identity && payload.effect_identity.particle_style === "scanfall_dense") {
    overrides.particleDensity = Math.max(overrides.particleDensity, 68);
  }

  const projection = payload.effect_tuning_projection;
  if (projection && typeof projection === "object") {
    if (typeof projection.beamOpacity === "number") {
      overrides.beamOpacity = projection.beamOpacity;
    }
    if (typeof projection.beamShape === "string" && projection.beamShape) {
      overrides.beamShape = projection.beamShape;
    }
    if (typeof projection.glowIntensity === "number") {
      overrides.glowIntensity = Math.round(projection.glowIntensity * 100);
    }
  }

  return overrides;
}

function popVariationOverrides(payload) {
  const profile = resolveVariationProfile(payload) || "soft-tap";
  const profilePop = POP_VARIATION_PROFILES[profile] || POP_VARIATION_PROFILES["soft-tap"];
  const tuning = (payload && payload.effect_tuning) || {};
  const projection = (payload && payload.effect_tuning_projection) || {};
  const popSize = typeof tuning.pop_size === "number" ? tuning.pop_size : 1;
  const popImpact = typeof tuning.pop_impact === "number" ? tuning.pop_impact : 1;
  const sparkDensity = typeof tuning.spark_density === "number" ? tuning.spark_density : 0.35;

  const overrides = {
    beamHeight: Math.round(100 * popSize * profilePop.popScaleMul),
    effectIntensity: Math.round(100 * popImpact * profilePop.flashMul),
    particleDensity: Math.round(100 * sparkDensity * profilePop.sparkMul),
    _fieldStyle: (payload.effect_identity && payload.effect_identity.field_style) || "micro_flash",
  };

  if (typeof projection.effectIntensity === "number") {
    overrides.effectIntensity = Math.round(projection.effectIntensity * 100 * profilePop.flashMul);
  }
  if (typeof projection.particleDensity === "number") {
    overrides.particleDensity = Math.round(projection.particleDensity * 100 * profilePop.sparkMul);
  }

  return overrides;
}

function burstVariationOverrides(payload) {
  const profile = resolveVariationProfile(payload) || "pulse";
  const profileBurst = BURST_VARIATION_PROFILES[profile] || BURST_VARIATION_PROFILES.pulse;
  const tuning = (payload && payload.effect_tuning) || {};
  const projection = (payload && payload.effect_tuning_projection) || {};
  const bloomStrength = typeof tuning.bloom_strength === "number" ? tuning.bloom_strength : 1;
  const snapIntensity = typeof tuning.snap_intensity === "number" ? tuning.snap_intensity : 1;
  const particleSpread = typeof tuning.particle_spread === "number" ? tuning.particle_spread : 1;

  const overrides = {
    glowIntensity: Math.round(100 * bloomStrength * profileBurst.bloomMul),
    entrance_intensity: Math.round(100 * snapIntensity * profileBurst.snapMul),
    particleSpread: Math.round(100 * particleSpread * profileBurst.spreadMul),
    _fieldStyle: (payload.effect_identity && payload.effect_identity.field_style) || "radial_bloom",
  };

  if (typeof projection.glowIntensity === "number") {
    overrides.glowIntensity = Math.round(projection.glowIntensity * 100 * profileBurst.bloomMul);
  }
  if (typeof projection.particleSpread === "number") {
    overrides.particleSpread = Math.round(projection.particleSpread * 100 * profileBurst.spreadMul);
  }

  return overrides;
}

export function variationEffectParamOverrides(payload) {
  const effectId = trim(payload && payload.effect_id);
  if (effectId === "pop") {
    return popVariationOverrides(payload);
  }
  if (effectId === "burst") {
    return burstVariationOverrides(payload);
  }
  if (effectId === "transporter") {
    return transporterVariationOverrides(payload);
  }
  return {};
}

/**
 * Merge variation + tuning into workbench effect params after base preset hydrate.
 */
export function applyVariationToEffectParams(baseParams, payload) {
  return mergeEffectParams(baseParams, variationEffectParamOverrides(payload));
}

/**
 * High-level workbench hints from Axiom payload (palette, variation metadata).
 */
export function axiomPayloadWorkbenchHints(payload) {
  const previewPalette = resolveVariationPreviewPaletteId(payload);
  return {
    variationProfile: resolveVariationProfile(payload) || null,
    previewPaletteId: previewPalette || null,
    operatorPaletteId: trim(payload.palette_id) || null,
    effectVariationId: trim(payload.effect_variation_id) || null,
    effectIdentity: payload.effect_identity || null,
  };
}
