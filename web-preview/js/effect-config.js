/** Preview-only effect preset, scale grammar, palette roles, and animation metadata. */

import { animationProfilePayload, getAnimationProfile } from "./animation-profile.js";

const PRESET_LABELS = {
  clean_hail: "Clean",
  transporter_soft: "Soft",
  transporter_dense: "Dense",
  subtle_ping: "Ping",
  high_attention: "Alert",
};

const BEAM_SHAPE_LABELS = {
  column: "Column",
  cone: "Cone",
  orb: "Orb",
  shimmer: "Shimmer",
  none: "None",
};

const SCALE_TIER_LABELS = {
  small: "Ambient",
  medium: "Default",
  large: "Impact",
};

const PRESENCE_FIELD_KEYS = [
  "content_scale",
  "message_scale",
  "effect_field_scale",
  "beam_field_scale",
  "particle_travel_scale",
  "glow_radius_scale",
  "anchor_weight",
  "message_backing_emphasis",
];

export { PRESET_LABELS, BEAM_SHAPE_LABELS, SCALE_TIER_LABELS };

const DEFAULT_GRAMMAR = {
  layoutScale: 1,
  glyphScale: 1,
  messageScale: 1,
  beamWidthMul: 1,
  beamHeightMul: 1,
  particleDensityMul: 1,
  particleSpreadMul: 1,
  glowIntensityMul: 1,
  effectIntensityMul: 1,
  entranceIntensityMul: 1,
  exitIntensityMul: 1,
  messagePaddingMul: 1,
  content_scale: 1,
  message_scale: 1,
  effect_field_scale: 1,
  beam_field_scale: 1,
  particle_travel_scale: 1,
  glow_radius_scale: 1,
  anchor_weight: 1,
  message_backing_emphasis: 1,
};

function scaleGrammarTier(contract, tierId) {
  const sg = contract.previewVisual && contract.previewVisual.scaleGrammar;
  return (sg && sg.tiers && sg.tiers[tierId]) || (sg && sg.tiers && sg.tiers.medium) || {};
}

export function resolveTierPresenceFields(contract, tierId, manualPercent) {
  const tier = scaleGrammarTier(contract, tierId);
  const manual = clampNum(manualPercent, 50, 150, 100) / 100;
  const resolved = {
    tierId: tierId || "medium",
    label: tier.label || tierId,
    intent: tier.intent || "",
    manualPercent: Math.round(manual * 100),
  };
  PRESENCE_FIELD_KEYS.forEach(function (key) {
    const base = tier[key] != null ? tier[key] : 1;
    if (key === "content_scale" || key === "effect_field_scale") {
      resolved[key] = base * manual;
    } else {
      resolved[key] = base;
    }
  });
  return resolved;
}

const DEFAULT_PRESET_PRESENCE = {
  label: "Standard",
  intent: "",
  effect_field_scale: 1,
  beam_field_scale: 1,
  particle_travel_scale: 1,
  glow_radius_scale: 1,
  anchor_weight: 1,
  message_backing_emphasis: 1,
};

const DEFAULT_PRESENCE = {
  effectFieldScale: 1,
  beamFieldScale: 1,
  particleTravelScale: 1,
  glowRadiusScale: 1,
};

