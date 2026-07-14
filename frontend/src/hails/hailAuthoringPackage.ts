/**
 * Hail package — shared coordinate frame for Glyph + Effect layers.
 * Package size is authoritative (tier contract or full hero in design mode);
 * layers scale and draw inside the package; chips toggle layer visibility only.
 */
import type { AuthoringPreviewScaleMode } from "./hailAuthoringIntent";
import { authoringTierEnvelopePct } from "./hailAuthoringTierEnvelope";

/** Normalized beam anchor inside the package (shared by canvas + CSS field styles). */
export const HAIL_PACKAGE_ANCHOR = { x: 0.5, y: 0.5 } as const;

export function authoringPackageUsesTierSizing(scaleMode: AuthoringPreviewScaleMode): boolean {
  return scaleMode === "delivery";
}

/** Package occupies the full placement anchor box (tier % or 100% in design). */
export function authoringPackageBoxStyle(input: {
  scaleMode: AuthoringPreviewScaleMode;
  sizeTier: string | undefined;
}): { width: string; height: string } {
  if (input.scaleMode === "delivery") {
    const envelope = authoringTierEnvelopePct(input.sizeTier);
    return { width: `${envelope.widthPct}%`, height: `${envelope.heightPct}%` };
  }
  return { width: "100%", height: "100%" };
}

export function authoringPackageRootClass(): string {
  return "absolute inset-0 isolate overflow-visible";
}

export function authoringPackageEffectLayerClass(): string {
  return "pointer-events-none absolute inset-0 overflow-visible";
}

/** Effect layer scoped to layout_regions.effect_field (legacy: transporter_beam_envelope). */
export function authoringPackageEffectLayerRegionClass(): string {
  return "pointer-events-none absolute overflow-visible";
}

export function authoringPackageGlyphLayerClass(): string {
  return "absolute inset-0 z-[1] flex items-center justify-center";
}

/** Glyph layer positioned by layout_regions.glyph_art (E3) or glyph_focus (v1). */
export function authoringPackageGlyphLayerRegionClass(): string {
  return "absolute z-[1] overflow-visible";
}
