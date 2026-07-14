/** Fixed authoring paintbox — one viewport size; modes scale inward only. */
import type { AuthoringPreviewScaleMode, HailAuthoringIntent } from "./hailAuthoringIntent";
import { authoringClusterGlyphScale } from "./hailAuthoringTierEnvelope";

/** Canonical paintbox for Forge, Hails edit, and New Hail — never changes between modes. */
export const HAIL_AUTHORING_PAINTBOX_WIDTH = "18rem";
export const HAIL_AUTHORING_PAINTBOX_HEIGHT = "16rem";

/** Pixel reference for 18×16rem at 16px/rem — package region math on locked authoring viewport. */
export const AUTHORING_PREVIEW_VIEWPORT = { width: 288, height: 256 } as const;

/** @deprecated Use HAIL_AUTHORING_PAINTBOX_* — all surfaces share one frame. */
export const HAIL_AUTHORING_PREVIEW_WIDTH = HAIL_AUTHORING_PAINTBOX_WIDTH;
/** @deprecated Use HAIL_AUTHORING_PAINTBOX_* — all surfaces share one frame. */
export const HAIL_AUTHORING_PREVIEW_HEIGHT = HAIL_AUTHORING_PAINTBOX_HEIGHT;

/** Preview column + loadout presets in authoring workspaces.
 *
 * The controls column was minmax(0,1fr) -- unbounded growth against the
 * fixed HAIL_AUTHORING_PAINTBOX_WIDTH preview, so on wide viewports the
 * loadout controls stretched to 700-900px against a 288px preview (found
 * live via screenshot, cfd-inspiration-20260709-025711 Slice D). Capped
 * instead of touching the preview's own width: HAIL_AUTHORING_PAINTBOX_WIDTH
 * is described below as locked authoring-viewport math other code depends
 * on for pixel-exact glyph positioning, so it's the wrong side to change.
 * Capping the controls column is scoped purely to CSS layout.
 *
 * items-stretch -> items-start: stretch was forcing both columns to match
 * the taller sibling's height, which -- combined with the preview column's
 * short, fixed content -- produced a large dead void under the preview
 * (found live via screenshot, same session). Each column now sizes to its
 * own content. */
export const hailAuthoringPreviewLoadoutGridClass =
  "grid grid-cols-1 items-start gap-4 md:grid-cols-[18rem_minmax(0,34rem)] md:gap-6";

export function hailAuthoringPreviewLoadoutGridClassForIntent(_intent: HailAuthoringIntent): string {
  return hailAuthoringPreviewLoadoutGridClass;
}

export function hailAuthoringPreviewDimensions(): { width: string; height: string } {
  return { width: HAIL_AUTHORING_PAINTBOX_WIDTH, height: HAIL_AUTHORING_PAINTBOX_HEIGHT };
}

export function hailAuthoringGlyphScaleForPreview(input: {
  sizeTier: string | undefined;
  intent: HailAuthoringIntent;
  scaleMode: AuthoringPreviewScaleMode;
}): number {
  return authoringClusterGlyphScale(input);
}

/** @deprecated Use hailAuthoringGlyphScaleForPreview */
export function hailAuthoringGlyphScaleForIntent(
  sizeTier: string | undefined,
  intent: HailAuthoringIntent,
): number {
  return hailAuthoringGlyphScaleForPreview({
    sizeTier,
    intent,
    scaleMode: intent === "glyph" ? "design" : "delivery",
  });
}

/** @deprecated Use authoringTierBaseScale */
export function hailAuthoringGlyphScale(sizeTier: string | undefined): number {
  if (sizeTier === "small") {
    return 0.88;
  }
  if (sizeTier === "large") {
    return 1.1;
  }
  return 1;
}
