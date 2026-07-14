import type { HailVisualFields } from "./hailVisualContract";
import { resolveEffectFootprintProfile } from "./hailEffectFieldLayout";
import type { ProceduralGraph } from "./hailProceduralGlyphs";
import { visualFieldsFromRecord, visualFieldsToRecord } from "./hailVisualContract";
import {
  enabledRoutes,
  normalizeRouteForSave,
  routesFromHail,
  stableRouteId,
  type HailWithDeliveryPolicy,
} from "./hailDeliveryRoutes";
import { PAINTBOX_TIERS, type PaintboxTierFractions } from "./hailPaintboxTokens";

export type { PaintboxTierFractions };
export { PAINTBOX_TIERS };

export type ComposerGlyphImageAsset = {
  path: string;
  width?: number;
  height?: number;
};

export type ComposerGlyphSpec = {
  glyph_id: string;
  label: string;
  source?: string;
  fallback_emoji: string;
  procedural_motif_id?: string;
  procedural_graph?: ProceduralGraph;
  representation_kind?: "procedural" | "image";
  image_asset?: ComposerGlyphImageAsset;
  glyph_family_id?: string;
  semantic_bucket?: string;
  animation_enabled: boolean;
  speed_tier: "slow" | "normal" | "fast";
  transition_style: "fade" | "slide_up" | "pulse" | "beam";
  visual: Record<string, unknown>;
  seed?: number;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
};

export { PALETTE_PREVIEW_CLASS } from "./hailGlyphPalette";

export function composerVisualFromSpec(spec: ComposerGlyphSpec): HailVisualFields {
  const v = spec.visual ?? {};
  const tuning = v.effect_tuning;
  const messageTuning = v.message_tuning;
  return {
    effectId: String(v.effect_id ?? "transporter"),
    effectVariationId: String(v.effect_variation_id ?? ""),
    effectTuning: tuning && typeof tuning === "object" && !Array.isArray(tuning) ? { ...tuning } : {},
    messageSidekickId: String(v.message_sidekick_id ?? "secondary_fade"),
    messageTuning:
      messageTuning && typeof messageTuning === "object" && !Array.isArray(messageTuning)
        ? { ...messageTuning }
        : {},
    priorityLevel: String(v.priority_level ?? "green"),
    effectFootprintProfile: resolveEffectFootprintProfile(v.effect_footprint_profile),
    scale: String(v.scale ?? "medium"),
    paletteId: String(v.palette_id ?? "axiom_dark_cyan"),
    durationMs: String(v.duration_ms ?? 5000),
    placementId: String(v.placement_id ?? "upper_center"),
    placementMode: "preset",
    xPercent: "50",
    yPercent: "50",
  };
}

/** Regenerate swaps procedural identity only — loadout, motion, and glyph_id stay as-is. */
export function buildComposerGlyphPersistPayload(
  spec: ComposerGlyphSpec,
  visual: HailVisualFields,
  nameDraft: string,
): ComposerGlyphSpec {
  return {
    ...spec,
    label: nameDraft.trim() || spec.label.trim() || "Custom Glyph",
    visual: {
      effect_id: visual.effectId,
      palette_id: visual.paletteId,
      scale: visual.scale,
      duration_ms: Number(visual.durationMs) || 5000,
      placement_id: visual.placementId,
      placement_mode: "preset",
    },
    animation_enabled: spec.animation_enabled,
    speed_tier: spec.speed_tier,
    transition_style: spec.transition_style,
  };
}

export function mergeRegeneratedGlyphSpec(
  previous: ComposerGlyphSpec,
  seeded: ComposerGlyphSpec,
): ComposerGlyphSpec {
  return {
    ...previous,
    label: seeded.label,
    procedural_graph: seeded.procedural_graph,
    procedural_motif_id: seeded.procedural_motif_id,
    glyph_family_id: seeded.glyph_family_id ?? seeded.procedural_graph?.generator_id,
    semantic_bucket: seeded.semantic_bucket,
    seed: seeded.seed,
  };
}

