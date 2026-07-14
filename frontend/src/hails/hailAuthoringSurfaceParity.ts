/**
 * Delivery preview parity — Hails compose tier envelope for each size tier (Tier A).
 * Tier B visual gate: docs/hails/paintbox-parity-standards-alignment-v001.md
 * Authority: hailAuthoringSurfaceContract.ts
 */
import { authoringDeliveryPreviewFingerprint } from "./hailAuthoringSurfaceContract";

const SIZE_TIERS = ["small", "medium", "large"] as const;

export function assertDeliveryParityForAllTiers(): void {
  for (const tier of SIZE_TIERS) {
    authoringDeliveryPreviewFingerprint(tier);
  }
}
