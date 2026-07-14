import type { EffectTuningVariable, MessageRegistryEntry, MessageRegistryPayload } from "../api";
import type { HailVisualFields } from "./hailVisualContract";

export const MESSAGE_SPEED_TIER_LABELS: Record<string, string> = {
  slow: "Slow",
  normal: "Normal",
  quick: "Quick",
};

export function registryEntryForMessageSidekick(
  registry: MessageRegistryPayload | null | undefined,
  sidekickId: string,
): MessageRegistryEntry | null {
  return registry?.entries?.find((entry) => entry.id === sidekickId) ?? null;
}

export function defaultMessageSidekickId(registry: MessageRegistryPayload | null | undefined): string {
  return registry?.default_sidekick_id ?? "secondary_fade";
}

export function activeMessageSidekickEntries(registry: MessageRegistryPayload | null | undefined): MessageRegistryEntry[] {
  return (registry?.entries ?? []).filter((entry) => entry.status === "active");
}

export function tuningDefaultsForMessageSidekick(
  registry: MessageRegistryPayload | null | undefined,
  sidekickId: string,
): Record<string, unknown> {
  const entry = registryEntryForMessageSidekick(registry, sidekickId);
  return { ...(entry?.tuning_defaults ?? {}) };
}

export function tuningVariablesForMessageSidekick(
  registry: MessageRegistryPayload | null | undefined,
  sidekickId: string,
): EffectTuningVariable[] {
  const entry = registryEntryForMessageSidekick(registry, sidekickId);
  return entry?.tuning_variables ?? [];
}

export function normalizeMessageTuning(
  visual: HailVisualFields,
  registry: MessageRegistryPayload | null | undefined,
  sidekickId?: string,
): Record<string, unknown> {
  const resolvedId = sidekickId || visual.messageSidekickId || defaultMessageSidekickId(registry);
  const defaults = tuningDefaultsForMessageSidekick(registry, resolvedId);
  const variables = tuningVariablesForMessageSidekick(registry, resolvedId);
  const allowed = new Set(variables.map((variable) => variable.key));
  const out: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(visual.messageTuning ?? {})) {
    if (allowed.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

export function applyMessageSidekickDefaults(
  visual: HailVisualFields,
  registry: MessageRegistryPayload | null | undefined,
): HailVisualFields {
  const sidekickId = visual.messageSidekickId?.trim() || defaultMessageSidekickId(registry);
  return {
    ...visual,
    messageSidekickId: sidekickId,
    messageTuning: normalizeMessageTuning(visual, registry, sidekickId),
  };
}

export function selectMessageSidekickWithDefaults(
  visual: HailVisualFields,
  sidekickId: string,
  registry: MessageRegistryPayload | null | undefined,
): HailVisualFields {
  return {
    ...visual,
    messageSidekickId: sidekickId,
    messageTuning: tuningDefaultsForMessageSidekick(registry, sidekickId),
  };
}

export function patchMessageTuning(
  visual: HailVisualFields,
  key: string,
  value: unknown,
): HailVisualFields {
  return {
    ...visual,
    messageTuning: {
      ...(visual.messageTuning ?? {}),
      [key]: value,
    },
  };
}

export function messageSpeedTierLabel(tier: string, registry: MessageRegistryPayload | null | undefined): string {
  const fromRegistry = registry?.speed_tiers?.[tier]?.label;
  if (typeof fromRegistry === "string" && fromRegistry.trim()) {
    return fromRegistry;
  }
  return MESSAGE_SPEED_TIER_LABELS[tier] ?? tier;
}

export function messageSpeedTierOptions(registry: MessageRegistryPayload | null | undefined): string[] {
  const fromRegistry = registry?.speed_tiers ? Object.keys(registry.speed_tiers) : [];
  if (fromRegistry.length > 0) {
    return fromRegistry;
  }
  return ["slow", "normal", "quick"];
}
