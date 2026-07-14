/** Delivery-scale tier envelope — Hails compose + Effect Forge reference. Forge Create uses design fill scale. */
import type { AuthoringPreviewScaleMode, HailAuthoringIntent } from "./hailAuthoringIntent";
import {
  AUTHORING_DELIVERY_ENVELOPE_SCALE,
  AUTHORING_DELIVERY_GLYPH_BOOST,
  AUTHORING_DESIGN_GLYPH_SCALE,
  PAINTBOX_TIERS,
} from "./hailPaintboxTokens";

export {
  AUTHORING_DELIVERY_ENVELOPE_SCALE,
  AUTHORING_DELIVERY_GLYPH_BOOST,
  AUTHORING_DESIGN_GLYPH_SCALE,
};

export function resolveAuthoringPaintboxTier(sizeTier: string | undefined) {
  return PAINTBOX_TIERS[sizeTier ?? "medium"] ?? PAINTBOX_TIERS.medium;
}

/** Tier envelope as % of the fixed authoring viewport (delivery mode). */
export function authoringTierEnvelopePct(sizeTier: string | undefined): {
  widthPct: number;
  heightPct: number;
} {
  const tier = resolveAuthoringPaintboxTier(sizeTier);
  return {
    widthPct: tier.widthFraction * 100,
    heightPct: tier.heightFraction * 100,
  };
}

export function authoringUsesTierEnvelope(_scaleMode: AuthoringPreviewScaleMode): boolean {
  return true;
}

export function authoringTierBaseScale(sizeTier: string | undefined): number {
  if (sizeTier === "small") {
    return 0.88;
  }
  if (sizeTier === "large") {
    return 1.1;
  }
  return 1;
}

/** Target visible package width (% of locked viewport) for Forge Create — magnified, same geometry. */
export const AUTHORING_FORGE_CREATE_FILL_TARGET_PCT = 92;

function authoringDeliveryClusterScale(input: {
  sizeTier: string | undefined;
  intent: HailAuthoringIntent;
}): number {
  const tierBase = authoringTierBaseScale(input.sizeTier);
  const tier = resolveAuthoringPaintboxTier(input.sizeTier);
  if (input.intent === "effect") {
    return tierBase * 0.82 * tier.glyphVisualFraction * AUTHORING_DELIVERY_GLYPH_BOOST;
  }
  return tierBase * tier.glyphVisualFraction * AUTHORING_DELIVERY_GLYPH_BOOST;
}

/** Forge Glyph Create — fill the paintbox for hero judgment; never smaller than Hails delivery. */
export function authoringForgeCreateGlyphScale(sizeTier: string | undefined): number {
  const envelope = authoringTierEnvelopePct(sizeTier);
  const anchorWidthPct = Math.min(envelope.widthPct * AUTHORING_DELIVERY_ENVELOPE_SCALE, 100);
  const deliveryCluster = authoringDeliveryClusterScale({ sizeTier, intent: "glyph" });
  const fillScale = AUTHORING_FORGE_CREATE_FILL_TARGET_PCT / anchorWidthPct;
  return Math.max(deliveryCluster * AUTHORING_DESIGN_GLYPH_SCALE, fillScale);
}

export function authoringClusterGlyphScale(input: {
  sizeTier: string | undefined;
  intent: HailAuthoringIntent;
  scaleMode: AuthoringPreviewScaleMode;
}): number {
  const tierBase = authoringTierBaseScale(input.sizeTier);
  const tier = resolveAuthoringPaintboxTier(input.sizeTier);

  if (input.intent === "effect") {
    return (
      tierBase *
      0.82 *
      (input.scaleMode === "delivery" ? tier.glyphVisualFraction * AUTHORING_DELIVERY_GLYPH_BOOST : 1)
    );
  }

  if (input.intent === "glyph" && input.scaleMode === "design") {
    return authoringForgeCreateGlyphScale(input.sizeTier);
  }

  if (input.scaleMode === "delivery") {
    return authoringDeliveryClusterScale({ sizeTier: input.sizeTier, intent: input.intent });
  }

  return tierBase;
}

/** Visual package width as % of locked authoring viewport after cluster scale (Tier B floor). */
export function authoringPreviewVisualWidthPct(input: {
  sizeTier: string | undefined;
  intent: HailAuthoringIntent;
  scaleMode: AuthoringPreviewScaleMode;
}): number {
  const envelope = authoringTierEnvelopePct(input.sizeTier);
  const clusterScale = authoringClusterGlyphScale(input);
  const anchorWidthPct = Math.min(envelope.widthPct * AUTHORING_DELIVERY_ENVELOPE_SCALE, 100);
  return Math.min(anchorWidthPct * clusterScale, 100);
}
