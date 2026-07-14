import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  displayDurationMs,
  displayEffectId,
  displayPaletteId,
  displayPlacementId,
  displaySizeTier,
  humanizeId,
} from "../hailComposerLabels";
import { glyphSelectorLabel, type GlyphCatalogEntry } from "../hailGlyphRegistry";
import { deriveHailPreview, type HailDerivePreviewResponse } from "../../api";
import {
  type HailVisualFields,
  visualFieldsToRecord,
} from "../hailVisualContract";
import { humanRendererReadinessLine, humanValidationPath } from "../hailOperatorCopy";

type HailVisualContractPanelProps = {
  hailId: string;
  draftBody: Record<string, unknown>;
  enabled: boolean;
  shortText: string;
  glyph: string;
  visual: HailVisualFields;
  knownGlyphs: string[];
  glyphCatalog?: GlyphCatalogEntry[];
  knownEffects: string[];
  knownSizeTiers: string[];
  knownPaletteIds: string[];
  knownPlacementIds: string[];
  onEnabledChange: (enabled: boolean) => void;
  onShortTextChange: (shortText: string) => void;
  onGlyphChange: (glyph: string) => void;
  onVisualChange: (next: HailVisualFields) => void;
  onSave: () => void;
  savePending: boolean;
  saveBlocked: boolean;
  dirty: boolean;
  readOnly?: boolean;
  onEditInComposer?: () => void;
  onEnableAdvancedEdit?: () => void;
  onDisableAdvancedEdit?: () => void;
};

