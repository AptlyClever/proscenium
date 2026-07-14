/** @deprecated Legacy motif library — prefer procedural_graph from Forge seed. */

import type { ReactNode } from "react";
import { hailGlyphPaletteStyle } from "./hailGlyphPalette";

export type ProceduralMotifId =
  | "arc-mark"
  | "beam-rise"
  | "orbit-sweep"
  | "stack-pulse"
  | "diamond-node"
  | "wave-forward"
  | "signal-post"
  | "balance-cross";

export const PROCEDURAL_MOTIF_IDS: ProceduralMotifId[] = [
  "arc-mark",
  "beam-rise",
  "orbit-sweep",
  "stack-pulse",
  "diamond-node",
  "wave-forward",
  "signal-post",
  "balance-cross",
];

/** Shared optical target — primary silhouette fits ~26×26 centered in 48×48. */
export const GLYPH_OPTICAL_BOX = { min: 11, max: 37, center: 24 } as const;

/** Per-motif tuning so vertical/horizontal motifs share similar visual mass. */
const MOTIF_OPTICAL_SCALE: Record<ProceduralMotifId, number> = {
  "arc-mark": 1.06,
  "beam-rise": 0.94,
  "orbit-sweep": 1.02,
  "stack-pulse": 1.08,
  "diamond-node": 1,
  "wave-forward": 1.04,
  "signal-post": 0.84,
  "balance-cross": 1,
};

export function isProceduralMotifId(value: string | undefined | null): value is ProceduralMotifId {
  return Boolean(value && PROCEDURAL_MOTIF_IDS.includes(value as ProceduralMotifId));
}

type HailProceduralGlyphProps = {
  motifId: ProceduralMotifId;
  className?: string;
};

function ProceduralGlyphFrame({
  motifId,
  paletteId = "axiom_dark_cyan",
  className = "h-6 w-6",
  children,
}: {
  motifId: ProceduralMotifId;
  paletteId?: string;
  className?: string;
  children: ReactNode;
}) {
  const optical = MOTIF_OPTICAL_SCALE[motifId];
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      style={hailGlyphPaletteStyle(paletteId)}
      fill="none"
      aria-hidden="true"
      data-hail-glyph-palette={paletteId}
      data-hail-glyph-procedural-frame={motifId}
    >
      <g transform={`translate(${GLYPH_OPTICAL_BOX.center} ${GLYPH_OPTICAL_BOX.center}) scale(${optical}) translate(-${GLYPH_OPTICAL_BOX.center} -${GLYPH_OPTICAL_BOX.center})`}>
        {children}
      </g>
    </svg>
  );
}

function ArcMarkGlyph({ className = "h-6 w-6", paletteId }: { className?: string; paletteId?: string }) {
  return (
    <ProceduralGlyphFrame motifId="arc-mark" paletteId={paletteId} className={className}>
      <path d="M13 27c5-7 17-7 22 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="22" r="3.5" fill="currentColor" opacity="0.9" />
    </ProceduralGlyphFrame>
  );
}

function BeamRiseGlyph({ className = "h-6 w-6", paletteId }: { className?: string; paletteId?: string }) {
  return (
    <ProceduralGlyphFrame motifId="beam-rise" paletteId={paletteId} className={className}>
      <path d="M17 31 L24 15 L31 31" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 25 L19 19 M29 19 L35 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
    </ProceduralGlyphFrame>
  );
}

function OrbitSweepGlyph({ className = "h-6 w-6", paletteId }: { className?: string; paletteId?: string }) {
  return (
    <ProceduralGlyphFrame motifId="orbit-sweep" paletteId={paletteId} className={className}>
      <path d="M11 26a17 10 0 0 1 26 0" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M33 24 L37 20 M33 28 L37 32" stroke="var(--ca-status-info-fg)" strokeWidth="2" strokeLinecap="round" />
    </ProceduralGlyphFrame>
  );
}

function StackPulseGlyph({ className = "h-6 w-6", paletteId }: { className?: string; paletteId?: string }) {
  return (
    <ProceduralGlyphFrame motifId="stack-pulse" paletteId={paletteId} className={className}>
      <path d="M13 17h22M15 24h18M17 31h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </ProceduralGlyphFrame>
  );
}

function DiamondNodeGlyph({ className = "h-6 w-6", paletteId }: { className?: string; paletteId?: string }) {
  return (
    <ProceduralGlyphFrame motifId="diamond-node" paletteId={paletteId} className={className}>
      <path d="M24 13 L35 24 L24 35 L13 24 Z" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="2.5" fill="currentColor" />
    </ProceduralGlyphFrame>
  );
}

function WaveForwardGlyph({ className = "h-6 w-6", paletteId }: { className?: string; paletteId?: string }) {
  return (
    <ProceduralGlyphFrame motifId="wave-forward" paletteId={paletteId} className={className}>
      <path d="M11 26c4-4 8-4 12 0s8 4 12 0" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M11 32c4-4 8-4 12 0s8 4 12 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </ProceduralGlyphFrame>
  );
}

function SignalPostGlyph({ className = "h-6 w-6", paletteId }: { className?: string; paletteId?: string }) {
  return (
    <ProceduralGlyphFrame motifId="signal-post" paletteId={paletteId} className={className}>
      <path d="M24 13v19" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
      <path d="M15 19h18M17 25h14" stroke="var(--ca-status-info-fg)" strokeWidth="2" strokeLinecap="round" />
    </ProceduralGlyphFrame>
  );
}

function BalanceCrossGlyph({ className = "h-6 w-6", paletteId }: { className?: string; paletteId?: string }) {
  return (
    <ProceduralGlyphFrame motifId="balance-cross" paletteId={paletteId} className={className}>
      <path d="M24 15v18M15 24h18" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
      <path d="M15 19h6M27 29h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </ProceduralGlyphFrame>
  );
}

const MOTIF_COMPONENTS: Record<
  ProceduralMotifId,
  (props: { className?: string; paletteId?: string }) => JSX.Element
> = {
  "arc-mark": ArcMarkGlyph,
  "beam-rise": BeamRiseGlyph,
  "orbit-sweep": OrbitSweepGlyph,
  "stack-pulse": StackPulseGlyph,
  "diamond-node": DiamondNodeGlyph,
  "wave-forward": WaveForwardGlyph,
  "signal-post": SignalPostGlyph,
  "balance-cross": BalanceCrossGlyph,
};

export function HailLegacyProceduralGlyph({
  motifId,
  paletteId = "axiom_dark_cyan",
  className = "h-6 w-6",
}: {
  motifId: ProceduralMotifId;
  paletteId?: string;
  className?: string;
}) {
  const Component = MOTIF_COMPONENTS[motifId];
  return <Component className={className} paletteId={paletteId} />;
}

/** @deprecated Use HailLegacyProceduralGlyph — kept for imports from hailProceduralGlyphs.tsx */
export function HailProceduralGlyph({ motifId, className = "h-6 w-6" }: HailProceduralGlyphProps) {
  return <HailLegacyProceduralGlyph motifId={motifId} className={className} />;
}
