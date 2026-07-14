import type { PreviewSizingContext } from "../hailPreviewSizing";

type HailPreviewSizingBadgeProps = {
  sizing: PreviewSizingContext;
  compact?: boolean;
};

export function HailPreviewSizingBadge({ sizing, compact = false }: HailPreviewSizingBadgeProps) {
  return (
    <p
      className={
        compact
          ? "text-ca-2xs text-[color:var(--ca-text-muted)]"
          : "rounded-full border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)] px-2.5 py-1 text-ca-2xs text-[color:var(--ca-text-secondary)]"
      }
      data-hail-preview-sizing
      data-hail-preview-room-id={sizing.roomId ?? undefined}
      data-hail-preview-display-class={sizing.displayClass}
    >
      {sizing.label}
    </p>
  );
}
