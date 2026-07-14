import type { EffectRegistryEntry, EffectRegistryPayload } from "../api";
import type { HailVisualFields } from "./hailVisualContract";
import { defaultVariationForEffect, variationForEffect } from "./hailEffectVariations";

export function registryEntryForEffectId(
  registry: EffectRegistryPayload | null | undefined,
  effectId: string,
): EffectRegistryEntry | null {
  return registry?.entries?.find((entry) => entry.id === effectId) ?? null;
}

export function tuningDefaultsForEffect(
  registry: EffectRegistryPayload | null | undefined,
  effectId: string,
  variationId?: string,
): Record<string, unknown> {
  const entry = registryEntryForEffectId(registry, effectId);
  const resolvedVariationId = variationId || defaultVariationForEffect(registry, effectId);
  const variation = resolvedVariationId
    ? variationForEffect(registry, effectId, resolvedVariationId)
    : null;
  if (variation?.tuning_defaults && Object.keys(variation.tuning_defaults).length > 0) {
    return { ...variation.tuning_defaults };
  }
  return { ...(entry?.tuning_defaults ?? {}) };
}

export function normalizeVisualEffectTuning(
  visual: HailVisualFields,
  registry: EffectRegistryPayload | null | undefined,
): Record<string, unknown> {
  const variationId = visual.effectVariationId || defaultVariationForEffect(registry, visual.effectId);
  const defaults = tuningDefaultsForEffect(registry, visual.effectId, variationId);
  const current = visual.effectTuning ?? {};
  const entry = registryEntryForEffectId(registry, visual.effectId);
  const variation = variationId ? variationForEffect(registry, visual.effectId, variationId) : null;
  const variables = variation?.tuning_variables?.length
    ? variation.tuning_variables
    : entry?.tuning_variables ?? [];
  const allowed = new Set(variables.map((v) => v.key));
  const out: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(current)) {
    if (allowed.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

export function applyRegistryVisualDefaults(
  visual: HailVisualFields,
  registry: EffectRegistryPayload | null | undefined,
): HailVisualFields {
  const variationId = visual.effectVariationId || defaultVariationForEffect(registry, visual.effectId);
  if (!variationId || visual.effectVariationId === variationId) {
    return visual;
  }
  return { ...visual, effectVariationId: variationId };
}

export function tuningVariablesForVisual(
  registry: EffectRegistryPayload | null | undefined,
  visual: HailVisualFields,
): EffectRegistryEntry["tuning_variables"] {
  const entry = registryEntryForEffectId(registry, visual.effectId);
  const variationId = visual.effectVariationId || defaultVariationForEffect(registry, visual.effectId);
  const variation = variationId ? variationForEffect(registry, visual.effectId, variationId) : null;
  if (variation?.tuning_variables?.length) {
    return variation.tuning_variables;
  }
  return entry?.tuning_variables ?? [];
}

export function selectEffectWithRegistryDefaults(
  visual: HailVisualFields,
  effectId: string,
  registry: EffectRegistryPayload | null | undefined,
): HailVisualFields {
  const variationId = defaultVariationForEffect(registry, effectId);
  return {
    ...visual,
    effectId,
    effectVariationId: variationId,
    effectTuning: tuningDefaultsForEffect(registry, effectId, variationId),
  };
}

export function selectVariationWithRegistryDefaults(
  visual: HailVisualFields,
  variationId: string,
  registry: EffectRegistryPayload | null | undefined,
): HailVisualFields {
  return {
    ...visual,
    effectVariationId: variationId,
    effectTuning: tuningDefaultsForEffect(registry, visual.effectId, variationId),
  };
}

export function patchEffectTuning(
  visual: HailVisualFields,
  key: string,
  value: unknown,
): HailVisualFields {
  return {
    ...visual,
    effectTuning: {
      ...(visual.effectTuning ?? {}),
      [key]: value,
    },
  };
}

export function hasTuningControls(entry: EffectRegistryEntry | null | undefined): boolean {
  return Boolean(entry?.tuning_variables?.length);
}
