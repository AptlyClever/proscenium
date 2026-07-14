import type { ReactNode } from "react";
import { hailGlyphPaletteStyle } from "./hailGlyphPalette";

export const REGISTRY_GLYPH_IDS = [
  "hail-summons",
  "hail-alert",
  "hail-route",
  "hail-beacon",
  "default",
] as const;

export type HailGlyphId = (typeof REGISTRY_GLYPH_IDS)[number];

const REGISTRY_GLYPH_SET = new Set<string>(REGISTRY_GLYPH_IDS);

export function isRegistryGlyphId(value: string | undefined | null): value is HailGlyphId {
  return Boolean(value && REGISTRY_GLYPH_SET.has(value));
}

export function resolveHailGlyphId(icon: { kind?: string; value?: string } | null | undefined): HailGlyphId {
  if (icon?.kind === "glyph" && isRegistryGlyphId(icon.value)) {
    return icon.value;
  }
  return "default";
}

type HailMedallionProps = {
  glyphId: HailGlyphId;
  paletteId?: string;
  size?: "compact" | "standard" | "hero" | "tile" | "focus";
  /** Glyph only — no circular medallion shell. */
  bare?: boolean;
  /** Drop decorative outer rings from registry SVGs (preview / picker focus). */
  focusGlyph?: boolean;
  className?: string;
  emojiFallback?: string | null;
};

const MEDALLION_SIZES = {
  compact: { shell: "h-10 w-10", glyph: "h-6 w-6", defaultGlyph: "h-5 w-5", emoji: "text-lg", bare: "h-5 w-5", bareEmoji: "text-base" },
  standard: { shell: "h-12 w-12", glyph: "h-7 w-7", defaultGlyph: "h-6 w-6", emoji: "text-xl", bare: "h-7 w-7", bareEmoji: "text-lg" },
  hero: { shell: "h-20 w-20", glyph: "h-12 w-12", defaultGlyph: "h-10 w-10", emoji: "text-5xl", bare: "h-12 w-12", bareEmoji: "text-4xl" },
  tile: { shell: "h-9 w-9", glyph: "h-7 w-7", defaultGlyph: "h-6 w-6", emoji: "text-xl", bare: "h-9 w-9", bareEmoji: "text-2xl" },
  focus: { shell: "h-24 w-24", glyph: "h-20 w-20", defaultGlyph: "h-20 w-20", emoji: "text-5xl", bare: "h-20 w-20", bareEmoji: "text-5xl" },
} as const;

function RegistryMarkSvg({
  className = "h-6 w-6",
  paletteId = "axiom_dark_cyan",
  children,
}: {
  className?: string;
  paletteId?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      style={hailGlyphPaletteStyle(paletteId)}
      fill="none"
      aria-hidden="true"
      data-hail-glyph-palette={paletteId}
    >
      {children}
    </svg>
  );
}

function MedallionGlyph({
  glyphId,
  dims,
  paletteId = "axiom_dark_cyan",
  bare = false,
  focusGlyph = false,
}: {
  glyphId: HailGlyphId;
  dims: (typeof MEDALLION_SIZES)[keyof typeof MEDALLION_SIZES];
  paletteId?: string;
  bare?: boolean;
  focusGlyph?: boolean;
}) {
  const iconClass = bare ? dims.bare : undefined;
  switch (glyphId) {
    case "hail-summons":
      return <HailSummonsGlyph className={iconClass ?? dims.glyph} paletteId={paletteId} />;
    case "hail-alert":
      return <HailAlertGlyph className={iconClass ?? dims.glyph} paletteId={paletteId} />;
    case "hail-route":
      return <HailRouteGlyph className={iconClass ?? dims.glyph} paletteId={paletteId} />;
    case "hail-beacon":
      return (
        <HailBeaconGlyph className={iconClass ?? dims.glyph} paletteId={paletteId} omitOuterRing={focusGlyph} />
      );
    case "default":
      return (
        <HailDefaultGlyph
          className={iconClass ?? dims.defaultGlyph}
          paletteId={paletteId}
          omitOuterRing={focusGlyph}
        />
      );
    default:
      return (
        <HailDefaultGlyph
          className={iconClass ?? dims.defaultGlyph}
          paletteId={paletteId}
          omitOuterRing={focusGlyph}
        />
      );
  }
}

