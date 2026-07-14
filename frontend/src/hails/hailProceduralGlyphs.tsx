/** Procedural custom glyph marks — parametric SVG graph (48×48 grid). */

import { hailGlyphPaletteStyle, resolveGlyphInk, resolveGlyphPaletteRoles } from "./hailGlyphPalette";
import { HailLegacyProceduralGlyph, type ProceduralMotifId } from "./hailProceduralGlyphsLegacy";

export type { ProceduralMotifId } from "./hailProceduralGlyphsLegacy";
export { isProceduralMotifId, PROCEDURAL_MOTIF_IDS } from "./hailProceduralGlyphsLegacy";

export type ProceduralPathSpec = {
  d: string;
  stroke?: string;
  stroke_width?: number;
  fill?: string;
  opacity?: number;
  stroke_linecap?: "round" | "butt" | "square";
  stroke_linejoin?: "round" | "miter" | "bevel";
  fill_rule?: "evenodd" | "nonzero";
};

export type ProceduralCircleSpec = {
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  opacity?: number;
};

export type ProceduralGraph = {
  version: 1;
  generator_id?: string;
  signature?: string;
  paths: ProceduralPathSpec[];
  circles?: ProceduralCircleSpec[];
  /** Optional server-side composition metadata (e.g. lead_phrase). */
  composition?: Record<string, unknown>;
};

/** Shared optical target — primary silhouette fits ~26×26 centered in 48×48. */
export const GLYPH_OPTICAL_BOX = { min: 11, max: 37, center: 24 } as const;

export function isProceduralGraph(value: unknown): value is ProceduralGraph {
  if (!value || typeof value !== "object") {
    return false;
  }
  const graph = value as ProceduralGraph;
  if (graph.version !== 1) {
    return false;
  }
  if (!Array.isArray(graph.paths) || graph.paths.length === 0) {
    return false;
  }
  return graph.paths.every((row) => typeof row?.d === "string" && row.d.trim().length > 0);
}

type HailProceduralGlyphProps = {
  graph?: ProceduralGraph | null;
  motifId?: ProceduralMotifId | null;
  paletteId?: string;
  className?: string;
};

function ProceduralGraphGlyph({
  graph,
  paletteId = "axiom_dark_cyan",
  className = "h-6 w-6",
}: {
  graph: ProceduralGraph;
  paletteId?: string;
  className?: string;
}) {
  const roles = resolveGlyphPaletteRoles(paletteId);
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      style={hailGlyphPaletteStyle(paletteId)}
      fill="none"
      aria-hidden="true"
      data-hail-glyph-palette={paletteId}
      data-hail-glyph-procedural-graph={graph.signature ?? graph.generator_id ?? "generated"}
    >
      {graph.paths.map((path, index) => (
        <path
          key={`path-${index}`}
          d={path.d}
          stroke={resolveGlyphInk(path.stroke, roles, "stroke")}
          strokeWidth={path.stroke_width ?? 2.5}
          fill={resolveGlyphInk(path.fill, roles, "fill")}
          fillRule={path.fill_rule}
          opacity={path.opacity ?? 1}
          strokeLinecap={path.stroke_linecap ?? "round"}
          strokeLinejoin={path.stroke_linejoin}
        />
      ))}
      {(graph.circles ?? []).map((circle, index) => (
        <circle
          key={`circle-${index}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          fill={resolveGlyphInk(circle.fill, roles, "fill")}
          opacity={circle.opacity ?? 0.9}
        />
      ))}
    </svg>
  );
}

export function HailProceduralGlyph({
  graph,
  motifId,
  paletteId = "axiom_dark_cyan",
  className = "h-6 w-6",
}: HailProceduralGlyphProps) {
  if (graph && isProceduralGraph(graph)) {
    return <ProceduralGraphGlyph graph={graph} paletteId={paletteId} className={className} />;
  }
  if (motifId) {
    return <HailLegacyProceduralGlyph motifId={motifId} paletteId={paletteId} className={className} />;
  }
  return null;
}
