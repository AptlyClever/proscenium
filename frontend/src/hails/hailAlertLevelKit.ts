import contract from "../../../config/hails/hail-render-contract.v002-beta.json";
import { normalizePriorityLevel, type HailPriorityLevel } from "./hailPriority";
import type { HailVisualFields } from "./hailVisualContract";
import { messageSpeedTierLabel } from "./hailMessageSidekickTuning";
import { packageAccentWashFromVisual } from "./hailPackageAccentWash";

type KitEntry = {
  kitId?: string;
  label?: string;
  presentationPresetId?: string;
  messageTuning?: Record<string, unknown>;
};

type AlertLevelKits = Record<string, KitEntry>;

const previewVisual = contract.previewVisual as { alertLevelKits?: AlertLevelKits };
const kits = previewVisual.alertLevelKits ?? {};

export type KitSummary = {
  alertLevel: HailPriorityLevel;
  kitId: string;
  label: string;
  presentationLabel: string;
  messageEntranceLabel: string | null;
  packageWashLabel: string | null;
};

export function kitForAlertLevel(alertLevel: string | null | undefined): KitEntry {
  const level = normalizePriorityLevel(alertLevel);
  return kits[level] ?? {};
}

export function buildKitSummary(
  alertLevel: string | null | undefined,
  visual?: HailVisualFields | null,
): KitSummary {
  const level = normalizePriorityLevel(alertLevel);
  const kit = kitForAlertLevel(level);
  const entranceTier = String(kit.messageTuning?.entrance_speed_tier ?? "").trim();
  const messageEntranceLabel = entranceTier ? messageSpeedTierLabel(entranceTier, null) : null;
  const presentationLabel = kit.label?.trim() || kit.presentationPresetId?.trim() || level;
  const packageWash = visual ? packageAccentWashFromVisual(visual) : null;
  return {
    alertLevel: level,
    kitId: kit.kitId?.trim() || `${level}_kit`,
    label: presentationLabel,
    presentationLabel,
    messageEntranceLabel,
    packageWashLabel: packageWash?.label?.trim() || null,
  };
}

export function formatKitHint(summary: KitSummary): string {
  const parts = [summary.presentationLabel];
  if (summary.packageWashLabel) {
    parts.push(summary.packageWashLabel);
  }
  if (summary.messageEntranceLabel) {
    parts.push(`${summary.messageEntranceLabel} message`);
  }
  return parts.join(" · ");
}

export type KitApplyResult = {
  visual: HailVisualFields;
  adjustments: string[];
};

/** Apply kit message defaults when switching Alert Level — clears schema-filled conflicts. */
export function applyKitOnAlertLevelChange(
  visual: HailVisualFields,
  nextLevel: HailPriorityLevel,
): KitApplyResult {
  const kit = kitForAlertLevel(nextLevel);
  const kitTuning = kit.messageTuning ?? {};
  const adjustments: string[] = [];
  const nextVisual: HailVisualFields = { ...visual, priorityLevel: nextLevel };

  if (!kitTuning.entrance_speed_tier) {
    return { visual: nextVisual, adjustments };
  }

  const current = visual.messageTuning ?? {};
  const entrance = current.entrance_speed_tier;
  if (entrance && entrance !== kitTuning.entrance_speed_tier && entrance === "normal") {
    adjustments.push(`Message entrance → ${messageSpeedTierLabel(String(kitTuning.entrance_speed_tier), null)}`);
    const { entrance_speed_tier: _removed, ...rest } = current;
    nextVisual.messageTuning = rest;
  }

  return { visual: nextVisual, adjustments };
}
