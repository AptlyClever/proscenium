import {
  EFFECT_FOOTPRINT_PROFILES,
  displayEffectFootprintProfile,
  normalizeEffectFootprintProfile,
} from "../hailEffectFieldLayout";
import type { HailVisualFields } from "../hailVisualContract";

type HailEffectFootprintPresetsProps = {
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

/** Effects Sidekick footprint — how much of the safe zone the beam may use. */
export function HailEffectFootprintPresets({ visual, onVisualChange }: HailEffectFootprintPresetsProps) {
  if (visual.effectId !== "transporter") {
    return null;
  }

  const resolved = normalizeEffectFootprintProfile(visual.effectFootprintProfile);
  const patch = (effectFootprintProfile: string) =>
    onVisualChange({ ...visual, effectFootprintProfile });

  return (
    <section className="space-y-2" data-hail-effect-footprint-presets>
      <div className="space-y-0.5">
        <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">
          Effect footprint
        </p>
        <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
          How wide the transporter column is inside the Grid safe zone — not full-screen.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EFFECT_FOOTPRINT_PROFILES.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className={chipClass(resolved === profile.id)}
            onClick={() => patch(profile.id)}
            data-hail-loadout-footprint={profile.id}
            data-hail-loadout-selected={resolved === profile.id ? "true" : "false"}
            title={profile.hint}
          >
            {displayEffectFootprintProfile(profile.id)}
          </button>
        ))}
      </div>
    </section>
  );
}
