/**
 * Frozen-work disclosure for procedural plot surfaces.
 *
 * Chain step 24 (glyph plot proof) is frozen; the raster presentation pivot is
 * the active direction. These surfaces stay usable but must say so honestly.
 */
export function FrozenPlotNotice({
  compact = false,
  surfaceLabel = "Procedural plot work",
}: {
  compact?: boolean;
  surfaceLabel?: string;
}) {
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-[color:var(--ca-status-warning-fg)]/12 px-2 py-0.5 text-ca-2xs font-medium text-[color:var(--ca-status-warning-fg)]"
        title="Procedural plot work is paused on the Hail work chain — raster presentation is the active direction."
        data-hail-frozen-plot-notice
      >
        Frozen: plot work paused
      </span>
    );
  }
  return (
    <div
      className="rounded-md border border-[color:var(--ca-status-warning-fg)]/35 bg-[color:var(--ca-status-warning-fg)]/8 px-3 py-2 text-ca-xs text-[color:var(--ca-text-secondary)]"
      role="note"
      data-hail-frozen-plot-notice
    >
      <span className="font-semibold text-[color:var(--ca-status-warning-fg)]">Frozen:</span>{" "}
      {surfaceLabel} is paused on the Hail work chain — raster presentation is the active direction. Existing controls
      keep working, but no new procedural investment lands here.
    </div>
  );
}
