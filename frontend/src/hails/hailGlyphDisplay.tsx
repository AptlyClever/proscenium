import type { ComposerGlyphSpec } from "../api";
import { isCustomGlyphId } from "./hailGlyphLibrary";
import { glyphCatalogById, glyphSelectorLabel, type GlyphCatalogEntry } from "./hailGlyphRegistry";
import { HailMedallion, resolveHailGlyphId, type HailGlyphId } from "./hailMedallions";
import { HailProceduralGlyph, isProceduralGraph, isProceduralMotifId, type ProceduralGraph, type ProceduralMotifId } from "./hailProceduralGlyphs";

export type GlyphDisplayKind = "registry" | "emoji" | "procedural" | "default";

export type GlyphDisplay = {
  kind: GlyphDisplayKind;
  registryId: HailGlyphId;
  emoji: string;
  label: string;
  glyphArchived: boolean;
  proceduralMotifId?: ProceduralMotifId;
  proceduralGraph?: ProceduralGraph;
};

const PROCEDURAL_SIZES = {
  compact: "h-5 w-5",
  standard: "h-7 w-7",
  hero: "h-12 w-12",
  tile: "h-9 w-9",
  focus: "h-20 w-20",
} as const;

export function isGlyphArchived(
  glyphId: string,
  customGlyphs?: ComposerGlyphSpec[],
  glyphCatalog?: GlyphCatalogEntry[],
): boolean {
  const custom = customGlyphs?.find((glyph) => glyph.glyph_id === glyphId);
  if (custom?.archived === true) {
    return true;
  }
  const entry = glyphCatalogById(glyphCatalog).get(glyphId);
  return entry?.status === "archived";
}

export function resolveGlyphDisplay(
  glyphId: string,
  options?: {
    glyphCatalog?: GlyphCatalogEntry[];
    customGlyphs?: ComposerGlyphSpec[];
    customGlyph?: ComposerGlyphSpec | null;
  },
): GlyphDisplay {
  const catalog = options?.glyphCatalog;
  const customGlyphs = options?.customGlyphs ?? [];
  const catalogEntry = glyphCatalogById(catalog).get(glyphId);
  const custom =
    options?.customGlyph ?? customGlyphs.find((glyph) => glyph.glyph_id === glyphId) ?? null;
  const glyphArchived = isGlyphArchived(glyphId, customGlyphs, catalog);
  const emoji = custom?.fallback_emoji ?? catalogEntry?.fallback_emoji ?? "✦";
  const label = glyphSelectorLabel(glyphId, catalog);

  if (isCustomGlyphId(glyphId)) {
    if (isProceduralGraph(custom?.procedural_graph)) {
      return {
        kind: "procedural",
        registryId: "default",
        emoji,
        label,
        glyphArchived,
        proceduralGraph: custom.procedural_graph,
      };
    }
    if (isProceduralMotifId(custom?.procedural_motif_id)) {
      return {
        kind: "procedural",
        registryId: "default",
        emoji,
        label,
        glyphArchived,
        proceduralMotifId: custom.procedural_motif_id,
      };
    }
    return {
      kind: "emoji",
      registryId: "default",
      emoji,
      label,
      glyphArchived,
    };
  }

  const registryId = resolveHailGlyphId({ kind: "glyph", value: glyphId });
  if (registryId !== "default" || glyphId === "default") {
    return {
      kind: "registry",
      registryId,
      emoji,
      label,
      glyphArchived,
    };
  }

  return {
    kind: "default",
    registryId: "default",
    emoji,
    label,
    glyphArchived,
  };
}

type HailGlyphAvatarProps = {
  glyphId: string;
  glyphCatalog?: GlyphCatalogEntry[];
  customGlyphs?: ComposerGlyphSpec[];
  customGlyph?: ComposerGlyphSpec | null;
  paletteId?: string;
  size?: "compact" | "standard" | "hero" | "tile" | "focus";
  bare?: boolean;
  focusGlyph?: boolean;
  className?: string;
};

export function HailGlyphAvatar({
  glyphId,
  glyphCatalog,
  customGlyphs,
  customGlyph = null,
  paletteId,
  size = "compact",
  bare = false,
  focusGlyph = false,
  className = "",
}: HailGlyphAvatarProps) {
  const catalog = glyphCatalog;
  const customGlyphsList = customGlyphs ?? [];
  const custom =
    customGlyph ?? customGlyphsList.find((glyph) => glyph.glyph_id === glyphId) ?? null;
  const display = resolveGlyphDisplay(glyphId, { glyphCatalog: catalog, customGlyphs: customGlyphsList, customGlyph: custom });
  const iconClass = PROCEDURAL_SIZES[size];
  const resolvedPaletteId =
    paletteId ?? String((custom?.visual as { palette_id?: string } | undefined)?.palette_id ?? "axiom_dark_cyan");

  if (display.kind === "procedural" && (display.proceduralGraph || display.proceduralMotifId)) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center leading-none ${iconClass} ${className}`}
        aria-hidden="true"
        data-hail-glyph-procedural={display.proceduralGraph?.signature ?? display.proceduralMotifId ?? "generated"}
        data-hail-glyph-bare={focusGlyph ? "focus" : "true"}
      >
        <HailProceduralGlyph
          graph={display.proceduralGraph}
          motifId={display.proceduralMotifId}
          paletteId={resolvedPaletteId}
          className={iconClass}
        />
      </span>
    );
  }

  return (
    <HailMedallion
      glyphId={display.registryId}
      paletteId={resolvedPaletteId}
      size={size}
      bare={bare}
      focusGlyph={focusGlyph}
      className={className}
      emojiFallback={display.kind === "emoji" ? display.emoji : null}
    />
  );
}

export function GlyphArchivedBadge({
  glyphId,
  customGlyphs,
  glyphCatalog,
}: {
  glyphId: string;
  customGlyphs?: ComposerGlyphSpec[];
  glyphCatalog?: GlyphCatalogEntry[];
}) {
  if (!isGlyphArchived(glyphId, customGlyphs, glyphCatalog)) {
    return null;
  }
  return (
    <span
      className="rounded bg-[color:var(--ca-surface-border)] px-1.5 py-0.5 text-ca-2xs uppercase text-[color:var(--ca-text-muted)]"
      data-hail-glyph-archived-badge
    >
      Archived Glyph
    </span>
  );
}