export function resolveScaleGrammar(contract, tierId, manualPercent) {
  const tier = scaleGrammarTier(contract, tierId);
  const manual = clampNum(manualPercent, 50, 150, 100) / 100;
  const presence = resolveTierPresenceFields(contract, tierId, manualPercent);
  return {
    tierId: presence.tierId,
    label: presence.label,
    intent: presence.intent,
    layoutScale: (tier.layoutScale != null ? tier.layoutScale : 1) * manual,
    glyphScale: tier.glyphScale != null ? tier.glyphScale : 1,
    messageScale: tier.messageScale != null ? tier.messageScale : 1,
    beamWidthMul: tier.beamWidthMul != null ? tier.beamWidthMul : 1,
    beamHeightMul: tier.beamHeightMul != null ? tier.beamHeightMul : 1,
    particleDensityMul: tier.particleDensityMul != null ? tier.particleDensityMul : 1,
    particleSpreadMul: tier.particleSpreadMul != null ? tier.particleSpreadMul : 1,
    glowIntensityMul: tier.glowIntensityMul != null ? tier.glowIntensityMul : 1,
    effectIntensityMul: tier.effectIntensityMul != null ? tier.effectIntensityMul : 1,
    entranceIntensityMul:
      tier.entranceIntensityMul != null ? tier.entranceIntensityMul : 1,
    exitIntensityMul: tier.exitIntensityMul != null ? tier.exitIntensityMul : 1,
    messagePaddingMul: tier.messagePaddingMul != null ? tier.messagePaddingMul : 1,
    manualPercent: presence.manualPercent,
    content_scale: presence.content_scale,
    message_scale: presence.message_scale,
    effect_field_scale: presence.effect_field_scale,
    beam_field_scale: presence.beam_field_scale,
    particle_travel_scale: presence.particle_travel_scale,
    glow_radius_scale: presence.glow_radius_scale,
    anchor_weight: presence.anchor_weight,
    message_backing_emphasis: presence.message_backing_emphasis,
  };
}

export function resolvePaletteRoles(palette, contract) {
  if (palette.roles) {
    return palette.roles;
  }
  const typo = contract.typography || {};
  return {
    primary: palette.beamCyan,
    accent: palette.beamWhite,
    glow: palette.glyphGlow || palette.beamCyan,
    particle: palette.beamWhite,
    text: palette.messageColor,
    messageBacking: "#121618",
    messageBackingOpacity: typo.messageBackingAlpha != null ? typo.messageBackingAlpha : 0.46,
  };
}

export function getEffectPreset(contract, presetId) {
  const presets = contract.previewVisual && contract.previewVisual.effectPresets;
  if (!presets || !presets[presetId]) {
    return defaultEffectParams();
  }
  return normalizeEffectParams(presets[presetId]);
}

export function applyScaleGrammarToEffectParams(params, grammar) {
  const g = grammar || DEFAULT_GRAMMAR;
  return normalizeEffectParams({
    beamEnabled: params.beamEnabled,
    beamShape: params.beamShape,
    beamWidth: params.beamWidth * g.beamWidthMul,
    beamHeight: params.beamHeight * g.beamHeightMul,
    beamOpacity: params.beamOpacity,
    beamBlur: params.beamBlur,
    shimmerIntensity: params.shimmerIntensity,
    particleDensity: Math.round(params.particleDensity * g.particleDensityMul),
    particleSpread: Math.round(params.particleSpread * g.particleSpreadMul),
    particleSpeed: params.particleSpeed,
    particleSize: params.particleSize,
    glowIntensity: Math.round(params.glowIntensity * g.glowIntensityMul),
    effectIntensity: params.effectIntensity * g.effectIntensityMul,
    effectFieldScale: params.effectFieldScale,
    beamFieldScale: params.beamFieldScale,
    particleTravelScale: params.particleTravelScale,
    glowRadiusScale: params.glowRadiusScale,
  });
}

/**
 * Lane 5 — effect-field envelope from tier × preset × placement (renderer metadata).
 * Distinct from tier-only resolvePresenceGrammar(tier, manual%).
 */
export function resolveEffectFieldEnvelope(
  contract,
  tierId,
  presetId,
  placementId,
  manualPercent,
) {
  const grammar = resolveScaleGrammar(
    contract,
    tierId,
    manualPercent != null ? manualPercent : 100,
  );
  const presetPresence = resolvePresetPresence(contract, presetId);
  const placementPresence = resolvePlacementPresence(contract, placementId || "top_right");
  return composeEffectFieldScales(grammar, presetPresence, placementPresence);
}

