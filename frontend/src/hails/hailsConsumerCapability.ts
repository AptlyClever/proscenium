/**
 * Consumer Capability Manifest v002 — composer UI gates (mirrors backend/hails_consumer_capability.py).
 */

import type { ComposerGlyphSpec } from "./hailGlyphComposer";
import manifest from "../../../config/hails/consumer-capability-manifest.v002.json";
import { isProceduralGraph } from "./hailProceduralGlyphs";
import { isRegistryGlyphId } from "./hailMedallions";
import type { HailEffectPreset } from "./hailEffectsGallery";

export type ConsumerCapabilityManifest = {
  manifest_id: string;
  consumers?: {
    google_tv_apk?: {
      deliverable_effects?: string[];
      glyph_render_kinds?: string[];
      reject_glyph_kinds?: string[];
      size_tiers?: string[];
      placement_ids?: string[];
      message_max_length?: number;
    };
  };
};

const doc = manifest as ConsumerCapabilityManifest;

function googleTvBlock() {
  return doc.consumers?.google_tv_apk ?? {};
}

export function deliverableEffectIds(): string[] {
  return googleTvBlock().deliverable_effects ?? ["transporter"];
}

export function isEffectDeliverableOnGoogleTv(effectId: string | undefined | null): boolean {
  const id = (effectId ?? "").trim();
  if (!id) {
    return false;
  }
  return deliverableEffectIds().includes(id);
}

export function isEffectPresetDeliverableOnGoogleTv(preset: HailEffectPreset): boolean {
  const effectId = preset.visual?.effect_id ?? preset.effect_id ?? "";
  return isEffectDeliverableOnGoogleTv(effectId);
}

/** Mirrors backend resolve_glyph_render + is_google_tv_glyph_deliverable for composer picks. */
export function isComposerGlyphDeliverableOnGoogleTv(
  glyphId: string | undefined | null,
  customGlyph?: ComposerGlyphSpec | null,
): boolean {
  const raw = (glyphId ?? "").trim() || "default";

  if (raw.startsWith("custom-")) {
    const spec = customGlyph;
    const kind = (spec?.representation_kind ?? "").trim();
    if (
      kind === "image" ||
      (Array.isArray((spec as { image_layers?: unknown })?.image_layers) &&
        ((spec as { image_layers?: unknown[] }).image_layers?.length ?? 0) > 0)
    ) {
      return true;
    }
    if (spec?.image_asset && typeof spec.image_asset === "object") {
      return true;
    }
    const graph = spec?.procedural_graph;
    if (isProceduralGraph(graph)) {
      return true;
    }
    return false;
  }

  return isRegistryGlyphId(raw);
}

export function undeliverableEffectReason(_effectId: string): string {
  const allowed = deliverableEffectIds().join(", ");
  return `Not deliverable on Google TV overlay (allowed: ${allowed})`;
}

export function undeliverableGlyphReason(glyphId: string, customGlyph?: ComposerGlyphSpec | null): string {
  if (glyphId.startsWith("custom-")) {
    if (isComposerGlyphDeliverableOnGoogleTv(glyphId, customGlyph)) {
      return "";
    }
    return "Custom glyph needs a raster image, image layers, or procedural vector mark for Google TV delivery";
  }
  return "This glyph is not approved for Google TV overlay delivery";
}
