/** Preview-only effect preset + palette role resolution. */

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

export { PRESET_LABELS, BEAM_SHAPE_LABELS };

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
    messageBacking: "#000000",
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
    effectIntensity: clampNum(raw.effectIntensity, 0, 1, 1),
  };
}

export function mergeEffectParams(preset, overrides) {
  return normalizeEffectParams(Object.assign({}, preset, overrides));
}

export function scaleLayoutFractions(contract, hailScalePercent) {
  const scale = clampNum(hailScalePercent, 50, 150, 100) / 100;
  const base = contract.placement.layoutFractions;
  return {
    groupWidth: base.groupWidth * scale,
    groupHeight: base.groupHeight * scale,
  };
}

export function scaledTypography(contract, hailScalePercent) {
  const scale = clampNum(hailScalePercent, 50, 150, 100) / 100;
  const typo = contract.typography;
  return {
    glyphSizeFractionOfHeight: typo.glyphSizeFractionOfHeight * scale,
    messageFontSizeFractionOfHeight: typo.messageFontSizeFractionOfHeight * scale,
    messageBackingAlpha: typo.messageBackingAlpha,
    messageShadow: typo.messageShadow,
  };
}

export function particleCountFromDensity(density) {
  return Math.round(2 + (density / 100) * 14);
}

export function previewVisualPayload(state, contract) {
  const palette = contract.palettes[state.paletteId];
  const roles = resolvePaletteRoles(palette, contract);
  const bgColor = state.groupBgUsePaletteColor
    ? roles.primary
    : state.groupBgCustomColor;
  return {
    effect_preset: state.effectPreset,
    hail_scale: state.hailScalePercent,
    beam_enabled: state.effectParams.beamEnabled,
    beam_shape: state.effectParams.beamShape,
    beam_width: state.effectParams.beamWidth,
    beam_height: state.effectParams.beamHeight,
    beam_opacity: state.effectParams.beamOpacity,
    beam_blur: state.effectParams.beamBlur,
    shimmer_intensity: state.effectParams.shimmerIntensity,
    particle_density: state.effectParams.particleDensity,
    particle_spread: state.effectParams.particleSpread,
    particle_speed: state.effectParams.particleSpeed,
    particle_size: state.effectParams.particleSize,
    effect_intensity: state.effectParams.effectIntensity,
    glow_intensity: state.effectParams.glowIntensity,
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