/** Merge presence envelope onto scaled effect params for renderer consumption. */
export function applyPresenceGrammarToEffectParams(params, presence) {
  const p = presence || DEFAULT_FIELD_SCALES;
  return normalizeEffectParams(Object.assign({}, params, {
    effectFieldScale: p.effectFieldScale,
    beamFieldScale: p.beamFieldScale,
    particleTravelScale: p.particleTravelScale,
    glowRadiusScale: p.glowRadiusScale,
  }));
}

export function resolvePresetPresence(contract, presetId) {
  const block = contract.previewVisual && contract.previewVisual.presetPresence;
  const defaults = (block && block.defaults) || {};
  const entry = (block && block[presetId]) || {};
  return {
    presetId: presetId || "",
    label: entry.label || DEFAULT_PRESET_PRESENCE.label,
    intent: entry.intent || "",
    effect_field_scale:
      entry.effect_field_scale != null
        ? entry.effect_field_scale
        : defaults.effect_field_scale != null
          ? defaults.effect_field_scale
          : 1,
    beam_field_scale:
      entry.beam_field_scale != null
        ? entry.beam_field_scale
        : defaults.beam_field_scale != null
          ? defaults.beam_field_scale
          : 1,
    particle_travel_scale:
      entry.particle_travel_scale != null
        ? entry.particle_travel_scale
        : defaults.particle_travel_scale != null
          ? defaults.particle_travel_scale
          : 1,
    glow_radius_scale:
      entry.glow_radius_scale != null
        ? entry.glow_radius_scale
        : defaults.glow_radius_scale != null
          ? defaults.glow_radius_scale
          : 1,
    anchor_weight:
      entry.anchor_weight != null
        ? entry.anchor_weight
        : defaults.anchor_weight != null
          ? defaults.anchor_weight
          : 1,
    message_backing_emphasis:
      entry.message_backing_emphasis != null
        ? entry.message_backing_emphasis
        : defaults.message_backing_emphasis != null
          ? defaults.message_backing_emphasis
          : 1,
  };
}

export function applyPresetPresenceToEffectParams(params, presence) {
  const p = presence || DEFAULT_PRESET_PRESENCE;
  const field = p.effect_field_scale != null ? p.effect_field_scale : 1;
  const beam = p.beam_field_scale != null ? p.beam_field_scale : 1;
  const travel = p.particle_travel_scale != null ? p.particle_travel_scale : 1;
  const glow = p.glow_radius_scale != null ? p.glow_radius_scale : 1;
  return normalizeEffectParams({
    beamEnabled: params.beamEnabled,
    beamShape: params.beamShape,
    beamWidth: params.beamWidth * beam,
    beamHeight: params.beamHeight * beam,
    beamOpacity: params.beamOpacity,
    beamBlur: params.beamBlur,
    shimmerIntensity: params.shimmerIntensity,
    particleDensity: Math.round(params.particleDensity * (0.7 + field * 0.3)),
    particleSpread: Math.round(params.particleSpread * travel * Math.sqrt(field)),
    particleSpeed: Math.round(params.particleSpeed * travel),
    particleSize: params.particleSize,
    glowIntensity: Math.round(params.glowIntensity * glow),
    effectIntensity: params.effectIntensity * field,
  });
}

const DEFAULT_FIELD_SCALES = {
  effectFieldScale: 1,
  beamFieldScale: 1,
  particleTravelScale: 1,
  glowRadiusScale: 1,
};

