/**
 * Step 3 — Glyph color scope Phase A (imprint rev 2).
 * `visual.palette_id` tints glyph on authoring previews only.
 * Effects use registry-designed palettes (variation recommended_palette_id), not the Color row.
 * Grid scrim and message stay neutral until Message color / Effect Kit rows ship.
 */
import type { CSSProperties } from "react";

/** Color loadout → glyph palette on authoring surfaces. */
export function authoringGlyphPaletteIdFromLoadout(paletteId: string): string {
  const id = paletteId.trim();
  return id || "axiom_dark_cyan";
}

/** @deprecated Use authoringGlyphPaletteIdFromLoadout — glyph follows Color row, not monochrome. */
export function authoringGlyphPaletteIdForPreview(): string {
  return "monochrome";
}

export function authoringNeutralStageChromeVars(): CSSProperties {
  return {
    ["--hail-paintbox-border" as string]: "var(--ca-surface-border)",
    ["--hail-paintbox-panel-bg" as string]: "var(--ca-surface-panel)",
    ["--hail-paintbox-message" as string]: "var(--ca-text-muted)",
  };
}

export function authoringNeutralMessageStyle(): CSSProperties {
  return {
    color: "var(--ca-text-muted)",
  };
}
