import type { GlyphImageLayerPayload, GlyphRenderPayload } from "../hailConsumerRender";

type HailLayeredGlyphProps = {
  glyphRender: GlyphRenderPayload;
  className?: string;
  previewPhase?: string;
};

function layerSrc(layer: GlyphImageLayerPayload): string | null {
  if (layer.image_base64) {
    return `data:${layer.image_media_type ?? "image/png"};base64,${layer.image_base64}`;
  }
  return layer.image_url ?? null;
}

/**
 * Dual-layer Glyph Hero compositor (6b framework).
 */
export function HailLayeredGlyph({ glyphRender, className = "", previewPhase = "stable" }: HailLayeredGlyphProps) {
  const layers = glyphRender.layers ?? [];
  const sorted = [...layers].sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0));

  return (
    <span
      className={`relative inline-flex h-full w-full items-center justify-center ${className}`}
      data-hail-consumer-glyph="image_layers"
      data-hail-glyph-layer-count={sorted.length}
    >
      {sorted.map((layer) => {
        const src = layerSrc(layer);
        if (!src) {
          return null;
        }
        const pulse =
          layer.pulse_anchor === "glyphImpactPeak" &&
          (previewPhase === "entrance" || previewPhase === "gap");
        return (
          <img
            key={`${layer.role}-${layer.path}`}
            src={src}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-contain ${pulse ? "hail-glyph-layer-pulse" : ""}`}
            data-hail-glyph-layer-role={layer.role}
            data-hail-glyph-layer-pulse={pulse ? layer.pulse_anchor : undefined}
          />
        );
      })}
    </span>
  );
}
