import type { ComposerGlyphSpec } from "./api";
import type { GlyphCatalogEntry } from "./hails/hailGlyphRegistry";
import { glyphSelectorLabel } from "./hails/hailGlyphRegistry";
import { isCustomGlyphId } from "./hails/hailGlyphLibrary";
import type { HailEffectPreset } from "./hails/hailEffectsGallery";
import { visualPresentationSummary } from "./hails/hailComposerLabels";
import type { HailVisualFields } from "./hails/hailVisualContract";

export function composerGlyphLabel(
  glyphId: string,
  glyphCatalog: GlyphCatalogEntry[] | undefined,
  customGlyph: ComposerGlyphSpec | null | undefined,
): string {
  if (customGlyph?.label) {
    return customGlyph.label;
  }
  if (glyphId === "custom-pending") {
    return "New Glyph (not saved yet)";
  }
  if (!glyphId || glyphId === "default") {
    return glyphSelectorLabel(glyphId || "default", glyphCatalog);
  }
  return glyphSelectorLabel(glyphId, glyphCatalog);
}

export function composerGlyphStatusNote(
  glyphId: string,
  customGlyph: ComposerGlyphSpec | null | undefined,
): string | null {
  if (glyphId === "custom-pending") {
    return "Finish creating your Glyph, then save the Hail to add it to My Glyphs.";
  }
  if (customGlyph?.archived) {
    return "This Custom Glyph is archived but still works for this Hail.";
  }
  if (isCustomGlyphId(glyphId) && customGlyph) {
    return "Custom Glyph from My Glyphs.";
  }
  return null;
}

export function composerPresentationNote(
  activePreset: HailEffectPreset | null,
  visual: HailVisualFields | undefined,
): string {
  if (activePreset) {
    return activePreset.description;
  }
  if (!visual) {
    return "Custom presentation — pick an Effect Preset or use Customize.";
  }
  return `Custom presentation — ${visualPresentationSummary(visual)}. Pick an Effect Preset or use Customize.`;
}