export function HailMedallion({
  glyphId,
  paletteId = "axiom_dark_cyan",
  size = "compact",
  bare = false,
  focusGlyph = false,
  className = "",
  emojiFallback = null,
}: HailMedallionProps) {
  const dims = MEDALLION_SIZES[size];

  if (bare) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center leading-none ${emojiFallback ? dims.bareEmoji : dims.bare} ${className}`}
        aria-hidden="true"
        data-hail-glyph-bare={focusGlyph ? "focus" : "true"}
        {...(emojiFallback ? { "data-hail-glyph-emoji-fallback": true } : {})}
      >
        {emojiFallback ? emojiFallback : <MedallionGlyph glyphId={glyphId} dims={dims} paletteId={paletteId} bare focusGlyph={focusGlyph} />}
      </span>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-raised)] ring-1 ring-[color:var(--ca-surface-border)] ${dims.shell} ${className}`}
      aria-hidden="true"
      {...(emojiFallback ? { "data-hail-glyph-emoji-fallback": true } : {})}
    >
      {emojiFallback ? (
        <span className={`${dims.emoji} leading-none`}>{emojiFallback}</span>
      ) : (
        <MedallionGlyph glyphId={glyphId} dims={dims} paletteId={paletteId} focusGlyph={focusGlyph} />
      )}
    </div>
  );
}

function HailSummonsGlyph({
  className = "h-6 w-6",
  paletteId = "axiom_dark_cyan",
}: {
  className?: string;
  paletteId?: string;
}) {
  return (
    <RegistryMarkSvg className={className} paletteId={paletteId}>
      <path d="M24 12v22" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
      <path d="M15 20h18M17 26h14" stroke="var(--ca-status-info-fg)" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M24 12 L20 16 M24 12 L28 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </RegistryMarkSvg>
  );
}

function HailAlertGlyph({
  className = "h-6 w-6",
  paletteId = "axiom_dark_cyan",
}: {
  className?: string;
  paletteId?: string;
}) {
  return (
    <RegistryMarkSvg className={className} paletteId={paletteId}>
      <path d="M13 17h22M15 24h18M17 31h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 31 L24 36" stroke="var(--ca-status-warning-fg)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="38.5" r="1.5" fill="var(--ca-status-warning-fg)" />
    </RegistryMarkSvg>
  );
}

function HailRouteGlyph({
  className = "h-6 w-6",
  paletteId = "axiom_dark_cyan",
}: {
  className?: string;
  paletteId?: string;
}) {
  return (
    <RegistryMarkSvg className={className} paletteId={paletteId}>
      <path d="M11 26c4-4 8-4 12 0s8 4 12 0" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M11 32c4-4 8-4 12 0s8 4 12 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
      <path d="M34 24 L38 20 M34 28 L38 32" stroke="var(--ca-status-info-fg)" strokeWidth="2" strokeLinecap="round" />
    </RegistryMarkSvg>
  );
}

function HailBeaconGlyph({
  className = "h-6 w-6",
  paletteId = "axiom_dark_cyan",
  omitOuterRing = false,
}: {
  className?: string;
  paletteId?: string;
  omitOuterRing?: boolean;
}) {
  return (
    <RegistryMarkSvg className={className} paletteId={paletteId}>
      {!omitOuterRing ? (
        <path d="M12 26a16 10 0 0 1 24 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      ) : null}
      <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.9" />
      <path d="M24 16v-2M24 34v2M16 24h-2M34 24h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </RegistryMarkSvg>
  );
}

function HailDefaultGlyph({
  className = "h-5 w-5",
  paletteId = "axiom_dark_cyan",
  omitOuterRing = false,
}: {
  className?: string;
  paletteId?: string;
  omitOuterRing?: boolean;
}) {
  if (omitOuterRing) {
    return (
      <RegistryMarkSvg className={className} paletteId={paletteId}>
        <path d="M24 16v16M16 24h16" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
      </RegistryMarkSvg>
    );
  }
  return (
    <RegistryMarkSvg className={className} paletteId={paletteId}>
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" />
      <path d="M24 16v16M16 24h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </RegistryMarkSvg>
  );
}
