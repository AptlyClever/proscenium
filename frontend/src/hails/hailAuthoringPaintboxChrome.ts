/** Locked authoring paintbox chrome — Forge + Hails studio share one frame contract. */
import type { CSSProperties } from "react";
import type { HailAuthoringIntent } from "./hailAuthoringIntent";
import type { HailVisualFields } from "./hailVisualContract";

export type AuthoringPaintboxChromeMode = "bare" | "shell";

/**
 * Tier B — all registry-honest authoring surfaces center the package cluster in the
 * locked paintbox. Hails compose is delivery preview; Forge Create magnifies the same package.
 */
export function authoringPaintboxUsesPlacementAnchor(_input: {
  isCleanStage: boolean;
  registryHonestPreview: boolean;
  authoringIntent: HailAuthoringIntent;
}): boolean {
  return false;
}

export function authoringPaintboxUsesCenteredCluster(input: {
  isCleanStage: boolean;
  registryHonestPreview: boolean;
  authoringIntent: HailAuthoringIntent;
}): boolean {
  return (
    input.isCleanStage &&
    input.registryHonestPreview &&
    (input.authoringIntent === "glyph" ||
      input.authoringIntent === "effect" ||
      input.authoringIntent === "compose")
  );
}

/** Layered package compositor — all registry authoring scale modes (design zoom is CSS-only). */
export function authoringPaintboxUsesAuthoritativePackageLayout(input: {
  isRegistryPackageSurface: boolean;
  hasGlyph: boolean;
  hasLayoutRegions: boolean;
}): boolean {
  return input.isRegistryPackageSurface && input.hasGlyph && input.hasLayoutRegions;
}

export function authoringPaintboxCenterAnchorStyle(): CSSProperties {
  return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
}

/** Compose placement anchor — preset or custom coordinates inside the locked paintbox. */
export function paintboxPlacementAnchorStyle(visual: HailVisualFields): CSSProperties {
  if (visual.placementMode === "custom") {
    return {
      left: `${Number(visual.xPercent) || 50}%`,
      top: `${Number(visual.yPercent) || 50}%`,
      transform: "translate(-50%, -50%)",
    };
  }
  const anchors: Record<string, CSSProperties> = {
    upper_center: { left: "50%", top: "16%", transform: "translate(-50%, 0)" },
    center: { left: "50%", top: "50%", transform: "translate(-50%, -50%)" },
    lower_center: { left: "50%", top: "78%", transform: "translate(-50%, -100%)" },
  };
  return anchors[visual.placementId] ?? anchors.upper_center;
}

export function authoringPaintboxChromeMode(input: {
  isCleanStage: boolean;
  authoringIntent: HailAuthoringIntent;
  shellPreviewEnabled: boolean;
}): AuthoringPaintboxChromeMode {
  if (!input.isCleanStage) {
    return "bare";
  }
  if (input.shellPreviewEnabled) {
    return "shell";
  }
  return "bare";
}

/** Outer viewport shell — subtle frame when Shell preview chip is on. */
export function authoringPaintboxStageShellClass(mode: AuthoringPaintboxChromeMode): string {
  if (mode === "shell") {
    return "rounded-2xl border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)]/30";
  }
  return "border-0 bg-transparent";
}

/** Inner cluster — message below; glyph + effect centered in hero region. */
export function authoringPaintboxClusterClass(): string {
  return "relative flex h-full w-full min-h-0 flex-col";
}

/** Hero region — hosts the Hail package at full anchor size (package-first sizing). */
export function authoringPaintboxHeroClass(): string {
  return "relative flex min-h-0 w-full flex-1 items-stretch justify-center";
}

/** Package-first cluster — layers inside one anchor; no caption row below. */
export function authoringPaintboxPackageClusterClass(): string {
  return "relative h-full w-full min-h-0";
}

/** Package-first hero — fills the placement anchor box. */
export function authoringPaintboxPackageHeroClass(): string {
  return "relative h-full w-full min-h-0";
}

/** Profile / legacy composer only — not used on Forge or Hails edit. */
export function authoringPaintboxProfileBoxClass(cardClass: string): string {
  return (
    "absolute flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[color:var(--ca-brand-400)]/50 bg-[color:var(--ca-brand-600)]/8 p-3 shadow-[0_0_28px_color-mix(in_srgb,var(--ca-brand-400)_22%,transparent)] ring-1 ring-[color:var(--ca-brand-400)]/25 " +
    cardClass
  );
}
