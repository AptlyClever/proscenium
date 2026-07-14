/**
 * Standard preview chips below the paintbox — one catalog, intent-filtered.
 * Canon: never rename "Glyph" or "Effect" in layer labels (doctrine-axiom-hail-forge-v001).
 */
import type { HailAuthoringIntent } from "./hailAuthoringIntent";

export type AuthoringPreviewChipId =
  | "design-view"
  | "tv-size"
  | "glyph-canonical"
  | "glyph-tv-delivery"
  | "effect"
  | "glyph"
  | "message"
  | "shell"
  | "re-encode";

export type AuthoringPreviewChipKind = "view-mode" | "layer" | "action";

export type AuthoringPreviewChipDef = {
  id: AuthoringPreviewChipId;
  label: string;
  kind: AuthoringPreviewChipKind;
};

/** Canonical chip definitions — shared by Hails edit and Hail Forge. */
export const AUTHORING_PREVIEW_CHIP_CATALOG: Record<AuthoringPreviewChipId, AuthoringPreviewChipDef> = {
  "design-view": { id: "design-view", label: "Design view", kind: "view-mode" },
  "tv-size": { id: "tv-size", label: "TV size", kind: "view-mode" },
  "glyph-canonical": { id: "glyph-canonical", label: "Canonical", kind: "view-mode" },
  "glyph-tv-delivery": { id: "glyph-tv-delivery", label: "TV delivery", kind: "view-mode" },
  effect: { id: "effect", label: "Effect", kind: "layer" },
  glyph: { id: "glyph", label: "Glyph", kind: "layer" },
  message: { id: "message", label: "Message", kind: "layer" },
  shell: { id: "shell", label: "Shell", kind: "layer" },
  "re-encode": { id: "re-encode", label: "Re-encode Glyph", kind: "action" },
};

/**
 * Chips shown under the preview for each authoring context.
 * Order is fixed — membership changes by intent only (not mirrored across Forge/Hails).
 */
function glyphDeliveryViewChips(): AuthoringPreviewChipDef[] {
  return [
    AUTHORING_PREVIEW_CHIP_CATALOG["glyph-canonical"],
    AUTHORING_PREVIEW_CHIP_CATALOG["glyph-tv-delivery"],
  ];
}

export function authoringPreviewChipsForIntent(input: {
  intent: HailAuthoringIntent;
  customGlyphSelected?: boolean;
}): AuthoringPreviewChipDef[] {
  const deliveryChips = input.customGlyphSelected ? glyphDeliveryViewChips() : [];

  if (input.intent === "compose") {
    return [
      ...deliveryChips,
      AUTHORING_PREVIEW_CHIP_CATALOG.effect,
      AUTHORING_PREVIEW_CHIP_CATALOG.message,
      AUTHORING_PREVIEW_CHIP_CATALOG.shell,
    ];
  }

  if (input.intent === "effect") {
    return [AUTHORING_PREVIEW_CHIP_CATALOG.glyph, AUTHORING_PREVIEW_CHIP_CATALOG.shell];
  }

  if (input.intent === "glyph") {
    return [
      ...deliveryChips,
      AUTHORING_PREVIEW_CHIP_CATALOG.effect,
      AUTHORING_PREVIEW_CHIP_CATALOG.message,
      AUTHORING_PREVIEW_CHIP_CATALOG.shell,
      AUTHORING_PREVIEW_CHIP_CATALOG["re-encode"],
    ];
  }

  return [AUTHORING_PREVIEW_CHIP_CATALOG.effect];
}
