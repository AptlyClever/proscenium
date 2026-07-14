type GlyphHeroQualityGateProps = {
  errors: string[];
  validating?: boolean;
};

export function GlyphHeroQualityGate({ errors, validating = false }: GlyphHeroQualityGateProps) {
  if (validating || !errors.length) {
    return null;
  }

  return (
    <div
      className="ca-banner-warning rounded-md border border-[color:var(--ca-status-warning-fg)]/30 p-3 text-ca-xs text-[color:var(--ca-text-secondary)]"
      role="alert"
      data-hail-glyph-hero-quality-gate
    >
      <p className="font-medium text-[color:var(--ca-text-primary)]">Glyph does not meet Hero quality</p>
      <p className="mt-1 text-[color:var(--ca-text-muted)]">
        Re-encode or adjust the mark until castable-lead passes. Save is blocked until this clears.
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {errors.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
