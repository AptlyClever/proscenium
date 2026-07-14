import contract from "../../../config/hails/hail-render-contract.v002-beta.json";
import type { PackageAccentWash } from "./hailPackageAccentWash";
import { applyPackageAccentWash } from "./hailPackageAccentWash";
import { normalizePriorityLevel, type HailPriorityLevel } from "./hailPriority";
import {
  type PalettePresentation,
  resolvePalettePresentation,
  AUTHORING_NEUTRAL_GRID_PRESENTATION,
} from "./hailPalettePresentation";

export type PresentationModifiers = {
  packageScrimOpacity?: number;
  messageBackingOpacity?: number;
  packageShadowAlpha?: number;
  messagePlateRadiusPx?: number;
  packageCornerRadiusPx?: number;
  entrancePresenceScale?: number;
  rimGlowAlpha?: number;
};

export type PresentationEntity = {
  presetId: string;
  priorityLevel: HailPriorityLevel;
  label: string;
  resolvedFromPriority: boolean;
  modifiers: PresentationModifiers;
};

type RegistryEntry = {
  label?: string;
  modifiers?: Record<string, number>;
};

type PresentationRegistry = {
  defaultPresetId?: string;
  defaultPresetByPriority?: Record<string, string>;
  entries?: Record<string, RegistryEntry>;
};

const previewVisual = contract.previewVisual as { presentationRegistry?: PresentationRegistry };
const registry = previewVisual.presentationRegistry ?? {};

function registryEntries(): Record<string, RegistryEntry> {
  return registry.entries ?? {};
}

export function defaultPresetForPriority(priorityLevel: HailPriorityLevel): string {
  const mapped = registry.defaultPresetByPriority?.[priorityLevel];
  if (mapped?.trim()) {
    return mapped.trim();
  }
  return registry.defaultPresetId?.trim() || "operational";
}

export function resolvePresentationPresetId(input: {
  priorityLevel?: string | null;
  presentationPresetId?: string | null;
}): string {
  const override = input.presentationPresetId?.trim();
  if (override) {
    return override;
  }
  return defaultPresetForPriority(normalizePriorityLevel(input.priorityLevel));
}

export function buildPresentationEntity(input: {
  priorityLevel?: string | null;
  presentationPresetId?: string | null;
}): PresentationEntity {
  const priorityLevel = normalizePriorityLevel(input.priorityLevel);
  const presetId = resolvePresentationPresetId(input);
  const entry = registryEntries()[presetId];
  const modifiersRaw = entry?.modifiers ?? {};
  return {
    presetId,
    priorityLevel,
    label: entry?.label ?? presetId,
    resolvedFromPriority: !input.presentationPresetId?.trim(),
    modifiers: {
      packageScrimOpacity: modifiersRaw.package_scrim_opacity,
      messageBackingOpacity: modifiersRaw.message_backing_opacity,
      packageShadowAlpha: modifiersRaw.package_shadow_alpha,
      messagePlateRadiusPx: modifiersRaw.message_plate_radius_px,
      packageCornerRadiusPx: modifiersRaw.package_corner_radius_px,
      entrancePresenceScale: modifiersRaw.entrance_presence_scale,
      rimGlowAlpha: modifiersRaw.rim_glow_alpha,
    },
  };
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value == null || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

export function applyPresentationModifiers(
  presentation: PalettePresentation,
  modifiers: PresentationModifiers,
): PalettePresentation {
  if (!modifiers || Object.keys(modifiers).length === 0) {
    return presentation;
  }
  return {
    ...presentation,
    packageScrimOpacity: clamp(
      modifiers.packageScrimOpacity,
      0.08,
      0.45,
      presentation.packageScrimOpacity,
    ),
    messageBackingOpacity: clamp(
      modifiers.messageBackingOpacity,
      0.2,
      1,
      presentation.messageBackingOpacity,
    ),
    packageShadowAlpha: clamp(
      modifiers.packageShadowAlpha,
      0.1,
      0.55,
      presentation.packageShadowAlpha,
    ),
    messagePlateRadiusPx: clamp(
      modifiers.messagePlateRadiusPx,
      4,
      16,
      presentation.messagePlateRadiusPx,
    ),
    packageCornerRadiusPx: clamp(
      modifiers.packageCornerRadiusPx,
      8,
      20,
      presentation.packageCornerRadiusPx,
    ),
    rimGlowAlpha: clamp(modifiers.rimGlowAlpha, 0, 0.35, presentation.rimGlowAlpha ?? 0),
    entrancePresenceScale: clamp(modifiers.entrancePresenceScale, 0.85, 1.25, 1),
  };
}

export function resolveEffectivePalettePresentation(input: {
  paletteId: string;
  priorityLevel?: string | null;
  presentationPresetId?: string | null;
  payloadPresentation?: Record<string, unknown> | null;
  accentWash?: PackageAccentWash | null;
}): PalettePresentation {
  const fromPayload = input.payloadPresentation;
  if (fromPayload && typeof fromPayload === "object") {
    const paletteId = String(fromPayload.palette_id ?? input.paletteId);
    const base = resolvePalettePresentation(paletteId);
    return {
      paletteId,
      backdropTint: String(fromPayload.backdrop_tint ?? base.backdropTint),
      packageScrimOpacity: Number(fromPayload.package_scrim_opacity ?? base.packageScrimOpacity),
      packageCornerRadiusPx: Number(fromPayload.package_corner_radius_px ?? base.packageCornerRadiusPx),
      messageBacking: String(fromPayload.message_backing ?? base.messageBacking),
      messageBackingOpacity: Number(fromPayload.message_backing_opacity ?? base.messageBackingOpacity),
      messagePlateRadiusPx: Number(fromPayload.message_plate_radius_px ?? base.messagePlateRadiusPx),
      messageColor: String(fromPayload.message_color ?? base.messageColor),
      packageShadowAlpha: Number(fromPayload.package_shadow_alpha ?? base.packageShadowAlpha),
      rimGlowAlpha: Number(fromPayload.rim_glow_alpha ?? base.rimGlowAlpha ?? 0),
      entrancePresenceScale: Number(fromPayload.entrance_presence_scale ?? 1),
    };
  }
  const entity = buildPresentationEntity(input);
  const withModifiers = applyPresentationModifiers(resolvePalettePresentation(input.paletteId), entity.modifiers);
  return applyPackageAccentWash(withModifiers, input.accentWash);
}

/** Kit-only Grid scrim/plate on authoring previews — not driven by effect Color loadout (Phase A). */
export function resolveAuthoringPackagePresentation(input: {
  priorityLevel?: string | null;
  presentationPresetId?: string | null;
}): PalettePresentation {
  const entity = buildPresentationEntity(input);
  return applyPresentationModifiers(AUTHORING_NEUTRAL_GRID_PRESENTATION, entity.modifiers);
}
