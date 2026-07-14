/** Derive-preview inputs and consumer glyph resolution for Paintbox. */

import type { ComposerGlyphSpec } from "./hailGlyphComposer";
import {
  glyphRenderCanonicalFromConsumerPayload,
  glyphRenderFromConsumerPayload,
  hasDualGlyphDeliveryViews,
  isGoogleTvGlyphDeliverable,
  type GlyphRenderPayload,
} from "./hailConsumerRender";

/** Authoring preview — canonical hero graph vs TV overlay delivery projection. */
export type AuthoringGlyphDeliveryView = "canonical" | "tv_delivery";

/** Draft custom glyphs merged into derive-preview request (consumer projection input). */
export function customGlyphsOverlayRecord(
  customGlyphs: ComposerGlyphSpec[] | undefined,
  draft?: ComposerGlyphSpec | null,
): Record<string, ComposerGlyphSpec> | undefined {
  const overlays: Record<string, ComposerGlyphSpec> = {};
  for (const glyph of customGlyphs ?? []) {
    if (glyph.glyph_id.startsWith("custom-")) {
      overlays[glyph.glyph_id] = glyph;
    }
  }
  if (draft?.glyph_id?.startsWith("custom-")) {
    overlays[draft.glyph_id] = draft;
  }
  return Object.keys(overlays).length > 0 ? overlays : undefined;
}

/** Paintbox glyph layer — consumer payload only (no client-side re-projection). */
export function resolvePaintboxGlyphRender(
  payload: Record<string, unknown> | undefined | null,
  glyphId: string,
  deliveryView: AuthoringGlyphDeliveryView = "canonical",
): GlyphRenderPayload | null {
  const tv = glyphRenderFromConsumerPayload(payload);
  const canonical = glyphRenderCanonicalFromConsumerPayload(payload);
  const render =
    deliveryView === "tv_delivery"
      ? tv
      : canonical ?? tv;
  if (!render || render.glyph_id !== glyphId) {
    return null;
  }
  return render;
}

export function glyphDeliveryHonestyLabel(
  deliveryView: AuthoringGlyphDeliveryView,
  payload: Record<string, unknown> | undefined | null,
): string | null {
  if (!hasDualGlyphDeliveryViews(payload)) {
    return null;
  }
  if (deliveryView === "canonical") {
    return "Canonical hero — authoring graph";
  }
  const projectionId = glyphRenderFromConsumerPayload(payload)?.projection_id;
  return projectionId
    ? `TV delivery — ${projectionId} (matches overlay POST)`
    : "TV delivery — matches overlay POST";
}

export { hasDualGlyphDeliveryViews };

export function isTvDeliverableGlyphRender(render: GlyphRenderPayload | null | undefined): boolean {
  return isGoogleTvGlyphDeliverable(render ?? null);
}
