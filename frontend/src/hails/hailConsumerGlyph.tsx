import { HailMedallion, resolveHailGlyphId } from "./hailMedallions";
import { HailLayeredGlyph } from "./components/HailLayeredGlyph";
import { HailProceduralGlyph } from "./hailProceduralGlyphs";
import type { GlyphRenderPayload } from "./hailConsumerRender";
import { isGoogleTvGlyphDeliverable } from "./hailConsumerRender";
import { isCustomGlyphId } from "./hailGlyphLibrary";

const GLYPH_SIZES = {
  compact: "h-5 w-5",
  standard: "h-7 w-7",
  hero: "h-12 w-12",
  tile: "h-9 w-9",
  focus: "h-20 w-20",
} as const;

type HailConsumerGlyphProps = {
  glyphRender: GlyphRenderPayload | null;
  glyphId?: string;
  paletteId?: string;
  pending?: boolean;
  size?: keyof typeof GLYPH_SIZES;
  bare?: boolean;
  focusGlyph?: boolean;
  /** Fill layout_regions.glyph_focus — package-first Tier B presentation. */
  regionFill?: boolean;
  className?: string;
  previewPhase?: string;
};

/**
 * Glyph Focus layer — renders only from consumer ``glyph_render`` (Google TV parity).
 */
export function HailConsumerGlyph({
  glyphRender,
  glyphId = "",
  paletteId = "axiom_dark_cyan",
  pending = false,
  size = "standard",
  bare = false,
  focusGlyph = false,
  regionFill = false,
  className = "",
  previewPhase = "stable",
}: HailConsumerGlyphProps) {
  const iconClass = regionFill ? "h-full w-full max-h-full max-w-full" : GLYPH_SIZES[size];

  if (glyphRender?.kind === "image_layers" && glyphRender.layers?.length) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center leading-none ${iconClass} ${className}`}
        data-hail-consumer-glyph="image_layers"
        data-hail-glyph-tv-deliverable={isGoogleTvGlyphDeliverable(glyphRender) ? "true" : "false"}
      >
        <HailLayeredGlyph glyphRender={glyphRender} className={iconClass} previewPhase={previewPhase} />
      </span>
    );
  }

  if (glyphRender?.kind === "procedural" && glyphRender.procedural_graph) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center leading-none ${iconClass} ${className}`}
        aria-hidden="true"
        data-hail-consumer-glyph="procedural"
        data-hail-glyph-procedural={glyphRender.procedural_graph.signature ?? "generated"}
        data-hail-glyph-bare={focusGlyph ? "focus" : bare ? "true" : undefined}
      >
        <HailProceduralGlyph graph={glyphRender.procedural_graph} paletteId={paletteId} className={iconClass} />
      </span>
    );
  }

  if (glyphRender?.kind === "image" && (glyphRender.image_url || glyphRender.image_base64)) {
    const src = glyphRender.image_base64
      ? `data:${glyphRender.image_media_type ?? "image/png"};base64,${glyphRender.image_base64}`
      : glyphRender.image_url;
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center leading-none ${iconClass} ${className}`}
        data-hail-consumer-glyph="image"
        data-hail-glyph-tv-deliverable={isGoogleTvGlyphDeliverable(glyphRender) ? "true" : "false"}
      >
        <img src={src} alt="" aria-hidden="true" className="h-full w-full object-contain" />
      </span>
    );
  }

  if (glyphRender?.kind === "registry") {
    const registryId = resolveHailGlyphId({ kind: "glyph", value: glyphRender.glyph_id });
    return (
      <span
        data-hail-consumer-glyph="registry"
        className={`inline-flex items-center justify-center ${regionFill ? "h-full w-full max-h-full max-w-full" : ""} ${className}`}
      >
        <HailMedallion
          glyphId={registryId}
          paletteId={paletteId}
          size={regionFill ? "hero" : size}
          bare={bare || regionFill}
          focusGlyph={focusGlyph || regionFill}
          className={regionFill ? "h-full w-full max-h-full max-w-full" : undefined}
        />
      </span>
    );
  }

  if (glyphRender?.kind === "emoji_fallback") {
    return (
      <span
        data-hail-consumer-glyph="emoji_fallback"
        data-hail-glyph-tv-deliverable={isGoogleTvGlyphDeliverable(glyphRender) ? "true" : "false"}
        className={`inline-flex ${className}`}
      >
        <HailMedallion
          glyphId="default"
          paletteId={paletteId}
          size={size}
          bare={bare}
          focusGlyph={focusGlyph}
          emojiFallback={glyphRender.fallback ?? "✦"}
        />
      </span>
    );
  }

  if (isCustomGlyphId(glyphId)) {
    if (regionFill && pending) {
      return null;
    }
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-md border border-dashed border-[color:var(--ca-surface-border)] ${iconClass} ${className}`}
        data-hail-consumer-glyph={pending ? "pending" : "unresolved"}
        aria-hidden="true"
      />
    );
  }

  const registryId = resolveHailGlyphId({ kind: "glyph", value: glyphId || "default" });
  return (
    <span data-hail-consumer-glyph="legacy" className={`inline-flex ${className}`}>
      <HailMedallion glyphId={registryId} paletteId={paletteId} size={size} bare={bare} focusGlyph={focusGlyph} />
    </span>
  );
}