/** Compose renderer field-scale metadata from tier grammar, preset presence, and placement caps (L3). */
export function composeEffectFieldScales(grammar, presetPresence, placementPresence) {
  const g = grammar || {};
  const preset = presetPresence || DEFAULT_PRESET_PRESENCE;
  const placement = placementPresence || DEFAULT_PLACEMENT_PRESENCE;
  const placementCap = placement.effectFieldCapMul != null ? placement.effectFieldCapMul : 1;
  const beamCap = placement.beamFieldCapMul != null ? placement.beamFieldCapMul : placementCap;
  const travelCap =
    placement.particleTravelCapMul != null ? placement.particleTravelCapMul : placementCap;
  return {
    effectFieldScale:
      (g.effect_field_scale != null ? g.effect_field_scale : 1) *
      (preset.effect_field_scale != null ? preset.effect_field_scale : 1) *
      placementCap,
    beamFieldScale:
      (g.beam_field_scale != null ? g.beam_field_scale : 1) *
      (preset.beam_field_scale != null ? preset.beam_field_scale : 1) *
      beamCap,
    particleTravelScale:
      (g.particle_travel_scale != null ? g.particle_travel_scale : 1) *
      (preset.particle_travel_scale != null ? preset.particle_travel_scale : 1) *
      travelCap,
    glowRadiusScale:
      (g.glow_radius_scale != null ? g.glow_radius_scale : 1) *
      (preset.glow_radius_scale != null ? preset.glow_radius_scale : 1) *
      placementCap,
    placementCap: placementCap,
  };
}

export function resolveScaledEffectParams(
  contract,
  baseParams,
  tierId,
  manualPercent,
  presetId,
  placementId,
) {
  const grammar = resolveScaleGrammar(contract, tierId, manualPercent);
  const presetPresence = resolvePresetPresence(contract, presetId);
  const placementPresence = resolvePlacementPresence(
    contract,
    placementId || "top_right",
  );
  const grammarScaled = applyScaleGrammarToEffectParams(baseParams, grammar);
  const presetScaled = applyPresetPresenceToEffectParams(grammarScaled, presetPresence);
  const placementScaled = applyPlacementPresenceToEffectParams(presetScaled, placementPresence);
  const fieldScales = composeEffectFieldScales(grammar, presetPresence, placementPresence);
  const scaled = applyPresenceGrammarToEffectParams(placementScaled, fieldScales);
  return {
    grammar: grammar,
    presetPresence: presetPresence,
    placementPresence: placementPresence,
    fieldScales: fieldScales,
    scaled: scaled,
  };
}

export function formatPresetPresenceReadout(presence) {
  const p = presence || DEFAULT_PRESET_PRESENCE;
  return (
    (p.label || "Standard") +
    " · field " +
    Math.round((p.effect_field_scale || 1) * 100) +
    "% · beam " +
    Math.round((p.beam_field_scale || 1) * 100) +
    "% · travel " +
    Math.round((p.particle_travel_scale || 1) * 100) +
    "%"
  );
}

const DEFAULT_PLACEMENT_PRESENCE = {
  placementId: "top_right",
  label: "",
  intent: "",
  effectFieldCapMul: 1,
  beamFieldCapMul: 1,
  particleTravelCapMul: 1,
  maxOverflowFraction: 0.25,
  safeOffsetFraction: { top: 0, bottom: 0, start: 0, end: 0 },
};

export function resolvePlacementPresence(contract, placementId) {
  const pp = contract.previewVisual && contract.previewVisual.placementPresence;
  const placements = (pp && pp.placements) || {};
  const modeCustom = contract.placement && contract.placement.modeCustom;
  let raw;
  if (placementId === "custom" || placementId === modeCustom) {
    raw = (pp && pp.customPlacement) || DEFAULT_PLACEMENT_PRESENCE;
  } else {
    raw =
      placements[placementId] ||
      placements[(pp && pp.defaultPlacementId) || "top_right"] ||
      DEFAULT_PLACEMENT_PRESENCE;
  }
  const effectCap = raw.effectFieldCapMul != null ? raw.effectFieldCapMul : 1;
  return {
    placementId: placementId || (pp && pp.defaultPlacementId) || "top_right",
    label: raw.label || "",
    intent: raw.intent || "",
    effectFieldCapMul: effectCap,
    beamFieldCapMul: raw.beamFieldCapMul != null ? raw.beamFieldCapMul : effectCap,
    particleTravelCapMul:
      raw.particleTravelCapMul != null ? raw.particleTravelCapMul : effectCap,
    maxOverflowFraction: clampNum(raw.maxOverflowFraction, 0, 1.2, 0.25),
    safeOffsetFraction: normalizeSafeOffsetFraction(raw.safeOffsetFraction),
  };
}

