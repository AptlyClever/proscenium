import type { HailVisualFields } from "./hailVisualContract";

export type HailEffectPresetVisual = {
  effect_id: string;
  palette_id: string;
  scale: string;
  duration_ms: number;
  placement_id?: string;
};

export type HailEffectPreset = {
  id: string;
  label: string;
  description: string;
  mood?: string;
  reduced_motion?: boolean;
  animation_enabled?: boolean;
  transition_style?: string;
  effect_id?: string;
  effect_tuning?: Record<string, unknown>;
  visual: HailEffectPresetVisual;
  /** gallery = built-in starter; custom = operator-authored */
  source?: "gallery" | "custom";
  overridden?: boolean;
};

export function applyEffectPreset(preset: HailEffectPreset, current: HailVisualFields): HailVisualFields {
  const v = preset.visual;
  return {
    ...current,
    effectId: v.effect_id,
    effectTuning: preset.effect_tuning ? { ...preset.effect_tuning } : current.effectTuning,
    paletteId: v.palette_id,
    scale: v.scale,
    durationMs: String(v.duration_ms),
    placementId: v.placement_id ?? current.placementId,
    placementMode: "preset",
  };
}

export function presetMatchesVisual(preset: HailEffectPreset, visual: HailVisualFields | undefined): boolean {
  if (!visual) {
    return false;
  }
  const v = preset.visual;
  return (
    visual.effectId === v.effect_id &&
    visual.paletteId === v.palette_id &&
    visual.scale === v.scale &&
    String(Number(visual.durationMs) || 0) === String(v.duration_ms) &&
    (visual.placementId || "upper_center") === (v.placement_id || "upper_center")
  );
}

export function matchEffectPresetId(visual: HailVisualFields | undefined, presets: HailEffectPreset[]): string | null {
  if (!visual) {
    return null;
  }
  const match = presets.find((preset) => presetMatchesVisual(preset, visual));
  return match?.id ?? null;
}

export function presetFromRecord(raw: Record<string, unknown>): HailEffectPreset | null {
  const id = String(raw.id ?? "").trim();
  const visual = raw.visual as Record<string, unknown> | undefined;
  if (!id || !visual || typeof visual !== "object") {
    return null;
  }
  return {
    id,
    label: String(raw.label ?? id),
    description: String(raw.description ?? ""),
    mood: raw.mood ? String(raw.mood) : undefined,
    reduced_motion: raw.reduced_motion === true,
    animation_enabled: raw.animation_enabled !== false,
    transition_style: raw.transition_style ? String(raw.transition_style) : undefined,
    effect_id: raw.effect_id ? String(raw.effect_id) : undefined,
    effect_tuning:
      raw.effect_tuning && typeof raw.effect_tuning === "object" && !Array.isArray(raw.effect_tuning)
        ? { ...(raw.effect_tuning as Record<string, unknown>) }
        : undefined,
    visual: {
      effect_id: String(visual.effect_id ?? "transporter"),
      palette_id: String(visual.palette_id ?? "axiom_dark_cyan"),
      scale: String(visual.scale ?? "medium"),
      duration_ms: Number(visual.duration_ms) || 5000,
      placement_id: visual.placement_id ? String(visual.placement_id) : undefined,
    },
    source: raw.source === "custom" ? "custom" : raw.source === "gallery" ? "gallery" : undefined,
    overridden: raw.overridden === true,
  };
}

/** Normalize API preset rows into typed presets. */
export function normalizeEffectPresets(raw: unknown): HailEffectPreset[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((row) => (row && typeof row === "object" ? presetFromRecord(row as Record<string, unknown>) : null))
    .filter((p): p is HailEffectPreset => p != null);
}

export function presentationSummary(preset: HailEffectPreset | null): string {
  if (!preset) {
    return "Custom presentation style";
  }
  const chips = [preset.label, preset.mood, preset.reduced_motion ? "low motion" : null].filter(Boolean);
  return chips.join(" · ");
}

/** Build an API payload for saving an Effect preset from Forge workspace state. */
export function effectPresetPayloadFromVisual(input: {
  id?: string;
  label: string;
  description?: string;
  visual: HailVisualFields;
  basePreset?: HailEffectPreset | null;
}): Record<string, unknown> {
  const { visual, basePreset } = input;
  const label = input.label.trim() || "Custom Effect";
  const description = (input.description ?? basePreset?.description ?? "").trim();
  return {
    ...(input.id ? { id: input.id } : {}),
    label,
    description,
    mood: basePreset?.mood,
    reduced_motion: basePreset?.reduced_motion,
    animation_enabled: basePreset?.animation_enabled ?? visual.effectId !== "none",
    transition_style: basePreset?.transition_style,
    effect_id: visual.effectId,
    effect_tuning: Object.keys(visual.effectTuning ?? {}).length ? { ...(visual.effectTuning ?? {}) } : undefined,
    visual: {
      effect_id: visual.effectId,
      palette_id: visual.paletteId,
      scale: visual.scale,
      duration_ms: Number(visual.durationMs) || 5000,
      placement_id: visual.placementId || "upper_center",
    },
  };
}
