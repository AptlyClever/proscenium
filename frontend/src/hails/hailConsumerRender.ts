/** Google TV consumer render helpers — parity with build_consumer_render_payload. */

import type { ProceduralGraph } from "./hailProceduralGlyphs";
import { isProceduralGraph } from "./hailProceduralGlyphs";

export type GlyphRenderKind = "registry" | "procedural" | "emoji_fallback" | "image" | "image_layers";

export type GlyphImageLayerPayload = {
  role?: string;
  path?: string;
  z_index?: number;
  pulse_anchor?: string;
  image_url?: string;
  image_base64?: string;
  image_media_type?: string;
};

export type GlyphRenderRepresentation = "canonical" | "projected";

export type GlyphRenderPayload = {
  kind: GlyphRenderKind;
  glyph_id: string;
  procedural_graph?: ProceduralGraph;
  fallback?: string;
  google_tv_deliverable?: boolean;
  requested_glyph_id?: string;
  representation?: GlyphRenderRepresentation;
  projection_id?: string;
  source_signature?: string;
  image_url?: string;
  image_base64?: string;
  image_media_type?: string;
  layers?: GlyphImageLayerPayload[];
};

export type RenderTargetPayload = {
  surface?: string;
  contract?: string;
  rooms?: string[];
};

export function parseGlyphRender(value: unknown): GlyphRenderPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as GlyphRenderPayload;
  const kind = row.kind;
  if (kind !== "registry" && kind !== "procedural" && kind !== "emoji_fallback" && kind !== "image" && kind !== "image_layers") {
    return null;
  }
  if (typeof row.glyph_id !== "string" || !row.glyph_id.trim()) {
    return null;
  }
  if (kind === "procedural" && !isProceduralGraph(row.procedural_graph)) {
    return null;
  }
  if (kind === "image" && !row.image_url && !row.image_base64) {
    return null;
  }
  if (kind === "image_layers") {
    const layers = row.layers;
    if (!Array.isArray(layers) || layers.length < 2) {
      return null;
    }
  }
  return row;
}

export function glyphRenderFromConsumerPayload(
  payload: Record<string, unknown> | undefined | null,
): GlyphRenderPayload | null {
  if (!payload) {
    return null;
  }
  return parseGlyphRender(payload.glyph_render);
}

export function glyphRenderCanonicalFromConsumerPayload(
  payload: Record<string, unknown> | undefined | null,
): GlyphRenderPayload | null {
  if (!payload) {
    return null;
  }
  return parseGlyphRender(payload.glyph_render_canonical);
}

/** True when derive-preview exposes both canonical and TV-projected glyph graphs. */
export function hasDualGlyphDeliveryViews(
  payload: Record<string, unknown> | undefined | null,
): boolean {
  return glyphRenderCanonicalFromConsumerPayload(payload) !== null;
}

export function isGoogleTvGlyphDeliverable(render: GlyphRenderPayload | null | undefined): boolean {
  return render?.google_tv_deliverable === true;
}

/** Android overlay delivery per registry capability_summary.android. */
export function isGoogleTvEffectDeliverable(payload: Record<string, unknown> | undefined | null): boolean {
  const summary = payload?.capability_summary;
  if (!summary || typeof summary !== "object") {
    return false;
  }
  const android = (summary as { android?: string }).android;
  return android === "partial" || android === "full";
}

export function isGoogleTvRenderTarget(payload: Record<string, unknown> | undefined | null): boolean {
  const target = payload?.render_target;
  if (!target || typeof target !== "object") {
    return false;
  }
  return (target as RenderTargetPayload).surface === "google_tv";
}
