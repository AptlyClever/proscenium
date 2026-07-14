import { resolveEffectFootprintProfile } from "./hailEffectFieldLayout";
import { enabledRoutes, type DeliveryRoute } from "./hailDeliveryRoutes";
import { rendererReadinessLines } from "./hailRouteReadiness";
import {
  displayDurationMs,
  displayEffectId,
  displayPlacementId,
  displaySizeTier,
} from "./hailComposerLabels";
import { glyphSelectorLabel, type GlyphCatalogEntry } from "./hailGlyphRegistry";

export type HailVisualFields = {
  effectId: string;
  effectVariationId: string;
  effectTuning: Record<string, unknown>;
  messageSidekickId: string;
  messageTuning: Record<string, unknown>;
  priorityLevel: string;
  effectFootprintProfile: string;
  accentWash?: PackageAccentWashFields;
  scale: string;
  paletteId: string;
  durationMs: string;
  placementId: string;
  placementMode: "preset" | "custom";
  xPercent: string;
  yPercent: string;
};

export type PackageAccentWashFields = {
  accent: string;
  scrim_weight: number;
  plate_weight?: number;
  label?: string;
};

export const DEFAULT_VISUAL_FIELDS: HailVisualFields = {
  effectId: "transporter",
  effectVariationId: "",
  effectTuning: {},
  messageSidekickId: "secondary_fade",
  messageTuning: {},
  priorityLevel: "green",
  effectFootprintProfile: "standard",
  scale: "medium",
  paletteId: "axiom_dark_cyan",
  durationMs: "5000",
  placementId: "upper_center",
  placementMode: "preset",
  xPercent: "50",
  yPercent: "50",
};

export type HailPreviewValidation = {
  errors: { path?: string; message?: string }[];
  warnings: { path?: string; message?: string }[];
  valid: boolean;
};

export type HailDerivePreviewResponse = {
  render_payload: Record<string, unknown>;
  placement_summary: { label?: string; placement_mode?: string; placement_id?: string };
  preview_sizing?: {
    room_id?: string | null;
    room_label?: string | null;
    display_class?: string;
    label?: string;
  };
  renderer_readiness: { status?: string; lines?: string[] };
  validation: HailPreviewValidation;
};

export function visualFieldsFromRecord(visual: Record<string, unknown> | undefined): HailVisualFields {
  const v = visual ?? {};
  const mode = String(v.placement_mode ?? "preset") === "custom" ? "custom" : "preset";
  const tuning = v.effect_tuning;
  const messageTuning = v.message_tuning;
  const accentWashRaw = v.accent_wash;
  let accentWash: PackageAccentWashFields | undefined;
  if (accentWashRaw && typeof accentWashRaw === "object" && !Array.isArray(accentWashRaw)) {
    const row = accentWashRaw as Record<string, unknown>;
    const accent = String(row.accent ?? "").trim();
    const scrimWeight = Number(row.scrim_weight);
    if (accent && Number.isFinite(scrimWeight) && scrimWeight > 0) {
      accentWash = {
        accent,
        scrim_weight: scrimWeight,
        ...(row.plate_weight != null ? { plate_weight: Number(row.plate_weight) } : {}),
        ...(row.label != null ? { label: String(row.label) } : {}),
      };
    }
  }
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
    ...(accentWash ? { accentWash } : {}),
    scale: String(v.scale ?? "medium"),
    paletteId: String(v.palette_id ?? "axiom_dark_cyan"),
    durationMs: String(v.duration_ms ?? 5000),
    placementId: String(v.placement_id ?? "upper_center"),
    placementMode: mode,
    xPercent: String(v.x_percent ?? 50),
    yPercent: String(v.y_percent ?? 50),
  };
}

