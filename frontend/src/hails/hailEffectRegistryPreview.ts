import type { EffectRegistryEntry } from "../api";
import type { HailVisualFields } from "./hailVisualContract";
import { PRESET_EFFECTS, type PaintboxPreviewEffect } from "./hailPaintboxPreviewEffects";
import {
  registryPreviewMotionNote,
  resolveRegistryPreviewPlan,
  type RegistryPreviewPlan,
} from "./hailRegistryPreviewRenderer";

export type RegistryHonestPreviewResult = PaintboxPreviewEffect & {
  registryPlan: RegistryPreviewPlan | null;
  phasedPreview: boolean;
};

export function capabilityHonestyLabel(entry: EffectRegistryEntry | null | undefined): string | null {
  if (!entry) return null;
  if (entry.status === "planned") {
    return "Planned effect — not previewable yet";
  }
  const android = entry.capabilities?.android;
  const preview = entry.capabilities?.axiom_preview;
  if (preview === "none") {
    return "Preview unavailable for this effect";
  }
  if (android === "none") {
    return "Preview only — not delivered to TV";
  }
  if (android === "partial") {
    return entry.capabilities?.android_note ?? "TV delivery is partial — preview may differ";
  }
  return null;
}

export function registryEntryForEffect(
  registry: { entries?: EffectRegistryEntry[] } | null | undefined,
  effectId: string,
): EffectRegistryEntry | null {
  const entries = registry?.entries ?? [];
  return entries.find((entry) => entry.id === effectId) ?? null;
}

export function resolveRegistryHonestPreview(
  visual: HailVisualFields,
  registryEntry: EffectRegistryEntry | null | undefined,
  options: {
    animationEnabled: boolean;
    effectsPreviewEnabled: boolean;
    transitionStyle: string;
  },
): RegistryHonestPreviewResult {
  const plan = resolveRegistryPreviewPlan(visual, registryEntry, options);
  const phasedPreview = Boolean(plan && !plan.static);

  if (!phasedPreview) {
    const quiet = PRESET_EFFECTS["quiet-signal"];
    return {
      presetId: null,
      ...quiet,
      stageClass: "",
      glyphClass: "",
      cardClass: "",
      reducedMotion: true,
      motionNote: registryPreviewMotionNote(plan, options.effectsPreviewEnabled),
      dataEffect: visual.effectId || "none",
      registryPlan: plan,
      phasedPreview: false,
    };
  }

  return {
    presetId: null,
    stageClass: "",
    glyphClass: "",
    cardClass: "",
    reducedMotion: false,
    motionNote: registryPreviewMotionNote(plan, options.effectsPreviewEnabled),
    dataEffect: visual.effectId,
    registryPlan: plan,
    phasedPreview: true,
  };
}