export function applyPlacementPresenceToEffectParams(params, presence) {
  const p = presence || DEFAULT_PLACEMENT_PRESENCE;
  const effectCap = p.effectFieldCapMul != null ? p.effectFieldCapMul : 1;
  const beamCap = p.beamFieldCapMul != null ? p.beamFieldCapMul : effectCap;
  const travelCap = p.particleTravelCapMul != null ? p.particleTravelCapMul : effectCap;
  return normalizeEffectParams({
    beamEnabled: params.beamEnabled,
    beamShape: params.beamShape,
    beamWidth: params.beamWidth * beamCap,
    beamHeight: params.beamHeight * beamCap,
    beamOpacity: params.beamOpacity,
    beamBlur: params.beamBlur * Math.sqrt(effectCap),
    shimmerIntensity: params.shimmerIntensity * effectCap,
    particleDensity: params.particleDensity,
    particleSpread: Math.round(params.particleSpread * travelCap),
    particleSpeed: Math.round(params.particleSpeed * travelCap),
    particleSize: params.particleSize,
    glowIntensity: Math.round(params.glowIntensity * effectCap),
    effectIntensity: params.effectIntensity * effectCap,
    effectFieldScale: params.effectFieldScale,
    beamFieldScale: params.beamFieldScale,
    particleTravelScale: params.particleTravelScale,
    glowRadiusScale: params.glowRadiusScale,
  });
}

function normalizeSafeOffsetFraction(raw) {
  const s = raw || {};
  return {
    top: clampNum(s.top, 0, 0.2, 0),
    bottom: clampNum(s.bottom, 0, 0.2, 0),
    start: clampNum(s.start, 0, 0.2, 0),
    end: clampNum(s.end, 0, 0.2, 0),
  };
}

export function defaultEffectParams() {
  return normalizeEffectParams({});
}

function normalizeEffectParams(raw) {
  return {
    beamEnabled: raw.beamEnabled !== false,
    beamShape: raw.beamShape || "column",
    beamWidth: clampNum(raw.beamWidth, 0.05, 0.55, 0.2),
    beamHeight: clampNum(raw.beamHeight, 0.1, 0.9, 0.55),
    beamOpacity: clampNum(raw.beamOpacity, 0, 1, 0.85),
    beamBlur: clampNum(raw.beamBlur, 0, 24, 0),
    shimmerIntensity: clampNum(raw.shimmerIntensity, 0, 1, 0.45),
    particleDensity: clampInt(raw.particleDensity, 0, 100, 45),
    particleSpread: clampInt(raw.particleSpread, 0, 100, 38),
    particleSpeed: clampInt(raw.particleSpeed, 0, 100, 42),
    particleSize: clampInt(raw.particleSize, 0, 100, 48),
    glowIntensity: clampInt(raw.glowIntensity, 0, 100, 50),
    effectIntensity: clampNum(raw.effectIntensity, 0, 1.2, 1),
    effectFieldScale: clampNum(raw.effectFieldScale, 0.5, 3.5, 1),
    beamFieldScale: clampNum(raw.beamFieldScale, 0.5, 3.5, 1),
    particleTravelScale: clampNum(raw.particleTravelScale, 0.5, 3.5, 1),
    glowRadiusScale: clampNum(raw.glowRadiusScale, 0.5, 3.5, 1),
  };
}

export function mergeEffectParams(preset, overrides) {
  return normalizeEffectParams(Object.assign({}, preset, overrides));
}

