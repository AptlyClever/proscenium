/** Preview-only effect preset, scale grammar, palette roles, and animation metadata. */

import { animationProfilePayload, getAnimationProfile } from "./animation-profile.js";
import {
  getNamedEffect,
  legacyPresetToNamed,
  namedEffectIntent,
  namedEffectToLegacyPreset,
  NAMED_EFFECT_IDS,
  NAMED_EFFECT_LABELS,
  normalizeNamedEffectId,
} from "./named-effects.js";

const PRESET_LABELS = {
  clean_hail: "Clean",
  transporter_soft: "Soft",
  transporter_dense: "Dense",
  subtle_ping: "Ping",
  high_attention: "Alert",
};

export { NAMED_EFFECT_IDS, NAMED_EFFECT_LABELS, getNamedEffect };

export function resolveNamedEffectPresetId(namedEffectId) {
  return namedEffectToLegacyPreset(namedEffectId);
}

export function namedEffectFromPresetId(presetId, contract) {
  return legacyPresetToNamed(presetId, contract);
}

export function namedEffectHint(namedEffectId, contract) {
  return namedEffectIntent(namedEffectId, contract);
}

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
  "transport_event_scale",
  "effect_field_scale",
  "beam_field_scale",
  "particle_travel_scale",
  "glow_radius_scale",
  "anchor_weight",
  "message_backing_emphasis",
];

export { PRESET_LABELS, BEAM_SHAPE_LABELS, SCALE_TIER_LABELS };

/** Axiom Paint Box tier fallbacks when contract.previewVisual.paintBox is absent. */
const DEFAULT_PAINT_BOX_TIERS = {
  small: {
    sizeCode: "S",
    label: "Ambient",
    widthFraction: 0.18,
    heightFraction: 0.2,
    glyphScale: 0.9,
    messageScale: 0.92,
    messageBackingGapFraction: 0.014,
    maxEffectFootprintFraction: 1,
    contentScale: 0.88,
    safeZoneInsetFraction: 0.12,
    glyphFocusFraction: 0.62,
    glyphVisualSizeFloorPx: 60,
    glyphVisualFraction: 0.28,
    glyphWeight: 0.68,
    messageWeight: 0.32,
    transporterBeamHeightMultiplier: 1.35,
  },
  medium: {
    sizeCode: "M",
    label: "Default",
    widthFraction: 0.24,
    heightFraction: 0.26,
    glyphScale: 1,
    messageScale: 1,
    messageBackingGapFraction: 0.016,
    maxEffectFootprintFraction: 1,
    contentScale: 1,
    safeZoneInsetFraction: 0.11,
    glyphFocusFraction: 0.64,
    glyphVisualSizeFloorPx: 85,
    glyphVisualFraction: 0.32,
    glyphWeight: 0.72,
    messageWeight: 0.28,
    transporterBeamHeightMultiplier: 1.5,
  },
  large: {
    sizeCode: "L",
    label: "Impact",
    widthFraction: 0.32,
    heightFraction: 0.34,
    glyphScale: 1.15,
    messageScale: 1.08,
    messageBackingGapFraction: 0.018,
    maxEffectFootprintFraction: 1,
    contentScale: 1.2,
    safeZoneInsetFraction: 0.1,
    glyphFocusFraction: 0.66,
    glyphVisualSizeFloorPx: 124,
    glyphVisualFraction: 0.36,
    glyphWeight: 0.76,
    messageWeight: 0.24,
    transporterBeamHeightMultiplier: 1.65,
  },
};

const DEFAULT_EFFECT_IMPACT_FLOOR = {
  none: 0,
  pop: 0.72,
  burst: 0.78,
  transporter: 0.85,
};

function paintBoxTier(contract, tierId) {
  const pb = contract.previewVisual && contract.previewVisual.paintBox;
  const tiers = (pb && pb.tiers) || DEFAULT_PAINT_BOX_TIERS;
  return tiers[tierId] || tiers.medium || DEFAULT_PAINT_BOX_TIERS.medium;
}

