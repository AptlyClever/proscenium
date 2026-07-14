import { buildKitSummary, formatKitHint } from "../hailAlertLevelKit";
import { normalizePriorityLevel } from "../hailPriority";
import type { HailVisualFields } from "../hailVisualContract";

type HailKitHintProps = {
  priorityLevel: string;
  visual?: HailVisualFields | null;
};

/** Muted one-line Kit summary for the selected Alert Level. */
export function HailKitHint({ priorityLevel, visual = null }: HailKitHintProps) {
  const summary = buildKitSummary(normalizePriorityLevel(priorityLevel), visual);
  const hint = formatKitHint(summary);
  if (!hint.trim()) {
    return null;
  }
  return (
    <p className="text-ca-2xs leading-snug text-[color:var(--ca-text-muted)]" data-hail-kit-hint>
      Kit: {hint}
    </p>
  );
}

/** @deprecated Use HailKitHint */
export const HailPriorityPresentationHint = HailKitHint;
