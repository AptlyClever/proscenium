import { useState } from "react";
import { applyKitOnAlertLevelChange } from "../hailAlertLevelKit";
import {
  DEFAULT_PRIORITY_LEVEL,
  HAIL_PRIORITY_LEVELS,
  normalizePriorityLevel,
  type HailPriorityLevel,
} from "../hailPriority";
import type { HailVisualFields } from "../hailVisualContract";
import { HailKitHint } from "./HailKitHint";

type HailPriorityPresetsProps = {
  visual: HailVisualFields;
  onVisualChange: (next: HailVisualFields) => void;
};

function chipClass(selected: boolean): string {
  return (
    "ca-focusable rounded-full border px-3 py-1.5 text-ca-xs font-medium transition " +
    (selected
      ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/10 text-[color:var(--ca-brand-600)]"
      : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] text-[color:var(--ca-text-secondary)] hover:border-[color:var(--ca-brand-600)]/40")
  );
}

/** Alert Level loadout — Green / Yellow / Red chips with Kit hint. */
export function HailPriorityPresets({ visual, onVisualChange }: HailPriorityPresetsProps) {
  const resolved = normalizePriorityLevel(visual.priorityLevel);
  const [kitNotice, setKitNotice] = useState<string | null>(null);

  return (
    <section className="space-y-2" data-hail-priority-presets data-hail-alert-level-presets>
      <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">Alert Level</p>
      <div className="flex flex-wrap gap-1.5">
        {HAIL_PRIORITY_LEVELS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={chipClass(resolved === entry.id)}
            onClick={() => {
              const { visual: nextVisual, adjustments } = applyKitOnAlertLevelChange(visual, entry.id);
              onVisualChange(nextVisual);
              setKitNotice(adjustments.length ? adjustments.join(" · ") : null);
            }}
            data-hail-loadout-priority={entry.id}
            data-hail-loadout-selected={resolved === entry.id ? "true" : "false"}
            title={entry.hint}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <HailKitHint priorityLevel={resolved} visual={visual} />
      {kitNotice ? (
        <p className="text-ca-2xs text-[color:var(--ca-status-warning)]" data-hail-kit-adjustment>
          {kitNotice}
        </p>
      ) : null}
    </section>
  );
}

export function priorityLevelFromVisual(visual: HailVisualFields): HailPriorityLevel {
  return normalizePriorityLevel(visual.priorityLevel ?? DEFAULT_PRIORITY_LEVEL);
}