export function scaleLayoutFractions(contract, grammar) {
  const g = grammar || DEFAULT_GRAMMAR;
  const base = contract.placement.layoutFractions;
  const contentScale =
    g.content_scale != null
      ? g.content_scale
      : g.layoutScale != null
        ? g.layoutScale
        : 1;
  return {
    groupWidth: base.groupWidth * contentScale,
    groupHeight: base.groupHeight * contentScale,
  };
}

export function scaledTypography(contract, grammar) {
  const g = grammar || DEFAULT_GRAMMAR;
  const typo = contract.typography;
  const messageScale =
    g.message_scale != null ? g.message_scale : g.messageScale != null ? g.messageScale : 1;
  return {
    glyphSizeFractionOfHeight: typo.glyphSizeFractionOfHeight * (g.glyphScale || 1),
    messageFontSizeFractionOfHeight: typo.messageFontSizeFractionOfHeight * messageScale,
    messageBackingAlpha: typo.messageBackingAlpha,
    messageShadow: typo.messageShadow,
    messagePaddingMul: g.messagePaddingMul != null ? g.messagePaddingMul : 1,
  };
}

/** Lane 4 — arrival anchor vs message module hierarchy (preview-only). */
export function resolveContentHierarchy(
  contract,
  tierId,
  manualPercent,
  presetId,
  groupBgEnabled,
) {
  const typo = contract.typography || {};
  const tierPresence = resolveTierPresenceFields(contract, tierId, manualPercent);
  const presetPresence = resolvePresetPresence(contract, presetId);
  const grammar = resolveScaleGrammar(contract, tierId, manualPercent);

  let anchorWeight =
    (tierPresence.anchor_weight != null ? tierPresence.anchor_weight : 1) *
    (presetPresence.anchor_weight != null ? presetPresence.anchor_weight : 1);

  let messageBackingEmphasis =
    (tierPresence.message_backing_emphasis != null ? tierPresence.message_backing_emphasis : 1) *
    (presetPresence.message_backing_emphasis != null ? presetPresence.message_backing_emphasis : 1);

  if (groupBgEnabled) {
    messageBackingEmphasis *= 0.55;
  } else if (anchorWeight > 1.05 && messageBackingEmphasis > 1) {
    messageBackingEmphasis = 1 + (messageBackingEmphasis - 1) * 0.35;
  }

  return {
    anchorWeight: anchorWeight,
    messageBackingEmphasis: messageBackingEmphasis,
    glowRadiusScale:
      tierPresence.glow_radius_scale != null ? tierPresence.glow_radius_scale : 1,
    messageFontWeight: typo.messageFontWeight != null ? typo.messageFontWeight : 500,
    anchorGapFraction:
      typo.anchorMessageGapFractionOfHeight != null
        ? typo.anchorMessageGapFractionOfHeight
        : 0.016,
    messagePaddingMul: grammar.messagePaddingMul != null ? grammar.messagePaddingMul : 1,
  };
}

export function resolvePreviewTiming(state, contract) {
  const pt = (contract.previewVisual && contract.previewVisual.previewTiming) || {};
  const presets = pt.presets || { "5s": 5000, "10s": 10000, "30s": 30000, "60s": 60000 };
  const hold = Boolean(state.previewHold);
  let preset = state.previewTimingPreset || pt.defaultPreset || "5s";
  let durationMs;
  if (preset === "custom") {
    const min = (pt.customMs && pt.customMs.min) || 1000;
    const max = (pt.customMs && pt.customMs.max) || 120000;
    durationMs = clampInt(state.previewCustomDurationMs, min, max, 5000);
  } else if (presets[preset] != null) {
    durationMs = presets[preset];
  } else {
    preset = "5s";
    durationMs = presets["5s"] || 5000;
  }
  return {
    preset: preset,
    hold: hold,
    display_duration_ms: hold ? null : durationMs,
    duration_ms_for_payload: durationMs,
  };
}

