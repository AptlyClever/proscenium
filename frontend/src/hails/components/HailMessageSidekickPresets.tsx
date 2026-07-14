import type { ReactNode } from "react";
import type { MessageRegistryPayload } from "../../api";
import {
  activeMessageSidekickEntries,
  messageSpeedTierLabel,
  messageSpeedTierOptions,
  patchMessageTuning,
  selectMessageSidekickWithDefaults,
  tuningDefaultsForMessageSidekick,
  tuningVariablesForMessageSidekick,
} from "../hailMessageSidekickTuning";
import type { HailVisualFields } from "../hailVisualContract";
import type { EffectTuningVariable } from "../../api";

type HailMessageSidekickPresetsProps = {
  visual: HailVisualFields;
  messageRegistry?: MessageRegistryPayload | null;
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

function formatTuningValue(value: unknown, variable: EffectTuningVariable): string {
  if (variable.type === "enum") {
    return messageSpeedTierLabel(String(value ?? variable.default ?? ""), null);
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return String(variable.default ?? "");
  }
  const step = Number(variable.step ?? 0.01);
  if (step >= 1) {
    return String(Math.round(num));
  }
  return num.toFixed(2).replace(/\.?0+$/, "");
}

function TuningControl({
  variable,
  value,
  onChange,
  messageRegistry,
}: {
  variable: EffectTuningVariable;
  value: unknown;
  onChange: (next: unknown) => void;
  messageRegistry?: MessageRegistryPayload | null;
}) {
  if (variable.type === "enum") {
    const options = variable.options ?? messageSpeedTierOptions(messageRegistry ?? null);
    const current = String(value ?? variable.default ?? options[1] ?? "normal");
    return (
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={chipClass(current === option)}
            aria-pressed={current === option}
            onClick={() => onChange(option)}
            data-hail-message-tuning-speed={option}
          >
            {messageSpeedTierLabel(option, messageRegistry ?? null)}
          </button>
        ))}
      </div>
    );
  }

  const min = Number(variable.min ?? 0.2);
  const max = Number(variable.max ?? 1);
  const step = Number(variable.step ?? 0.02);
  const numeric = Number(value ?? variable.default ?? min);

  return (
    <div className="space-y-1">
      <input
        type="range"
        className="ca-focusable w-full accent-[color:var(--ca-brand-600)]"
        min={min}
        max={max}
        step={step}
        value={numeric}
        onChange={(e) => onChange(Number(e.target.value))}
        data-hail-message-tuning-control={variable.key}
      />
      <p className="text-ca-2xs text-[color:var(--ca-text-muted)]" data-hail-message-tuning-value={variable.key}>
        {formatTuningValue(numeric, variable)}
      </p>
    </div>
  );
}

function LoadoutRow({
  label,
  dimension,
  hint,
  children,
}: {
  label: string;
  dimension: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2" data-hail-loadout-row={dimension}>
      <div className="space-y-0.5">
        <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">{label}</p>
        {hint ? <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">{hint}</p> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** Message Sidekick style + stable-phase fade tuning for Hails compose loadout. */
export function HailMessageSidekickPresets({
  visual,
  messageRegistry = null,
  onVisualChange,
}: HailMessageSidekickPresetsProps) {
  const entries = activeMessageSidekickEntries(messageRegistry);
  const resolvedSidekickId = visual.messageSidekickId || messageRegistry?.default_sidekick_id || "secondary_fade";
  const tuningVariables = tuningVariablesForMessageSidekick(messageRegistry, resolvedSidekickId);
  const tuningDefaults = tuningDefaultsForMessageSidekick(messageRegistry, resolvedSidekickId);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" data-hail-message-sidekick-presets>
      <LoadoutRow
        label="Message style"
        dimension="message-sidekick"
        hint="Fades in when the hail holds steady — independent from the effect."
      >
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={chipClass(resolvedSidekickId === entry.id)}
            onClick={() => onVisualChange(selectMessageSidekickWithDefaults(visual, entry.id, messageRegistry))}
            data-hail-loadout-message-sidekick={entry.id}
            data-hail-loadout-selected={resolvedSidekickId === entry.id ? "true" : "false"}
          >
            {entry.label}
          </button>
        ))}
      </LoadoutRow>

      {tuningVariables.map((variable) => (
        <div
          key={variable.key}
          className="space-y-2"
          data-hail-message-tuning-row={variable.key}
          data-hail-loadout-row={`message-${variable.key}`}
        >
          <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">
            {variable.label}
          </p>
          <TuningControl
            variable={variable}
            value={visual.messageTuning?.[variable.key] ?? tuningDefaults[variable.key]}
            onChange={(next) => onVisualChange(patchMessageTuning(visual, variable.key, next))}
            messageRegistry={messageRegistry}
          />
        </div>
      ))}
    </section>
  );
}