/**
 * Lane 2 — Paint Box dimensions and content scales for a hail size tier.
 * Returns screen-fraction box size plus glyph/message/content scale factors.
 */
export function resolvePaintBox(contract, tierId, manualPercent) {
  const tier = paintBoxTier(contract, tierId);
  const sg = contract.previewVisual && contract.previewVisual.scaleGrammar;
  const sgTier = (sg && sg.tiers && sg.tiers[tierId]) || (sg && sg.tiers && sg.tiers.medium) || {};
  const manual = clampNum(manualPercent, 50, 150, 100) / 100;
  const contentScale =
    tier.contentScale != null
      ? tier.contentScale
      : sgTier.content_scale != null
        ? sgTier.content_scale
        : sgTier.layoutScale != null
          ? sgTier.layoutScale
          : 1;
  return {
    tierId: tierId || "medium",
    sizeCode: tier.sizeCode || (tierId === "small" ? "S" : tierId === "large" ? "L" : "M"),
    label: tier.label || tierId || "M",
    widthFraction: tier.widthFraction * manual,
    heightFraction: tier.heightFraction * manual,
    glyphScale: tier.glyphScale != null ? tier.glyphScale : 1,
    messageScale: tier.messageScale != null ? tier.messageScale : 1,
    contentScale: contentScale,
    messageBackingGapFraction:
      tier.messageBackingGapFraction != null ? tier.messageBackingGapFraction : 0.016,
    maxEffectFootprintFraction:
      tier.maxEffectFootprintFraction != null ? tier.maxEffectFootprintFraction : 1,
    safeZoneInsetFraction:
      tier.safeZoneInsetFraction != null ? tier.safeZoneInsetFraction : 0.11,
    glyphFocusFraction: tier.glyphFocusFraction != null ? tier.glyphFocusFraction : 0.64,
    glyphVisualSizeFloorPx:
      tier.glyphVisualSizeFloorPx != null ? tier.glyphVisualSizeFloorPx : 85,
    glyphVisualFraction:
      tier.glyphVisualFraction != null ? tier.glyphVisualFraction : 0.32,
    glyphWeight: tier.glyphWeight != null ? tier.glyphWeight : 0.72,
    messageWeight: tier.messageWeight != null ? tier.messageWeight : 0.28,
    transporterBeamHeightMultiplier:
      tier.transporterBeamHeightMultiplier != null
        ? tier.transporterBeamHeightMultiplier
        : 1.5,
    manualPercent: Math.round(manual * 100),
  };
}

/**
 * Lane 1/2 — glyph visual size from Paint Box height (not screen fraction alone).
 * glyphPx = max(floorPx, paintBoxHeightPx × glyphVisualFraction)
 */
export function resolveGlyphVisualSize(contract, tierId, manualPercent, paintBoxHeightPx) {
  const pb = resolvePaintBox(contract, tierId, manualPercent);
  const floor = pb.glyphVisualSizeFloorPx != null ? pb.glyphVisualSizeFloorPx : 85;
  const frac = pb.glyphVisualFraction != null ? pb.glyphVisualFraction : 0.32;
  const boxH = Math.max(1, paintBoxHeightPx || 0);
  return Math.round(Math.max(floor, boxH * frac));
}

/** Lane 4 — minimum perceptual impact multiplier per named effect. */
export function resolveEffectImpactFloor(contract, namedEffectId) {
  const id = namedEffectId || "transporter";
  const block =
    contract &&
    contract.previewVisual &&
    contract.previewVisual.namedEffects &&
    contract.previewVisual.namedEffects.effects &&
    contract.previewVisual.namedEffects.effects[id];
  if (block && block.effectImpactFloor != null) {
    return clampNum(block.effectImpactFloor, 0, 1.2, 0);
  }
  return DEFAULT_EFFECT_IMPACT_FLOOR[id] != null ? DEFAULT_EFFECT_IMPACT_FLOOR[id] : 0.85;
}

