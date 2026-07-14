import type { HailEffectPreset } from "./hailEffectsGallery";
import type { HailVisualFields } from "./hailVisualContract";

/** Known Effect Preset IDs from hail-effects-gallery.v001.json */
export const PAINTBOX_EFFECT_PRESET_IDS = [
  "transporter-sweep",
  "priority-pulse",
  "soft-ping",
  "scanner-pass",
  "quiet-signal",
] as const;

export type PaintboxEffectPresetId = (typeof PAINTBOX_EFFECT_PRESET_IDS)[number];

export type PaintboxPreviewEffect = {
  presetId: string | null;
  stageClass: string;
  glyphClass: string;
  cardClass: string;
  reducedMotion: boolean;
  motionNote: string;
  dataEffect: string;
  phasedPreview?: boolean;
  registryPlan?: import("./hailRegistryPreviewRenderer").RegistryPreviewPlan | null;
};

export const PRESET_EFFECTS: Record<PaintboxEffectPresetId, Omit<PaintboxPreviewEffect, "presetId">> = {
  "transporter-sweep": {
    stageClass: "hail-paintbox-effect-transporter-sweep",
    glyphClass: "hail-paintbox-glyph-transporter-sweep",
    cardClass: "hail-paintbox-card-transporter-sweep",
    reducedMotion: false,
    motionNote: "Beam sweep with cyan operational shimmer",
    dataEffect: "transporter-sweep",
  },
  "priority-pulse": {
    stageClass: "hail-paintbox-effect-priority-pulse",
    glyphClass: "hail-paintbox-glyph-priority-pulse",
    cardClass: "hail-paintbox-card-priority-pulse",
    reducedMotion: false,
    motionNote: "Assertive alert pulse — high-priority signal",
    dataEffect: "priority-pulse",
  },
  "soft-ping": {
    stageClass: "hail-paintbox-effect-soft-ping",
    glyphClass: "hail-paintbox-glyph-soft-ping",
    cardClass: "hail-paintbox-card-soft-ping",
    reducedMotion: false,
    motionNote: "Gentle arrival with soft pop and fade",
    dataEffect: "soft-ping",
  },
  "scanner-pass": {
    stageClass: "hail-paintbox-effect-scanner-pass",
    glyphClass: "hail-paintbox-glyph-scanner-pass",
    cardClass: "hail-paintbox-card-scanner-pass",
    reducedMotion: false,
    motionNote: "Scan-line sweep pass over the Hail card",
    dataEffect: "scanner-pass",
  },
  "quiet-signal": {
    stageClass: "hail-paintbox-effect-quiet-signal",
    glyphClass: "hail-paintbox-glyph-quiet-signal",
    cardClass: "hail-paintbox-card-quiet-signal",
    reducedMotion: true,
    motionNote: "Reduced motion — calm, minimal presentation",
    dataEffect: "quiet-signal",
  },
};

const FALLBACK_BY_VISUAL: Record<string, Omit<PaintboxPreviewEffect, "presetId">> = {
  "transporter:beam": PRESET_EFFECTS["transporter-sweep"],
  "burst:pulse": PRESET_EFFECTS["priority-pulse"],
  "pop:fade": PRESET_EFFECTS["soft-ping"],
  "transporter:slide_up": PRESET_EFFECTS["scanner-pass"],
  "none:fade": PRESET_EFFECTS["quiet-signal"],
};

function isKnownPresetId(id: string | null): id is PaintboxEffectPresetId {
  return id != null && (PAINTBOX_EFFECT_PRESET_IDS as readonly string[]).includes(id);
}

function fallbackFromVisual(
  visual: HailVisualFields,
  transitionStyle: string,
  animationEnabled: boolean,
): Omit<PaintboxPreviewEffect, "presetId"> {
  if (!animationEnabled || visual.effectId === "none") {
    return PRESET_EFFECTS["quiet-signal"];
  }
  const key = `${visual.effectId}:${transitionStyle}`;
  const match = FALLBACK_BY_VISUAL[key];
  if (match) {
    return match;
  }
  if (visual.effectId === "burst") {
    return PRESET_EFFECTS["priority-pulse"];
  }
  if (visual.effectId === "pop") {
    return PRESET_EFFECTS["soft-ping"];
  }
  if (visual.effectId === "transporter") {
    return PRESET_EFFECTS["transporter-sweep"];
  }
  return {
    stageClass: "hail-paintbox-effect-custom",
    glyphClass: "hail-paintbox-glyph-custom",
    cardClass: "hail-paintbox-card-custom",
    reducedMotion: false,
    motionNote: "Custom presentation motion",
    dataEffect: "custom",
  };
}

export function resolvePaintboxPreviewEffect(
  effectPresetId: string | null,
  activePreset: HailEffectPreset | null,
  visual: HailVisualFields,
  animationEnabled: boolean,
  transitionStyle: string,
): PaintboxPreviewEffect {
  const reducedFromPreset = activePreset?.reduced_motion === true || activePreset?.animation_enabled === false;

  if (isKnownPresetId(effectPresetId)) {
    const base = PRESET_EFFECTS[effectPresetId];
    const reducedMotion = base.reducedMotion || reducedFromPreset || !animationEnabled;
    return {
      presetId: effectPresetId,
      ...base,
      reducedMotion,
      motionNote: reducedMotion ? "Reduced motion — calm, minimal presentation" : base.motionNote,
    };
  }

  const fallback = fallbackFromVisual(visual, transitionStyle, animationEnabled && !reducedFromPreset);
  const reducedMotion = fallback.reducedMotion || reducedFromPreset || !animationEnabled;
  return {
    presetId: null,
    ...fallback,
    reducedMotion,
    motionNote: reducedMotion ? "Reduced motion — calm, minimal presentation" : fallback.motionNote,
  };
}

export function paintboxPreviewMotionNote(
  effectPresetId: string | null,
  activePreset: HailEffectPreset | null,
  visual: HailVisualFields,
  animationEnabled: boolean,
  transitionStyle: string,
): string {
  return resolvePaintboxPreviewEffect(
    effectPresetId,
    activePreset,
    visual,
    animationEnabled,
    transitionStyle,
  ).motionNote;
}
