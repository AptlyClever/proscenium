type HailEffectsPreviewToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  surface: "studio" | "forge";
  chip?: boolean;
};

export function HailEffectsPreviewToggle({ enabled, onChange, surface, chip = false }: HailEffectsPreviewToggleProps) {
  const marker =
    surface === "studio"
      ? { "data-hail-studio-effects-toggle": true }
      : { "data-hail-forge-effects-toggle": true };

  const chipClass =
    "ca-focusable rounded-full border px-3 py-1.5 text-ca-xs font-medium transition " +
    (enabled
      ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/10 text-[color:var(--ca-brand-600)]"
      : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] text-[color:var(--ca-text-secondary)] hover:border-[color:var(--ca-brand-600)]/40");

  const buttonClass = chip
    ? chipClass
    : "ca-focusable w-fit rounded-md px-2.5 py-1 text-ca-2xs font-medium " +
      (enabled
        ? "bg-[color:var(--ca-brand-600)] text-[color:var(--ca-on-brand)]"
        : "border border-[color:var(--ca-surface-border)] text-[color:var(--ca-text-secondary)]");

  return (
    <button
      type="button"
      className={buttonClass}
      aria-pressed={enabled}
      aria-label={enabled ? "Effects on" : "Effects off"}
      onClick={() => onChange(!enabled)}
      data-hail-authoring-layer-toggle="effects"
      {...marker}
    >
      Effects {enabled ? "On" : "Off"}
    </button>
  );
}
