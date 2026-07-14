import type {
  EffectRegistryEntry,
  EffectRegistryPayload,
  EffectRegistryPreviewIdentity,
  EffectRegistryVariation,
} from "../api";
import type { HailVisualFields } from "./hailVisualContract";

function registryEntryForEffect(
  registry: EffectRegistryPayload | null | undefined,
  effectId: string,
): EffectRegistryEntry | null {
  return registry?.entries?.find((entry) => entry.id === effectId) ?? null;
}

export function variationForEffect(
  registry: EffectRegistryPayload | null | undefined,
  effectId: string,
  variationId: string,
): EffectRegistryVariation | null {
  const entry = registryEntryForEffect(registry, effectId);
  return entry?.variations?.find((row) => row.id === variationId) ?? null;
}

export function defaultVariationForEffect(
  registry: EffectRegistryPayload | null | undefined,
  effectId: string,
): string {
  const entry = registryEntryForEffect(registry, effectId);
  if (!entry?.variations?.length) {
    return "";
  }
  if (entry.default_variation_id) {
    return entry.default_variation_id;
  }
  const flagged = entry.variations.find((row) => row.default);
  return flagged?.id ?? entry.variations[0]?.id ?? "";
}

/** Registry-designed effect palette — never the operator Color (glyph) loadout. */
export const DEFAULT_EFFECT_PREVIEW_PALETTE_ID = "axiom_dark_cyan";

export function recommendedPaletteForVariation(
  variation: EffectRegistryVariation | EffectRegistryEntry | null | undefined,
): string | null {
  if (!variation) {
    return null;
  }
  if ("recommended_palette_id" in variation && variation.recommended_palette_id) {
    return variation.recommended_palette_id;
  }
  return null;
}

export function mergedPreviewIdentityForVisual(
  registry: EffectRegistryPayload | null | undefined,
  visual: HailVisualFields,
): EffectRegistryPreviewIdentity | undefined {
  const entry = registryEntryForEffect(registry, visual.effectId);
  if (!entry) {
    return undefined;
  }
  const variationId = visual.effectVariationId || defaultVariationForEffect(registry, visual.effectId);
  const variation = variationId ? variationForEffect(registry, visual.effectId, variationId) : null;
  if (variation?.preview_identity && Object.keys(variation.preview_identity).length > 0) {
    return variation.preview_identity;
  }
  return entry.preview_identity;
}

export function previewProfileForVisual(
  registry: EffectRegistryPayload | null | undefined,
  visual: HailVisualFields,
): string {
  const variationId = visual.effectVariationId || defaultVariationForEffect(registry, visual.effectId);
  const variation = variationId ? variationForEffect(registry, visual.effectId, variationId) : null;
  return variation?.preview?.profile || variationId || "";
}

/**
 * Effect-layer palette for registry-honest preview (transporter beam, particles).
 * Uses variation or effect recommended palettes only — not visual.palette_id (glyph Color row).
 */
export function effectPreviewPaletteIdForVisual(
  visual: HailVisualFields,
  registryEntry: EffectRegistryEntry | null | undefined,
): string {
  if (!registryEntry?.variations?.length) {
    return (
      recommendedPaletteForVariation(registryEntry) ?? DEFAULT_EFFECT_PREVIEW_PALETTE_ID
    );
  }
  const variationId =
    visual.effectVariationId?.trim() ||
    registryEntry.default_variation_id ||
    registryEntry.variations.find((row) => row.default)?.id ||
    registryEntry.variations[0]?.id ||
    "";
  const variation = registryEntry.variations.find((row) => row.id === variationId) ?? null;
  return (
    recommendedPaletteForVariation(variation) ??
    recommendedPaletteForVariation(registryEntry) ??
    DEFAULT_EFFECT_PREVIEW_PALETTE_ID
  );
}

/** Color loadout → glyph palette on authoring and delivery previews. */
export function glyphPaletteIdForVisual(visual: HailVisualFields): string {
  return visual.paletteId.trim() || DEFAULT_EFFECT_PREVIEW_PALETTE_ID;
}

/** @deprecated Use effectPreviewPaletteIdForVisual — effect layer only. */
export function previewPaletteIdForVisual(
  visual: HailVisualFields,
  registryEntry: EffectRegistryEntry | null | undefined,
): string {
  return effectPreviewPaletteIdForVisual(visual, registryEntry);
}
