import type { HailAuthoringIntent } from "../hailAuthoringIntent";
import type { AuthoringGlyphDeliveryView } from "../hailAuthoritativeGlyphRender";
import {
  AUTHORING_PREVIEW_CHIP_CATALOG,
  authoringPreviewChipsForIntent,
  type AuthoringPreviewChipId,
} from "../hailAuthoringPreviewChipSet";

type HailAuthoringPreviewControlsProps = {
  surface: "studio" | "forge";
  intent: HailAuthoringIntent;
  effectsEnabled: boolean;
  onEffectsEnabledChange?: (enabled: boolean) => void;
  glyphVisible?: boolean;
  onGlyphVisibleChange?: (visible: boolean) => void;
  messageVisible?: boolean;
  onMessageVisibleChange?: (visible: boolean) => void;
  shellVisible?: boolean;
  onShellVisibleChange?: (visible: boolean) => void;
  glyphDeliveryView?: AuthoringGlyphDeliveryView;
  onGlyphDeliveryViewChange?: (view: AuthoringGlyphDeliveryView) => void;
  customGlyphSelected?: boolean;
  onReEncode?: () => void;
  actionBusy?: boolean;
  recipeLabel?: string | null;
};

export function previewChipClass(active: boolean): string {
  return (
    "ca-focusable rounded-full border px-3 py-1.5 text-ca-xs font-medium transition " +
    (active
      ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/10 text-[color:var(--ca-brand-600)]"
      : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] text-[color:var(--ca-text-secondary)] hover:border-[color:var(--ca-brand-600)]/40")
  );
}

function actionChipClass(): string {
  return (
    "ca-focusable rounded-full border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)]/50 px-3 py-1.5 text-ca-xs font-medium text-[color:var(--ca-text-secondary)] transition hover:border-[color:var(--ca-brand-600)]/40 disabled:opacity-50"
  );
}

function PreviewChip({
  label,
  active,
  onClick,
  chipId,
  surface,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  chipId: AuthoringPreviewChipId;
  surface: "studio" | "forge";
  disabled?: boolean;
}) {
  const marker =
    chipId === "effect" && surface === "studio"
      ? { "data-hail-studio-effects-toggle": true as const }
      : chipId === "effect" && surface === "forge"
        ? { "data-hail-forge-effects-toggle": true as const }
        : {};

  return (
    <button
      type="button"
      className={previewChipClass(active)}
      aria-pressed={active}
      aria-label={active ? `${label} on` : `${label} off`}
      disabled={disabled}
      onClick={onClick}
      data-hail-authoring-preview-chip={chipId}
      data-hail-authoring-layer-toggle={chipId}
      {...marker}
    >
      {label}
    </button>
  );
}

function ActionChip({
  label,
  onClick,
  chipId,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  chipId: "re-encode";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={actionChipClass()}
      disabled={disabled}
      onClick={onClick}
      data-hail-authoring-preview-chip={chipId}
      data-hail-glyph-re-encode
    >
      {label}
    </button>
  );
}

function PreviewMetaChip({ label }: { label: string }) {
  return (
    <span
      className="rounded-full border border-dashed border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-xs text-[color:var(--ca-text-muted)]"
      data-hail-authoring-preview-chip="recipe"
    >
      {label}
    </span>
  );
}

export function HailAuthoringPreviewControls({
  surface,
  intent,
  effectsEnabled,
  onEffectsEnabledChange,
  glyphVisible = true,
  onGlyphVisibleChange,
  messageVisible = true,
  onMessageVisibleChange,
  shellVisible = true,
  onShellVisibleChange,
  glyphDeliveryView = "canonical",
  onGlyphDeliveryViewChange,
  customGlyphSelected = false,
  onReEncode,
  actionBusy = false,
  recipeLabel = null,
}: HailAuthoringPreviewControlsProps) {
  const chips = authoringPreviewChipsForIntent({ intent, customGlyphSelected });

  function renderChip(chipId: AuthoringPreviewChipId) {
    switch (chipId) {
      case "glyph-canonical":
        return onGlyphDeliveryViewChange ? (
          <PreviewChip
            key={chipId}
            chipId={chipId}
            surface={surface}
            label={AUTHORING_PREVIEW_CHIP_CATALOG["glyph-canonical"].label}
            active={glyphDeliveryView === "canonical"}
            onClick={() => onGlyphDeliveryViewChange("canonical")}
          />
        ) : null;
      case "glyph-tv-delivery":
        return onGlyphDeliveryViewChange ? (
          <PreviewChip
            key={chipId}
            chipId={chipId}
            surface={surface}
            label={AUTHORING_PREVIEW_CHIP_CATALOG["glyph-tv-delivery"].label}
            active={glyphDeliveryView === "tv_delivery"}
            onClick={() => onGlyphDeliveryViewChange("tv_delivery")}
          />
        ) : null;
      case "effect":
        return onEffectsEnabledChange ? (
          <PreviewChip
            key={chipId}
            chipId={chipId}
            surface={surface}
            label={AUTHORING_PREVIEW_CHIP_CATALOG.effect.label}
            active={effectsEnabled}
            onClick={() => onEffectsEnabledChange(!effectsEnabled)}
          />
        ) : null;
      case "glyph":
        return onGlyphVisibleChange ? (
          <PreviewChip
            key={chipId}
            chipId={chipId}
            surface={surface}
            label={AUTHORING_PREVIEW_CHIP_CATALOG.glyph.label}
            active={glyphVisible}
            onClick={() => onGlyphVisibleChange(!glyphVisible)}
          />
        ) : null;
      case "message":
        return onMessageVisibleChange ? (
          <PreviewChip
            key={chipId}
            chipId={chipId}
            surface={surface}
            label={AUTHORING_PREVIEW_CHIP_CATALOG.message.label}
            active={messageVisible}
            onClick={() => onMessageVisibleChange(!messageVisible)}
          />
        ) : null;
      case "shell":
        return onShellVisibleChange ? (
          <PreviewChip
            key={chipId}
            chipId={chipId}
            surface={surface}
            label={AUTHORING_PREVIEW_CHIP_CATALOG.shell.label}
            active={shellVisible}
            onClick={() => onShellVisibleChange(!shellVisible)}
          />
        ) : null;
      case "re-encode":
        return onReEncode ? (
          <ActionChip
            key={chipId}
            chipId="re-encode"
            label={AUTHORING_PREVIEW_CHIP_CATALOG["re-encode"].label}
            disabled={actionBusy}
            onClick={onReEncode}
          />
        ) : null;
      default:
        return null;
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Preview layers"
      data-hail-authoring-preview-controls
      data-hail-authoring-preview-chips
      data-hail-authoring-intent={intent}
      data-hail-authoring-preview-chip-set={chips.map((chip) => chip.id).join(",")}
    >
      {chips.map((chip) => renderChip(chip.id))}
      {recipeLabel ? <PreviewMetaChip label={recipeLabel} /> : null}
    </div>
  );
}