export function previewTimingPayload(state, contract) {
  const timing = resolvePreviewTiming(state, contract);
  return {
    preset: timing.preset,
    hold: timing.hold,
    display_duration_ms: timing.display_duration_ms,
    note: "Workbench-only preview timing",
  };
}

export function previewVisualPayload(state, contract) {
  const palette = contract.palettes[state.paletteId];
  const roles = resolvePaletteRoles(palette, contract);
  const grammar = resolveScaleGrammar(
    contract,
    state.hailScaleTier,
    state.hailScaleManualPercent,
  );
  const presence = resolvePresetPresence(contract, state.effectPreset);
  const bgColor = state.groupBgUsePaletteColor
    ? roles.primary
    : state.groupBgCustomColor;
  return {
    hail_scale_tier: state.hailScaleTier,
    hail_scale_manual_percent: state.hailScaleManualPercent,
    effect_preset: state.effectPreset,
    preset_presence: {
      label: presence.label,
      intent: presence.intent,
      effect_field_scale: presence.effect_field_scale,
      beam_field_scale: presence.beam_field_scale,
      particle_travel_scale: presence.particle_travel_scale,
      glow_radius_scale: presence.glow_radius_scale,
      anchor_weight: presence.anchor_weight,
      message_backing_emphasis: presence.message_backing_emphasis,
    },
    hail_scale: grammar.manualPercent,
    beam_enabled: state.effectParams.beamEnabled,
    beam_shape: state.effectParams.beamShape,
    beam_width: state.scaledEffectParams.beamWidth,
    beam_height: state.scaledEffectParams.beamHeight,
    beam_opacity: state.scaledEffectParams.beamOpacity,
    beam_blur: state.scaledEffectParams.beamBlur,
    shimmer_intensity: state.scaledEffectParams.shimmerIntensity,
    particle_density: state.scaledEffectParams.particleDensity,
    particle_spread: state.scaledEffectParams.particleSpread,
    particle_speed: state.scaledEffectParams.particleSpeed,
    particle_size: state.scaledEffectParams.particleSize,
    effect_intensity: state.scaledEffectParams.effectIntensity,
    glow_intensity: state.scaledEffectParams.glowIntensity,
    scale_grammar: {
      tier: grammar.tierId,
      layout_scale: grammar.layoutScale,
      glyph_scale: grammar.glyphScale,
      message_scale: grammar.messageScale,
    },
    presence_grammar: {
      tier: grammar.tierId,
      content_scale: grammar.content_scale,
      message_scale: grammar.message_scale,
      effect_field_scale: grammar.effect_field_scale,
      beam_field_scale: grammar.beam_field_scale,
      particle_travel_scale: grammar.particle_travel_scale,
      glow_radius_scale: grammar.glow_radius_scale,
      anchor_weight: grammar.anchor_weight,
      message_backing_emphasis: grammar.message_backing_emphasis,
    },
    color_roles: roles,
    background_enabled: state.groupBgEnabled,
    background_color: bgColor,
    background_shape: state.groupBgShape,
    background_size_percent: state.groupBgSizePercent,
    background_opacity: state.groupBgOpacityPercent / 100,
    preview_timing: previewTimingPayload(state, contract),
    animation_profile: animationProfilePayload(
      getAnimationProfile(contract, state.effectPreset),
    ),
    placement_presence: state.placementPresence
      ? {
          placement_id: state.placementPresence.placementId,
          effect_field_cap_mul: state.placementPresence.effectFieldCapMul,
          beam_field_cap_mul: state.placementPresence.beamFieldCapMul,
          particle_travel_cap_mul: state.placementPresence.particleTravelCapMul,
          max_overflow_fraction: state.placementPresence.maxOverflowFraction,
          safe_offset_fraction: state.placementPresence.safeOffsetFraction,
        }
      : null,
  };
}

function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

function clampInt(value, min, max, fallback) {
  return Math.round(clampNum(value, min, max, fallback));
}
