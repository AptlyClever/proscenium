/**
 * Hail Authoring Surface Contract (HASC) v001 — metadata + parity helpers.
 * Tier A (contract): this module + verify-hails-authoring-surface-contract-v001.mjs
 * Tier B (visual): docs/hails/paintbox-parity-standards-alignment-v001.md
 * Authority: docs/hails/hail-authoring-surface-contract-v001.md
 */
import type { AuthoringPreviewScaleMode, HailAuthoringIntent } from "./hailAuthoringIntent";
import { authoringClusterGlyphScale, authoringTierEnvelopePct } from "./hailAuthoringTierEnvelope";

export const HAIL_AUTHORING_SURFACE_CONTRACT_ID = "hail-authoring-surface-contract-v001";

export type AuthoringSurfacePlane = "compositor" | "view" | "definition";

/** Delivery-mode surfaces that share tier envelope + cluster scale for the same size tier. */
export const DELIVERY_PARITY_INTENTS: HailAuthoringIntent[] = ["compose"];

export function authoringDeliveryPreviewFingerprint(sizeTier: string | undefined): {
  widthPct: number;
  heightPct: number;
  clusterScale: number;
} {
  const envelope = authoringTierEnvelopePct(sizeTier);
  const composeScale = authoringClusterGlyphScale({
    sizeTier,
    intent: "compose",
    scaleMode: "delivery",
  });
  return {
    widthPct: envelope.widthPct,
    heightPct: envelope.heightPct,
    clusterScale: composeScale,
  };
}

/** Returns true when two intents would use the same delivery preview geometry for a size tier. */
export function authoringDeliveryPreviewMatches(
  a: { intent: HailAuthoringIntent; scaleMode: AuthoringPreviewScaleMode },
  b: { intent: HailAuthoringIntent; scaleMode: AuthoringPreviewScaleMode },
  sizeTier: string | undefined,
): boolean {
  if (a.scaleMode !== "delivery" || b.scaleMode !== "delivery") {
    return false;
  }
  const scaleA = authoringClusterGlyphScale({ sizeTier, intent: a.intent, scaleMode: "delivery" });
  const scaleB = authoringClusterGlyphScale({ sizeTier, intent: b.intent, scaleMode: "delivery" });
  return Math.abs(scaleA - scaleB) < 1e-9;
}
