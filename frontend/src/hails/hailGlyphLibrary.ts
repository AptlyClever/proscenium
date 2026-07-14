import type { ComposerGlyphSpec } from "../api";
import { displayEffectId, displayPaletteId, displaySizeTier } from "./hailComposerLabels";
import { isProceduralGraph, isProceduralMotifId, type ProceduralGraph } from "./hailProceduralGlyphs";

export const CUSTOM_GLYPH_PREFIX = "custom-";

function normalizeSpeedTier(raw: unknown): ComposerGlyphSpec["speed_tier"] {
  const value = String(raw ?? "normal");
  return value === "slow" || value === "fast" ? value : "normal";
}

function normalizeTransitionStyle(raw: unknown): ComposerGlyphSpec["transition_style"] {
  const value = String(raw ?? "fade");
  return value === "slide_up" || value === "pulse" || value === "beam" ? value : "fade";
}

export function isCustomGlyphId(glyphId: string): boolean {
  return glyphId.startsWith(CUSTOM_GLYPH_PREFIX);
}

export function normalizeCustomGlyph(raw: Record<string, unknown>): ComposerGlyphSpec | null {
  const glyphId = String(raw.glyph_id ?? "").trim();
  if (!glyphId) {
    return null;
  }
  return {
    glyph_id: glyphId,
    label: String(raw.label ?? glyphId),
    source: raw.source ? String(raw.source) : "composer",
    fallback_emoji: String(raw.fallback_emoji ?? "✦"),
    procedural_motif_id: isProceduralMotifId(String(raw.procedural_motif_id ?? ""))
      ? String(raw.procedural_motif_id)
      : undefined,
    procedural_graph: isProceduralGraph(raw.procedural_graph) ? (raw.procedural_graph as ProceduralGraph) : undefined,
    glyph_family_id: (() => {
      const explicit = String(raw.glyph_family_id ?? "").trim();
      if (explicit) return explicit;
      if (isProceduralGraph(raw.procedural_graph)) {
        const fromGraph = String((raw.procedural_graph as ProceduralGraph).generator_id ?? "").trim();
        return fromGraph || undefined;
      }
      return undefined;
    })(),
    semantic_bucket: raw.semantic_bucket ? String(raw.semantic_bucket) : undefined,
    animation_enabled: raw.animation_enabled !== false,
    speed_tier: normalizeSpeedTier(raw.speed_tier),
    transition_style: normalizeTransitionStyle(raw.transition_style),
    visual: (raw.visual as Record<string, unknown>) ?? {},
    seed: typeof raw.seed === "number" ? raw.seed : undefined,
    archived: raw.archived === true,
    created_at: raw.created_at ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
  };
}

export function normalizeCustomGlyphs(raw: unknown): ComposerGlyphSpec[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((row) => (row && typeof row === "object" ? normalizeCustomGlyph(row as Record<string, unknown>) : null))
    .filter((g): g is ComposerGlyphSpec => g != null);
}

export function splitBuiltInGlyphIds(knownGlyphs: string[]): string[] {
  return knownGlyphs.filter((id) => !isCustomGlyphId(id));
}

/** Operator compose strip — built-in registry marks are retired; only system default remains. */
export function composableBuiltInGlyphIds(knownGlyphs: string[]): string[] {
  return splitBuiltInGlyphIds(knownGlyphs).filter((id) => id === "default");
}

export function myGlyphsForSelector(customGlyphs: ComposerGlyphSpec[], selectedGlyphId?: string): ComposerGlyphSpec[] {
  const active = customGlyphs.filter((g) => g.archived !== true);
  if (!selectedGlyphId || !isCustomGlyphId(selectedGlyphId)) {
    return active;
  }
  const selected = customGlyphs.find((g) => g.glyph_id === selectedGlyphId);
  if (!selected || active.some((g) => g.glyph_id === selectedGlyphId)) {
    return active;
  }
  return [...active, selected];
}

export function customGlyphStyleSummary(spec: ComposerGlyphSpec): string {
  const visual = spec.visual ?? {};
  return `${displayEffectId(String(visual.effect_id ?? "transporter"))} · ${displayPaletteId(String(visual.palette_id ?? "axiom_dark_cyan"))} · ${displaySizeTier(String(visual.scale ?? "medium"))}`;
}

export function formatGlyphTimestamp(value?: string): string | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
