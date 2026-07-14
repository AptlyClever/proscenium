/**
 * E3 — layout_regions.glyph_art (card-style ink rect smaller than effect_field).
 */
import type { HailGlyphFocusRegion, HailLayoutRect, HailLayoutRegions } from "./hailPaintboxLayoutRegions";

export type HailGlyphArtRegion = HailLayoutRect & {
  center_x: number;
  center_y: number;
};

/** Drawn ink bounds — falls back to glyph_focus when glyph_art absent (v1). */
export function resolveGlyphArtRegion(
  regions: HailLayoutRegions,
): HailGlyphFocusRegion | HailGlyphArtRegion {
  return regions.glyph_art ?? regions.glyph_focus;
}