function PreviewField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-ca-2xs uppercase tracking-wide text-[color:var(--ca-text-muted)]">{label}</p>
      <p
        className={`break-words text-ca-xs text-[color:var(--ca-text-primary)]${mono ? " break-all font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

export function HailVisualContractPanel({
  hailId,
  draftBody,
  enabled,
  shortText,
  glyph,
  visual,
  knownGlyphs,
  glyphCatalog,
  knownEffects,
  knownSizeTiers,
  knownPaletteIds,
  knownPlacementIds,
  onEnabledChange,
  onShortTextChange,
  onGlyphChange,
  onVisualChange,
  onSave,
  savePending,
  saveBlocked,
  dirty,
  readOnly = false,
  onEditInComposer,
  onEnableAdvancedEdit,
  onDisableAdvancedEdit,
}: HailVisualContractPanelProps) {
  const previewBody = useMemo(
    () => ({
      ...draftBody,
      id: hailId,
      visual: visualFieldsToRecord(visual),
    }),
    [draftBody, hailId, visual],
  );

  const previewQ = useQuery({
    queryKey: ["hail-derive-preview", hailId, previewBody],
    queryFn: () => deriveHailPreview({ hail_id: hailId, record: previewBody }),
    staleTime: 5_000,
  });

  const preview = previewQ.data as HailDerivePreviewResponse | undefined;
  const payload = preview?.render_payload;
  const validation = preview?.validation;
  const lifecycle = payload?.lifecycle_timing as Record<string, unknown> | undefined;
  const effectIdentity = payload?.effect_identity as Record<string, unknown> | undefined;

  const patch = (partial: Partial<HailVisualFields>) => onVisualChange({ ...visual, ...partial });

  const placementLabel =
    visual.placementMode === "custom"
      ? `Custom (${visual.xPercent}%, ${visual.yPercent}%)`
      : displayPlacementId(visual.placementId);

  const derivedPreview = (
    <div
      className="space-y-3 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)] p-4"
      data-hail-static-derived-preview
    >
      <h4 className="text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">Derived preview</h4>
      <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">How the renderer will interpret this Hail (static)</p>
      {previewQ.isPending ? (
        <p className="text-ca-xs text-[color:var(--ca-text-muted)]">Computing preview…</p>
      ) : previewQ.isError ? (
        <p className="text-ca-xs text-[color:var(--ca-status-error-fg)]" role="alert">
          {(previewQ.error as Error)?.message ?? "Preview failed"}
        </p>
      ) : payload ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2" data-hail-derived-preview-friendly-labels>
          <PreviewField label="Size tier" value={displaySizeTier(String(payload.size_tier ?? "—"))} />
          <PreviewField label="Effect" value={displayEffectId(String(payload.effect_id ?? "—"))} />
          <PreviewField label="Glyph" value={glyphSelectorLabel(String(payload.glyph_id ?? "default"), glyphCatalog)} />
          <PreviewField
            label="Placement"
            value={String(
              preview?.placement_summary?.label ??
                displayPlacementId(String(payload.placement_id ?? "—")),
            )}
          />
          <PreviewField label="Duration" value={displayDurationMs(String(payload.duration_ms ?? "—"))} />
          <PreviewField
            label="Lifecycle timing"
            value={
              lifecycle
                ? `Entrance ${lifecycle.entrance_animation_ms}ms · hold ${lifecycle.stable_hold_ms}ms · exit ${lifecycle.exit_animation_ms}ms`
                : "—"
            }
          />
          <PreviewField
            label="Effect identity"
            value={
              effectIdentity
                ? Object.entries(effectIdentity)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${humanizeId(k)}: ${humanizeId(String(v))}`)
                    .join(" · ") || "—"
                : "—"
            }
          />
        </div>
      ) : null}
      {preview?.renderer_readiness?.lines?.length ? (
        <details className="border-t border-[color:var(--ca-surface-border)] pt-3" data-hail-renderer-readiness-details>
          <summary className="ca-focusable cursor-pointer text-ca-2xs text-[color:var(--ca-text-muted)]">
            Preview engine details
          </summary>
          <ul className="mt-2 space-y-0.5 text-ca-2xs text-[color:var(--ca-text-secondary)]">
            {preview.renderer_readiness.lines.map((line) => (
              <li key={line}>{humanRendererReadinessLine(line)}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {validation?.warnings?.length ? (
        <ul className="space-y-1 text-ca-2xs text-[color:var(--ca-status-warning-fg)]" role="status">
          {validation.warnings.map((w, i) => (
            <li key={`${w.path}-${i}`}>
              {humanValidationPath(w.path ?? "")}: {w.message}
            </li>
          ))}
        </ul>
      ) : null}
      {validation?.errors?.length ? (
        <ul className="space-y-1 text-ca-2xs text-[color:var(--ca-status-error-fg)]" role="alert">
          {validation.errors.map((e, i) => (
            <li key={`${e.path}-${i}`}>
              {humanValidationPath(e.path ?? "")}: {e.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  if (readOnly) {
    return (
      <div className="space-y-5" data-hail-visual-contract-panel data-hail-advanced-visual-inspect>
        <div className="space-y-3" data-hail-visual-contract-inspect>
          <h4 className="text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">Visual contract</h4>
          <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
            Inspect-only view of message, glyph, and visual fields. Use Composer for primary authoring — static preview below.
          </p>
          {onEditInComposer ? (
            <button
              type="button"
              className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)]"
              onClick={onEditInComposer}
              data-hail-edit-in-composer
            >
              Edit in Composer
            </button>
          ) : null}
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <PreviewField label="Message" value={shortText.trim() || "—"} />
            <PreviewField label="Glyph" value={glyphSelectorLabel(glyph, glyphCatalog)} />
            <PreviewField label="Status" value={enabled ? "Active" : "Inactive"} />
            <PreviewField label="Effect" value={displayEffectId(visual.effectId)} />
            <PreviewField label="Size tier" value={displaySizeTier(visual.scale)} />
            <PreviewField label="Palette" value={displayPaletteId(visual.paletteId)} />
            <PreviewField label="Duration" value={displayDurationMs(visual.durationMs)} />
            <PreviewField label="Placement" value={placementLabel} />
          </div>
          {onEnableAdvancedEdit ? (
            <details
              className="rounded-md border border-dashed border-[color:var(--ca-surface-border)]"
              data-hail-advanced-visual-edit-escape
            >
              <summary className="ca-focusable cursor-pointer px-3 py-2 text-ca-xs text-[color:var(--ca-text-muted)]">
                Direct field editing (escape hatch)
              </summary>
              <div className="space-y-2 border-t border-[color:var(--ca-surface-border)] px-3 py-2">
                <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
                  For quick tweaks only. Prefer Composer for guided authoring.
                </p>
                <button
                  type="button"
                  className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-xs font-medium text-[color:var(--ca-text-secondary)]"
                  onClick={onEnableAdvancedEdit}
                >
                  Enable direct editing
                </button>
              </div>
            </details>
          ) : null}
        </div>
        {derivedPreview}
      </div>
    );
  }

  return (
    <div className="space-y-5" data-hail-visual-contract-panel data-hail-advanced-visual-edit-mode>
      <div className="space-y-3" data-hail-visual-contract-editor>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h4 className="text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">Visual contract</h4>
            <p className="text-ca-2xs text-[color:var(--ca-status-warning-fg)]">
              Direct editing — escape hatch only. Prefer Composer for guided authoring.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onEditInComposer ? (
              <button
                type="button"
                className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-3 py-1.5 text-ca-xs font-medium text-[color:var(--ca-on-brand)]"
                onClick={onEditInComposer}
                data-hail-edit-in-composer
              >
                Edit in Composer
              </button>
            ) : null}
            {onDisableAdvancedEdit ? (
              <button
                type="button"
                className="ca-focusable shrink-0 rounded-md border border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-xs font-medium text-[color:var(--ca-text-secondary)]"
                onClick={onDisableAdvancedEdit}
              >
                Back to inspect
              </button>
            ) : null}
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)] sm:col-span-2">
            Message
            <input
              className="ca-focusable min-w-0 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
              value={shortText}
              onChange={(e) => onShortTextChange(e.target.value)}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
            Glyph
            <select
              className="ca-focusable min-w-0 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
              value={glyph}
              onChange={(e) => onGlyphChange(e.target.value)}
            >
              {knownGlyphs.map((id) => (
                <option key={id} value={id}>
                  {glyphSelectorLabel(id, glyphCatalog)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-ca-sm text-[color:var(--ca-text-secondary)]">
            <input type="checkbox" className="rounded" checked={enabled} onChange={(e) => onEnabledChange(e.target.checked)} />
            Hail is active
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
            Effect
            <select
              className="ca-focusable min-w-0 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
              value={visual.effectId}
              onChange={(e) => patch({ effectId: e.target.value })}
            >
              {knownEffects.map((id) => (
                <option key={id} value={id}>
                  {displayEffectId(id)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
            Size tier
            <select
              className="ca-focusable min-w-0 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
              value={visual.scale}
              onChange={(e) => patch({ scale: e.target.value })}
            >
              {knownSizeTiers.map((tier) => (
                <option key={tier} value={tier}>
                  {displaySizeTier(tier)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
            Palette
            <select
              className="ca-focusable min-w-0 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
              value={visual.paletteId}
              onChange={(e) => patch({ paletteId: e.target.value })}
            >
              {knownPaletteIds.map((id) => (
                <option key={id} value={id}>
                  {displayPaletteId(id)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
            Duration (ms)
            <input
              className="ca-focusable min-w-0 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
              value={visual.durationMs}
              onChange={(e) => patch({ durationMs: e.target.value })}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
            Placement mode
            <select
              className="ca-focusable min-w-0 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
              value={visual.placementMode}
              onChange={(e) => patch({ placementMode: e.target.value as "preset" | "custom" })}
            >
              <option value="preset">Preset</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {visual.placementMode === "preset" ? (
            <label className="flex min-w-0 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
              Placement preset
              <select
                className="ca-focusable min-w-0 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                value={visual.placementId}
                onChange={(e) => patch({ placementId: e.target.value })}
              >
                {knownPlacementIds.map((id) => (
                  <option key={id} value={id}>
                    {displayPlacementId(id)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="flex min-w-0 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                X percent
                <input
                  className="ca-focusable min-w-0 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                  value={visual.xPercent}
                  onChange={(e) => patch({ xPercent: e.target.value })}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                Y percent
                <input
                  className="ca-focusable min-w-0 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                  value={visual.yPercent}
                  onChange={(e) => patch({ yPercent: e.target.value })}
                />
              </label>
            </>
          )}
        </div>
        <button
          type="button"
          className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
          disabled={!dirty || savePending || saveBlocked || validation?.valid === false}
          onClick={onSave}
        >
          {savePending ? "Saving…" : "Save visual contract"}
        </button>
      </div>

      {derivedPreview}
    </div>
  );
}
