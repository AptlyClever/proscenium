/** Forge / studio preview intent — same consumer stack, different chrome defaults. */

export type HailAuthoringIntent = "glyph" | "effect" | "compose";

/** Preview scale inside the fixed paintbox — viewport never resizes. */
export type AuthoringPreviewScaleMode = "design" | "delivery";

/** @deprecated Use AuthoringPreviewScaleMode */
export type AuthoringGlyphPreviewScale = AuthoringPreviewScaleMode;

export type HailAuthoringLayerToggles = {
  effectsEnabled: boolean;
  glyphVisible: boolean;
  messageVisible: boolean;
  shellVisible: boolean;
};

export function defaultAuthoringLayerToggles(input: {
  intent: HailAuthoringIntent;
  isNewGlyph?: boolean;
}): HailAuthoringLayerToggles {
  if (input.intent === "glyph") {
    return {
      effectsEnabled: false,
      glyphVisible: true,
      messageVisible: false,
      shellVisible: false,
    };
  }
  if (input.intent === "effect") {
    return {
      effectsEnabled: true,
      glyphVisible: true,
      messageVisible: false,
      shellVisible: true,
    };
  }
  return {
    effectsEnabled: true,
    glyphVisible: true,
    messageVisible: true,
    shellVisible: true,
  };
}

/** Resolve scale mode — Forge Create magnifies (design); Hails/Effect Forge use delivery. */
export function authoringPreviewScaleModeForSurface(input: {
  intent: HailAuthoringIntent;
}): AuthoringPreviewScaleMode {
  if (input.intent === "glyph") {
    return "design";
  }
  return "delivery";
}

export function authoringPreviewMessage(input: {
  intent: HailAuthoringIntent;
  draftLabel: string;
}): string {
  if (input.intent === "glyph") {
    return input.draftLabel.trim() || "Preview mark";
  }
  return input.draftLabel.trim() || "Your message";
}
