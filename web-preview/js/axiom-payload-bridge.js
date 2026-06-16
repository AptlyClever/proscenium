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

export function variationEffectParamOverrides(payload) {
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
