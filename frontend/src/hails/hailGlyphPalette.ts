import type { CSSProperties } from "react";

/** Glyph Focus tint roles — aligned with hail-render-contract.v002-beta palettes.primary / accent. */
export const HAIL_GLYPH_PALETTE_ROLES: Record<string, { primary: string; accent: string }> = {
  monochrome: { primary: "var(--ca-text-primary)", accent: "var(--ca-text-secondary)" },
  axiom_dark_cyan: { primary: "#32b5a0", accent: "#7ee8d8" },
  transporter_white: { primary: "#8aa8b8", accent: "#c8dce8" },
  cute_purple: { primary: "#9b5a8c", accent: "#c878a8" },
  transporter_generation_next: { primary: "#4a8cc8", accent: "#d8ecff" },
  transporter_spoon: { primary: "#b8923a", accent: "#f5e6b8" },
};

const DEFAULT_PALETTE_ID = "axiom_dark_cyan";

export function resolveGlyphPaletteRoles(paletteId: string): { primary: string; accent: string } {
  const key = paletteId.trim() || DEFAULT_PALETTE_ID;
  return HAIL_GLYPH_PALETTE_ROLES[key] ?? HAIL_GLYPH_PALETTE_ROLES[DEFAULT_PALETTE_ID];
}

/** Stage vars for CSS-driven glyph tint (beats legacy Tailwind brand fallbacks). */
export function glyphPaletteStageVars(paletteId: string): CSSProperties {
  const roles = resolveGlyphPaletteRoles(paletteId);
  return {
    ["--hail-glyph-primary" as string]: roles.primary,
    ["--hail-glyph-accent" as string]: roles.accent,
  };
}

/** Map procedural path ink tokens to resolved hex for the active Color loadout. */
export function resolveGlyphInk(
  token: string | undefined,
  roles: { primary: string; accent: string },
  kind: "stroke" | "fill" = "stroke",
): string {
  const value = (token ?? "").trim();
  if (!value || value === "none") {
    return kind === "fill" ? "none" : roles.primary;
  }
  if (value === "currentColor") {
    return roles.primary;
  }
  if (value === "var(--ca-status-info-fg)" || value === "var(--hail-glyph-accent)") {
    return roles.accent;
  }
  return value;
}

/** Renderer-side tint for monochrome procedural paths (currentColor + accent secondary strokes). */
export function hailGlyphPaletteStyle(paletteId: string): CSSProperties {
  const roles = resolveGlyphPaletteRoles(paletteId);
  return {
    color: roles.primary,
    ["--hail-glyph-primary" as string]: roles.primary,
    ["--hail-glyph-accent" as string]: roles.accent,
    ["--ca-status-info-fg" as string]: roles.accent,
  };
}

/** Tailwind preview classes for compact chips where inline color is awkward. */
export const PALETTE_PREVIEW_CLASS: Record<string, string> = {
  axiom_dark_cyan: "text-[#32b5a0]",
  transporter_white: "text-[#8aa8b8]",
  cute_purple: "text-[#9b5a8c]",
};