/**
 * Axiom layout regions inside a Paint Box (paint-box-local pixel coordinates).
 * Paint Box -> Safe Effect Zone -> Glyph Focus Region -> transporter beam envelope.
 */
export function computeHailLayoutRegions(boxWidth, boxHeight, paintBoxMeta) {
  const meta = paintBoxMeta || {};
  const insetFrac = clampNum(meta.safeZoneInsetFraction, 0.06, 0.2, 0.11);
  const glyphFrac = clampNum(meta.glyphFocusFraction, 0.45, 0.8, 0.64);
  const beamMul = clampNum(meta.transporterBeamHeightMultiplier, 1.1, 2.2, 1.5);
  const messageWeight = clampNum(meta.messageWeight, 0.2, 0.5, 0.36);

  const insetX = boxWidth * insetFrac;
  const insetY = boxHeight * insetFrac;
  const safeZone = {
    left: insetX,
    top: insetY,
    width: Math.max(1, boxWidth - insetX * 2),
    height: Math.max(1, boxHeight - insetY * 2),
  };

  const glyphH = safeZone.height * glyphFrac;
  const glyphW = Math.min(safeZone.width, glyphH * 1.05);
  const glyphTop = safeZone.top + safeZone.height * 0.06;
  const glyphFocus = {
    left: safeZone.left + (safeZone.width - glyphW) / 2,
    top: glyphTop,
    width: glyphW,
    height: glyphH,
    centerX: safeZone.left + safeZone.width / 2,
    centerY: glyphTop + glyphH / 2,
  };

  const beamHeight = Math.min(safeZone.height, glyphH * beamMul);
  const beamWidth = Math.min(safeZone.width * 0.72, glyphW * 0.62);

  return {
    paintBox: { left: 0, top: 0, width: boxWidth, height: boxHeight },
    safeZone: safeZone,
    glyphFocus: glyphFocus,
    transporterBeamEnvelope: {
      height: beamHeight,
      width: beamWidth,
      centerX: glyphFocus.centerX,
      centerY: glyphFocus.centerY,
      top: glyphFocus.centerY - beamHeight * 0.5,
      bottom: glyphFocus.centerY + beamHeight * 0.5,
    },
    messageWeight: messageWeight,
    transporterBeamHeightMultiplier: beamMul,
    safeZoneInsetFraction: insetFrac,
    glyphFocusFraction: glyphFrac,
  };
}

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
  transport_event_scale: 1,
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
    if (key === "content_scale" || key === "transport_event_scale") {
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
  transport_event_scale: 1,
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
    transport_event_scale: presence.transport_event_scale,
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
    transportEventScale: p.transportEventScale != null ? p.transportEventScale : p.effectFieldScale,
    effectFieldScale: p.transportEventScale != null ? p.transportEventScale : p.effectFieldScale,
    stableEffectFieldScale:
      p.stableEffectFieldScale != null ? p.stableEffectFieldScale : 1,
    beamFieldScale: p.beamFieldScale,
    particleTravelScale: p.particleTravelScale,
    glowRadiusScale: p.glowRadiusScale,
    stableGlowRadiusScale:
      p.stableGlowRadiusScale != null ? p.stableGlowRadiusScale : 1,
    _fieldScales: p,
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
    transport_event_scale:
      entry.transport_event_scale != null
        ? entry.transport_event_scale
        : entry.effect_field_scale != null
          ? entry.effect_field_scale
          : defaults.transport_event_scale != null
            ? defaults.transport_event_scale
            : defaults.effect_field_scale != null
              ? defaults.effect_field_scale
              : 1,
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
  const field =
    p.transport_event_scale != null
      ? p.transport_event_scale
      : p.effect_field_scale != null
        ? p.effect_field_scale
        : 1;
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
  transportEventScale: 1,
  effectFieldScale: 1,
  beamFieldScale: 1,
  particleTravelScale: 1,
  glowRadiusScale: 1,
  stableGlowRadiusScale: 1,
};

