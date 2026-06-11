/** Preview-only effect preset, scale grammar, and palette role resolution. */

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
  large: "Attention",
};

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
  messagePaddingMul: 1,
};

export function resolveScaleGrammar(contract, tierId, manualPercent) {
  const sg = contract.previewVisual && contract.previewVisual.scaleGrammar;
  const tier = (sg && sg.tiers && sg.tiers[tierId]) || (sg && sg.tiers && sg.tiers.medium) || {};
  const manual = clampNum(manualPercent, 50, 150, 100) / 100;
  return {
    tierId: tierId || "medium",
    label: tier.label || tierId,
    intent: tier.intent || "",
    layoutScale: (tier.layoutScale != null ? tier.layoutScale : 1) * manual,
    glyphScale: tier.glyphScale != null ? tier.glyphScale : 1,
    messageScale: tier.messageScale != null ? tier.messageScale : 1,
    beamWidthMul: tier.beamWidthMul != null ? tier.beamWidthMul : 1,
    beamHeightMul: tier.beamHeightMul != null ? tier.beamHeightMul : 1,
    particleDensityMul: tier.particleDensityMul != null ? tier.particleDensityMul : 1,
    particleSpreadMul: tier.particleSpreadMul != null ? tier.particleSpreadMul : 1,
    glowIntensityMul: tier.glowIntensityMul != null ? tier.glowIntensityMul : 1,
    effectIntensityMul: tier.effectIntensityMul != null ? tier.effectIntensityMul : 1,
    messagePaddingMul: tier.messagePaddingMul != null ? tier.messagePaddingMul : 1,
    manualPercent: Math.round(manual * 100),
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
  });
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
  };
}

export function mergeEffectParams(preset, overrides) {
  return normalizeEffectParams(Object.assign({}, preset, overrides));
}

export function scaleLayoutFractions(contract, grammar) {
  const g = grammar || DEFAULT_GRAMMAR;
  const base = contract.placement.layoutFractions;
  const layoutScale = g.layoutScale != null ? g.layoutScale : 1;
  return {
    groupWidth: base.groupWidth * layoutScale,
    groupHeight: base.groupHeight * layoutScale,
  };
}

export function scaledTypography(contract, grammar) {
  const g = grammar || DEFAULT_GRAMMAR;
  const typo = contract.typography;
  return {
    glyphSizeFractionOfHeight: typo.glyphSizeFractionOfHeight * (g.glyphScale || 1),
    messageFontSizeFractionOfHeight: typo.messageFontSizeFractionOfHeight * (g.messageScale || 1),
    messageBackingAlpha: typo.messageBackingAlpha,
    messageShadow: typo.messageShadow,
    messagePaddingMul: g.messagePaddingMul != null ? g.messagePaddingMul : 1,
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
  const bgColor = state.groupBgUsePaletteColor
    ? roles.primary
    : state.groupBgCustomColor;
  return {
    hail_scale_tier: state.hailScaleTier,
    hail_scale_manual_percent: state.hailScaleManualPercent,
    effect_preset: state.effectPreset,
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
    color_roles: roles,
    background_enabled: state.groupBgEnabled,
    background_color: bgColor,
    background_shape: state.groupBgShape,
    background_size_percent: state.groupBgSizePercent,
    background_opacity: state.groupBgOpacityPercent / 100,
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
