import type { HailEffectPreset } from "../hailEffectsGallery";
import { displayEffectId, displaySizeTier } from "../hailComposerLabels";
import {
  isEffectPresetDeliverableOnGoogleTv,
  undeliverableEffectReason,
} from "../hailsConsumerCapability";

type HailEffectsGalleryProps = {
  presets: HailEffectPreset[];
  selectedPresetId: string | null;
  onApplyPreset: (preset: HailEffectPreset) => void;
  pickerMode?: boolean;
};

function moodChipClass(mood?: string): string {
  if (mood === "urgent") return "bg-[color:var(--ca-status-warning-fg)]/15 text-[color:var(--ca-status-warning-fg)]";
  if (mood === "calm") return "bg-[color:var(--ca-surface-border)] text-[color:var(--ca-text-muted)]";
  return "bg-[color:var(--ca-brand-600)]/10 text-[color:var(--ca-brand-600)]";
}

export function HailEffectsGallery({ presets, selectedPresetId, onApplyPreset, pickerMode = false }: HailEffectsGalleryProps) {
  if (!presets.length) {
    return null;
  }

  return (
    <section className="space-y-3" data-hail-effects-gallery>
      <div className="space-y-1">
        <h4 className="text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">
          {pickerMode ? "Effect preset" : "Hail Effects"}
        </h4>
        <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
          {pickerMode
            ? "Pick one presentation style for this Hail."
            : "Effects Gallery — pick a Presentation Style. Apply Effect, then Customize if needed."}
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2" role="list">
        {presets.map((preset) => {
          const selected = selectedPresetId === preset.id;
          const deliverable = isEffectPresetDeliverableOnGoogleTv(preset);
          const effectId = preset.visual?.effect_id ?? preset.effect_id ?? "";
          return (
            <li key={preset.id}>
              <div
                className={
                  "flex h-full flex-col gap-2 rounded-md border p-3 " +
                  (selected
                    ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/5 ring-1 ring-inset ring-[color:var(--ca-brand-600)]/15"
                    : deliverable
                      ? "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-raised)]/30"
                      : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)]/20 opacity-70")
                }
                data-hail-effect-preset={preset.id}
                data-hail-effect-preset-selected={selected ? "true" : "false"}
                data-hail-effect-preset-deliverable={deliverable ? "true" : "false"}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-ca-sm font-medium text-[color:var(--ca-text-primary)]">{preset.label}</p>
                    <p className="text-ca-2xs text-[color:var(--ca-text-secondary)]">{preset.description}</p>
                  </div>
                  {preset.mood ? (
                    <span
                      className={"shrink-0 rounded px-1.5 py-0.5 text-ca-2xs uppercase tracking-wide " + moodChipClass(preset.mood)}
                    >
                      {preset.mood}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5 text-ca-2xs text-[color:var(--ca-text-muted)]">
                  <span className="rounded bg-[color:var(--ca-surface-inset)] px-1.5 py-0.5">{displayEffectId(preset.visual.effect_id)}</span>
                  <span className="rounded bg-[color:var(--ca-surface-inset)] px-1.5 py-0.5">{displaySizeTier(preset.visual.scale)}</span>
                  {preset.reduced_motion ? (
                    <span className="rounded bg-[color:var(--ca-surface-inset)] px-1.5 py-0.5">low motion</span>
                  ) : null}
                  {!deliverable ? (
                    <span
                      className="rounded bg-[color:var(--ca-status-warning-fg)]/12 px-1.5 py-0.5 text-[color:var(--ca-status-warning-fg)]"
                      title={undeliverableEffectReason(effectId)}
                    >
                      not on TV
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={
                    "ca-focusable mt-auto w-full rounded-md px-3 py-1.5 text-ca-2xs font-medium " +
                    (selected
                      ? "border border-[color:var(--ca-brand-600)] text-[color:var(--ca-brand-600)]"
                      : deliverable
                        ? "bg-[color:var(--ca-brand-600)] text-[color:var(--ca-on-brand)]"
                        : "border border-[color:var(--ca-surface-border)] text-[color:var(--ca-text-muted)]")
                  }
                  disabled={!deliverable}
                  title={!deliverable ? undeliverableEffectReason(effectId) : undefined}
                  onClick={() => onApplyPreset(preset)}
                >
                  {!deliverable
                    ? "Not on Google TV"
                    : selected
                      ? pickerMode
                        ? "Selected"
                        : "Applied"
                      : pickerMode
                        ? "Select"
                        : "Apply Effect"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {!selectedPresetId ? (
        <p className="text-ca-2xs text-[color:var(--ca-text-muted)]" data-hail-effects-no-preset>
          {pickerMode
            ? "Choose an effect preset to continue."
            : "No Presentation Style selected yet — choose a preset or use Customize below."}
        </p>
      ) : null}
    </section>
  );
}