function tierTransportScale(grammar) {
  const g = grammar || {};
  if (g.transport_event_scale != null) {
    return g.transport_event_scale;
  }
  return g.effect_field_scale != null ? g.effect_field_scale : 1;
}

function presetTransportScale(preset) {
  const p = preset || DEFAULT_PRESET_PRESENCE;
  if (p.transport_event_scale != null) {
    return p.transport_event_scale;
  }
  return p.effect_field_scale != null ? p.effect_field_scale : 1;
}

/** Compose renderer field-scale metadata from tier grammar, preset presence, and placement caps. */
export function composeEffectFieldScales(grammar, presetPresence, placementPresence) {
  const g = grammar || {};
  const preset = presetPresence || DEFAULT_PRESET_PRESENCE;
  const placement = placementPresence || DEFAULT_PLACEMENT_PRESENCE;
  const placementCap = placement.effectFieldCapMul != null ? placement.effectFieldCapMul : 1;
  const beamCap = placement.beamFieldCapMul != null ? placement.beamFieldCapMul : placementCap;
  const travelCap =
    placement.particleTravelCapMul != null ? placement.particleTravelCapMul : placementCap;
  const transportEventScale = tierTransportScale(g) * presetTransportScale(preset) * placementCap;
  const stableGlowRadiusScale = Math.min(
    1.2,
    (g.glow_radius_scale != null ? g.glow_radius_scale : 1) *
      (preset.glow_radius_scale != null ? preset.glow_radius_scale : 1) *
      0.72,
  );
  return {
    transportEventScale: transportEventScale,
    effectFieldScale: transportEventScale,
    stableEffectFieldScale:
      g.effect_field_scale != null ? g.effect_field_scale : 1,
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
    stableGlowRadiusScale: stableGlowRadiusScale,
    placementCap: placementCap,
  };
}

/**
 * Lane 5 — lifecycle-aware field envelope.
 * Transport scales apply during enter/exit only; stable_object (hold) keeps a clean object.
 */
const STABLE_LIFECYCLE_PHASES = new Set(["hold", "stable_object"]);