export function visualFieldsToRecord(fields: HailVisualFields): Record<string, unknown> {
  const base: Record<string, unknown> = {
    effect_id: fields.effectId,
    scale: fields.scale,
    palette_id: fields.paletteId,
    duration_ms: Number(fields.durationMs) || 5000,
    placement_mode: fields.placementMode,
  };
  const effectVariationId = (fields.effectVariationId ?? "").trim();
  if (effectVariationId) {
    base.effect_variation_id = effectVariationId;
  }
  if (Object.keys(fields.effectTuning ?? {}).length > 0) {
    base.effect_tuning = { ...(fields.effectTuning ?? {}) };
  }
  const messageSidekickId = (fields.messageSidekickId ?? "").trim();
  if (messageSidekickId) {
    base.message_sidekick_id = messageSidekickId;
  }
  if (Object.keys(fields.messageTuning ?? {}).length > 0) {
    base.message_tuning = { ...(fields.messageTuning ?? {}) };
  }
  const priorityLevel = (fields.priorityLevel ?? "green").trim().toLowerCase();
  if (priorityLevel && priorityLevel !== "green") {
    base.priority_level = priorityLevel;
  } else {
    base.priority_level = "green";
  }
  base.effect_footprint_profile = resolveEffectFootprintProfile(fields.effectFootprintProfile);
  if (fields.accentWash?.accent?.trim()) {
    const wash: Record<string, unknown> = {
      accent: fields.accentWash.accent.trim(),
      scrim_weight: fields.accentWash.scrim_weight,
    };
    if (fields.accentWash.plate_weight != null) {
      wash.plate_weight = fields.accentWash.plate_weight;
    }
    if (fields.accentWash.label?.trim()) {
      wash.label = fields.accentWash.label.trim();
    }
    base.accent_wash = wash;
  }
  if (fields.placementMode === "custom") {
    base.x_percent = Number(fields.xPercent) || 50;
    base.y_percent = Number(fields.yPercent) || 50;
  } else {
    base.placement_id = fields.placementId;
  }
  return base;
}

export function operatorPreviewStatus(hail: {
  id?: string;
  enabled?: boolean;
}): string {
  if (hail.enabled === false) {
    return "Inactive";
  }
  const lines = rendererReadinessLines(hail);
  if (lines.some((line) => line.startsWith("Primary renderer:"))) {
    return "Preview ready";
  }
  return "Preview not ready yet";
}

export function hailListContractMeta(hail: {
  id?: string;
  name?: string;
  enabled?: boolean;
  icon?: { value?: string };
  message?: { short_text?: string };
  visual?: Record<string, unknown>;
  delivery_policy?: { routes?: DeliveryRoute[] };
}): {
  glyphId: string;
  effectId: string;
  sizeTier: string;
  placement: string;
  durationMs: number | string;
  readinessSummary: string;
  routeLabel: string;
} {
  const visual = hail.visual ?? {};
  const routes = hail.delivery_policy?.routes ?? [];
  const route = enabledRoutes(routes)[0];
  return {
    glyphId: hail.icon?.value ?? "default",
    effectId: String(visual.effect_id ?? "transporter"),
    sizeTier: String(visual.scale ?? "medium"),
    placement:
      String(visual.placement_mode ?? "preset") === "custom"
        ? `custom ${visual.x_percent ?? "?"}%, ${visual.y_percent ?? "?"}%`
        : String(visual.placement_id ?? "upper_center").replace(/_/g, " "),
    durationMs: (visual.duration_ms as number | string | undefined) ?? "—",
    readinessSummary: operatorPreviewStatus(hail),
    routeLabel: route
      ? `${route.launch_room_id} → ${route.destination_room_id}`
      : "no route",
  };
}

export function hailListSummaryLine(
  hail: Parameters<typeof hailListContractMeta>[0],
  glyphCatalog?: GlyphCatalogEntry[],
): string {
  const meta = hailListContractMeta(hail);
  const visual = hail.visual ?? {};
  const placement =
    String(visual.placement_mode ?? "preset") === "custom"
      ? "Custom placement"
      : displayPlacementId(String(visual.placement_id ?? "upper_center"));
  const duration =
    meta.durationMs === "—" ? "—" : displayDurationMs(String(meta.durationMs));
  return [
    glyphSelectorLabel(meta.glyphId, glyphCatalog),
    displayEffectId(meta.effectId),
    displaySizeTier(meta.sizeTier),
    placement,
    duration,
  ].join(" · ");
}

export function editorBodyWithVisual(
  base: Record<string, unknown>,
  visual: HailVisualFields,
): Record<string, unknown> {
  return {
    ...base,
    visual: visualFieldsToRecord(visual),
  };
}