export function composerStateFromHail(hail: Record<string, unknown>): {
  name: string;
  shortText: string;
  sourceArea: string;
  destinationArea: string;
  loadedRouteId: string;
  selectedGlyph: string;
  visual: HailVisualFields;
  enabled: boolean;
  category: string;
  displayId: string;
} {
  const routes = routesFromHail(hail as HailWithDeliveryPolicy);
  const route = enabledRoutes(routes)[0] ?? routes[0];
  const icon = hail.icon as { value?: string } | undefined;
  const sourceArea = String(route?.launch_room_id ?? "arcade");
  const destinationArea = String(route?.destination_room_id ?? "master_bedroom");
  return {
    name: String(hail.name ?? ""),
    shortText: String((hail.message as { short_text?: string } | undefined)?.short_text ?? ""),
    sourceArea,
    destinationArea,
    loadedRouteId: String(route?.id ?? ""),
    selectedGlyph: String(icon?.value ?? "default"),
    visual: visualFieldsFromRecord(hail.visual as Record<string, unknown> | undefined),
    enabled: hail.enabled !== false,
    category: String(hail.category ?? "cute"),
    displayId: String(hail.display_id ?? ""),
  };
}

/** Edit save: patch Composer-owned fields onto the existing Hail; preserve advanced state. */
export function hailBodyFromComposerEdit(
  baseHail: Record<string, unknown>,
  input: {
    name: string;
    shortText: string;
    glyphId: string;
    visual: HailVisualFields;
    enabled?: boolean;
    sourceArea: string;
    destinationArea: string;
    loadedRouteId: string;
    loadedSourceArea: string;
    loadedDestinationArea: string;
  },
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    enabled: input.enabled ?? true,
    message: { short_text: input.shortText.trim() },
    icon: { kind: "glyph", value: input.glyphId },
    visual: visualFieldsToRecord(input.visual),
  };

  const routeChanged =
    input.sourceArea !== input.loadedSourceArea || input.destinationArea !== input.loadedDestinationArea;

  if (routeChanged) {
    const existingRoutes = routesFromHail(baseHail as HailWithDeliveryPolicy);
    let patched = false;
    const routes = existingRoutes.map((route) => {
      const matchesTarget = input.loadedRouteId
        ? route.id === input.loadedRouteId
        : !patched && route.enabled !== false;
      if (!matchesTarget) {
        return route;
      }
      patched = true;
      return normalizeRouteForSave({
        ...route,
        launch_room_id: input.sourceArea,
        destination_room_id: input.destinationArea,
      });
    });

    if (patched) {
      body.delivery_policy = { routes };
    } else if (existingRoutes.length === 0) {
      body.delivery_policy = {
        routes: [
          normalizeRouteForSave({
            id: stableRouteId(input.sourceArea, input.destinationArea),
            launch_room_id: input.sourceArea,
            destination_room_id: input.destinationArea,
            provider: "lcard",
            requires_confirmation: false,
            enabled: true,
          }),
        ],
      };
    }
  }

  return body;
}

export function hailBodyFromComposer(input: {
  name: string;
  shortText: string;
  glyphId: string;
  visual: HailVisualFields;
  sourceArea: string;
  destinationArea: string;
  enabled?: boolean;
  category?: string;
  displayId?: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    category: input.category ?? "cute",
    enabled: input.enabled ?? true,
    message: { short_text: input.shortText.trim() },
    icon: { kind: "glyph", value: input.glyphId },
    visual: visualFieldsToRecord(input.visual),
    delivery_policy: {
      routes: [
        normalizeRouteForSave({
          id: stableRouteId(input.sourceArea, input.destinationArea),
          launch_room_id: input.sourceArea,
          destination_room_id: input.destinationArea,
          provider: "lcard",
          requires_confirmation: false,
          enabled: true,
        }),
      ],
    },
    rooms: { badge_policy: "source_room" },
    behavior: { cooldown_sec: 30, requires_confirmation: false },
  };
  if (input.displayId) {
    body.display_id = input.displayId;
  }
  return body;
}