export function resolveLifecycleFieldEnvelope(fieldScales, lifecyclePhase) {
  const scales = fieldScales || DEFAULT_FIELD_SCALES;
  const isStable = STABLE_LIFECYCLE_PHASES.has(lifecyclePhase);
  if (isStable) {
    return {
      effect: scales.stableEffectFieldScale != null ? scales.stableEffectFieldScale : 1,
      beam: 1,
      travel: 0.68,
      glow: scales.stableGlowRadiusScale != null ? scales.stableGlowRadiusScale : 1,
      transportActive: false,
    };
  }
  return {
    effect: scales.transportEventScale != null ? scales.transportEventScale : 1,
    beam: scales.beamFieldScale != null ? scales.beamFieldScale : 1,
    travel: scales.particleTravelScale != null ? scales.particleTravelScale : 1,
    glow: scales.glowRadiusScale != null ? scales.glowRadiusScale : 1,
    transportActive: true,
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

export function formatWorkbenchDiagnostics(state, contract, layoutRegions, glyphVisualPx) {
  const effectId = state.namedEffectId || "transporter";
  const effectLabel =
    NAMED_EFFECT_LABELS[effectId] ? NAMED_EFFECT_LABELS[effectId] : effectId;
  const impact = resolveEffectImpactFloor(contract, state.namedEffectId);
  const hold = state.previewHold ? "hold" : "timed";
  const pb = layoutRegions && layoutRegions.paintBox;
  const sz = layoutRegions && layoutRegions.safeZone;
  const gf = layoutRegions && layoutRegions.glyphFocus;
  const parts = [
    effectLabel,
    "glyph " + (glyphVisualPx != null ? glyphVisualPx + "px" : "—"),
    hold,
    "impact " + Math.round(impact * 100) + "%",
  ];
  if (pb) {
    parts.push("box " + Math.round(pb.width) + "×" + Math.round(pb.height));
  }
  if (sz) {
    parts.push("safe " + Math.round(sz.width) + "×" + Math.round(sz.height));
  }
  if (gf) {
    parts.push("focus " + Math.round(gf.width) + "×" + Math.round(gf.height));
  }
  return parts.join(" · ");
}

export function formatPresetPresenceReadout(presence, namedEffectId, contract) {
  const p = presence || DEFAULT_PRESET_PRESENCE;
  const effectLabel =
    namedEffectId && NAMED_EFFECT_LABELS[namedEffectId]
      ? NAMED_EFFECT_LABELS[namedEffectId]
      : p.label || "Standard";
  const hint = namedEffectId ? namedEffectHint(namedEffectId, contract) : "";
  if (hint) {
    return effectLabel + " · " + hint;
  }
  if (p.intent && !namedEffectId) {
    return effectLabel + " · " + p.intent;
  }
  return effectLabel;
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
    transportEventScale: clampNum(
      raw.transportEventScale != null ? raw.transportEventScale : raw.effectFieldScale,
      0.5,
      3.5,
      1,
    ),
    stableEffectFieldScale: clampNum(raw.stableEffectFieldScale, 0.5, 1.5, 1),
    effectFieldScale: clampNum(raw.effectFieldScale, 0.5, 3.5, 1),
    stableGlowRadiusScale: clampNum(raw.stableGlowRadiusScale, 0.5, 1.5, 1),
    beamFieldScale: clampNum(raw.beamFieldScale, 0.5, 3.5, 1),
    particleTravelScale: clampNum(raw.particleTravelScale, 0.5, 3.5, 1),
    glowRadiusScale: clampNum(raw.glowRadiusScale, 0.5, 3.5, 1),
  };
}

export function mergeEffectParams(preset, overrides) {
  return normalizeEffectParams(Object.assign({}, preset, overrides));
}

export function scaleLayoutFractions(contract, grammar, tierId, manualPercent) {
  const paintBox = resolvePaintBox(
    contract,
    tierId || (grammar && grammar.tierId) || "medium",
    manualPercent != null ? manualPercent : grammar && grammar.manualPercent,
  );
  return {
    groupWidth: paintBox.widthFraction,
    groupHeight: paintBox.heightFraction,
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
  const paintBox = resolvePaintBox(contract, tierId, manualPercent);
  const glyphWeight = paintBox.glyphWeight != null ? paintBox.glyphWeight : 0.72;
  const messageWeight = paintBox.messageWeight != null ? paintBox.messageWeight : 0.28;
  const glyphFocusWeight = glyphWeight;

  let anchorWeight =
    (tierPresence.anchor_weight != null ? tierPresence.anchor_weight : 1) *
    (presetPresence.anchor_weight != null ? presetPresence.anchor_weight : 1) *
    (1 + glyphWeight * 0.58);

  let messageBackingEmphasis =
    (tierPresence.message_backing_emphasis != null ? tierPresence.message_backing_emphasis : 1) *
    (presetPresence.message_backing_emphasis != null ? presetPresence.message_backing_emphasis : 1) *
    (0.58 + messageWeight * 0.42);

  if (groupBgEnabled) {
    messageBackingEmphasis *= 0.55;
  } else if (anchorWeight > 1.05 && messageBackingEmphasis > 1) {
    messageBackingEmphasis = 1 + (messageBackingEmphasis - 1) * 0.28;
  }

  return {
    anchorWeight: anchorWeight,
    messageBackingEmphasis: messageBackingEmphasis,
    messageWeight: messageWeight,
    glyphWeight: glyphWeight,
    glyphFocusWeight: glyphFocusWeight,
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

export function resolveEffectSelection(state, contract) {
  const namedEffectId = normalizeNamedEffectId(
    state.namedEffectId ||
      legacyPresetToNamed(state.effectPreset, contract) ||
      (contract.previewVisual.namedEffects &&
        contract.previewVisual.namedEffects.defaultEffectId) ||
      "transporter",
  );
  const legacyPresetId = namedEffectToLegacyPreset(namedEffectId);
  return {
    namedEffectId: namedEffectId,
    legacyPresetId: legacyPresetId,
    named: getNamedEffect(contract, namedEffectId),
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
  const selection = resolveEffectSelection(state, contract);
  const presence = resolvePresetPresence(contract, selection.legacyPresetId);
  const bgColor = state.groupBgUsePaletteColor
    ? roles.primary
    : state.groupBgCustomColor;

  const payload = {
    effect_id: selection.namedEffectId,
    effect_label: selection.named.label,
    hail_scale_tier: state.hailScaleTier,
    hail_scale_manual_percent: state.hailScaleManualPercent,
    hail_scale: grammar.manualPercent,
    named_effect: {
      id: selection.namedEffectId,
      label: selection.named.label,
      intent: selection.named.intent,
      timing: selection.named.timing,
      legacy_preset_id: selection.legacyPresetId,
    },
    preset_presence: {
      label: presence.label,
      intent: presence.intent,
      transport_event_scale: presence.transport_event_scale,
      effect_field_scale: presence.effect_field_scale,
      beam_field_scale: presence.beam_field_scale,
      particle_travel_scale: presence.particle_travel_scale,
      glow_radius_scale: presence.glow_radius_scale,
      anchor_weight: presence.anchor_weight,
      message_backing_emphasis: presence.message_backing_emphasis,
    },
    scale_grammar: {
      tier: grammar.tierId,
      layout_scale: grammar.layoutScale,
      glyph_scale: grammar.glyphScale,
      message_scale: grammar.messageScale,
    },
    presence_grammar: {
      tier: grammar.tierId,
      content_scale: grammar.content_scale,
      object_scale: grammar.content_scale,
      message_scale: grammar.message_scale,
      transport_event_scale: grammar.transport_event_scale,
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
      getAnimationProfile(contract, selection.legacyPresetId),
      contract,
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
    layout_regions: (function () {
      const pb = resolvePaintBox(contract, state.hailScaleTier, state.hailScaleManualPercent);
      const refW = 480;
      const refH = Math.round(refW * (pb.heightFraction / pb.widthFraction));
      const regions = computeHailLayoutRegions(refW, refH, pb);
      return {
        safe_zone_inset_fraction: regions.safeZoneInsetFraction,
        glyph_focus_fraction: regions.glyphFocusFraction,
        glyph_weight: pb.glyphWeight,
        message_weight: regions.messageWeight,
        glyph_visual_size_px: resolveGlyphVisualSize(
          contract,
          state.hailScaleTier,
          state.hailScaleManualPercent,
          refH,
        ),
        effect_impact_floor: resolveEffectImpactFloor(contract, state.namedEffectId),
        transporter_beam_height_multiplier: regions.transporterBeamHeightMultiplier,
        transporter_beam_height_vs_paint_box:
          regions.transporterBeamEnvelope.height / regions.paintBox.height,
        transporter_beam_inside_safe_zone:
          regions.transporterBeamEnvelope.height <= regions.safeZone.height,
      };
    })(),
    note: "Axiom-owned Hails preview visual — runtime selects effect_id only",
  };

  if (state.effectTouched) {
    payload.workbench_tuning = {
      legacy_preset_id: selection.legacyPresetId,
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
      note: "Workbench-only — not part of runtime Hail contract",
    };
  }

  return payload;
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
