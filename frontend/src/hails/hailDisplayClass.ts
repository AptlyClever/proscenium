/** Display class presets for Grid silhouette v2 — mirrors hail-render-contract.v002-beta paintBox. */

import contract from "../../../config/hails/hail-render-contract.v002-beta.json";

export const DISPLAY_CLASS_STICK_OLED = "stick_oled" as const;
export const DISPLAY_CLASS_PROJECTOR = "projector" as const;
export type DisplayClass = typeof DISPLAY_CLASS_STICK_OLED | typeof DISPLAY_CLASS_PROJECTOR;

type TierMeta = {
  widthFraction?: number;
  heightFraction?: number;
  safeZoneInsetFraction?: number;
  glyphFocusFraction?: number;
  transporterBeamHeightMultiplier?: number;
  messageWeight?: number;
  glyphWidthFractionOfPaintBox?: number;
};

type PaintBoxContract = {
  previewVisual?: {
    paintBox?: {
      tiers?: Record<string, TierMeta>;
      displayClassPresets?: Record<
        string,
        { tiers?: Record<string, TierMeta>; announce?: TierMeta }
      >;
    };
  };
};

const paintBox = (contract as PaintBoxContract).previewVisual?.paintBox ?? {};

export function normalizeDisplayClass(value: unknown): DisplayClass {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === DISPLAY_CLASS_PROJECTOR) {
    return DISPLAY_CLASS_PROJECTOR;
  }
  return DISPLAY_CLASS_STICK_OLED;
}

export function resolvePaintboxTierMeta(
  tierId: string,
  options?: { displayClass?: string | null; priorityLevel?: string | null },
): TierMeta {
  const displayClass = normalizeDisplayClass(options?.displayClass);
  const priority = String(options?.priorityLevel ?? "").trim().toLowerCase();
  const presets = paintBox.displayClassPresets;
  const preset = presets?.[displayClass];
  if (priority === "red" && displayClass === DISPLAY_CLASS_PROJECTOR && preset?.announce) {
    return preset.announce;
  }
  const tiers = preset?.tiers ?? paintBox.tiers ?? {};
  return tiers[tierId] ?? tiers.medium ?? {};
}

export function paintboxTierFractions(
  tierId: string,
  options?: { displayClass?: string | null; priorityLevel?: string | null },
): { widthFraction: number; heightFraction: number } {
  const meta = resolvePaintboxTierMeta(tierId, options);
  return {
    widthFraction: meta.widthFraction ?? 0.34,
    heightFraction: meta.heightFraction ?? 0.42,
  };
}
