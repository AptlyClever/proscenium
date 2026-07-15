import { ComposerSaveErrors } from "../../../components/ComposerSaveErrors";
import { HailVisualContractPanel } from "../HailVisualContractPanel";
import type { DeliveryRoute } from "../../hailDeliveryRoutes";
import {
  displayEffectId,
  displayPlacementId,
  displaySizeTier,
  visualPresentationSummary,
} from "../../hailComposerLabels";
import type { HailVisualFields } from "../../hailVisualContract";
import type { GlyphCatalogEntry } from "../../hailGlyphRegistry";
import { RouteEditor } from "./RouteEditor";
import { createTemplateRegion } from "../../../components/PageTemplate";
import type { HailsManagementRegionId } from "../../../pageTemplateRegions.generated";

const Region = createTemplateRegion<HailsManagementRegionId>();

type HailStudioBackstageProps = {
  selectedId: string | null;
  selectedHail: Record<string, unknown> | null;
  editor: {
    enabled: boolean;
    shortText: string;
    glyph: string;
    visual: HailVisualFields;
    displayId: string;
    category: string;
    cooldownSec: string;
    routes: DeliveryRoute[];
  };
  draftBody: Record<string, unknown>;
  knownRooms: string[];
  knownGlyphs: string[];
  glyphCatalog?: GlyphCatalogEntry[];
  knownEffects: string[];
  knownSizeTiers: string[];
  knownPaletteIds: string[];
  knownPlacementIds: string[];
  knownCategories: string[];
  routeValidationErrors: string[];
  rendererLines: string[];
  readinessLines: string[];
  roomsJson: string;
  advancedVisualEditEnabled: boolean;
  savePending: boolean;
  saveBlocked: boolean;
  dirty: boolean;
  confirmArchive: boolean;
  archivePending: boolean;
  restorePending: boolean;
  onEditorChange: (patch: Partial<HailStudioBackstageProps["editor"]>) => void;
  onVisualChange: (visual: HailVisualFields) => void;
  onSave: () => void;
  onConfirmArchive: () => void;
  onCancelArchive: () => void;
  onStartArchive: () => void;
  onRestore: () => void;
  onEnableAdvancedEdit: () => void;
  onDisableAdvancedEdit: () => void;
  saveStatus?: string;
  saveError?: Error | null;
  sendPending?: boolean;
  sendError?: Error | null;
  sendResult?: string | null;
  onSend?: () => void;
};

export function HailStudioBackstage({
  selectedId,
  selectedHail,
  editor,
  draftBody,
  knownRooms,
  knownGlyphs,
  glyphCatalog,
  knownEffects,
  knownSizeTiers,
  knownPaletteIds,
  knownPlacementIds,
  knownCategories,
  routeValidationErrors,
  rendererLines,
  readinessLines,
  roomsJson,
  advancedVisualEditEnabled,
  savePending,
  saveBlocked,
  dirty,
  confirmArchive,
  archivePending,
  restorePending,
  onEditorChange,
  onVisualChange,
  onSave,
  onConfirmArchive,
  onCancelArchive,
  onStartArchive,
  onRestore,
  onEnableAdvancedEdit,
  onDisableAdvancedEdit,
  saveStatus,
  saveError,
  sendPending = false,
  sendError = null,
  sendResult = null,
  onSend,
}: HailStudioBackstageProps) {
  const archived = selectedHail?.archived === true;

  return (
    <details className="rounded-lg border border-[color:var(--ca-surface-border)]" data-hail-studio-backstage>
      <summary className="ca-focusable cursor-pointer px-4 py-2.5 text-ca-xs text-[color:var(--ca-text-muted)]">
        Advanced: routes, render payload, manual tools
      </summary>
      <div className="min-w-0 space-y-3 border-t border-[color:var(--ca-surface-border)] p-3" data-hail-more-options>
        <span className="sr-only">More Hail options</span>

        {saveError ? <ComposerSaveErrors title="Could not save Hail" error={saveError} /> : null}
        {saveStatus ? (
          <p className="text-ca-2xs text-[color:var(--ca-text-muted)]" role="status" data-hail-backstage-save-status>
            {saveStatus}
          </p>
        ) : null}
        {dirty ? (
          <div className="flex flex-wrap items-center gap-2" data-hail-backstage-save-panel>
            <button
              type="button"
              className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
              disabled={savePending || saveBlocked}
              onClick={onSave}
              data-hail-backstage-save
            >
              {savePending ? "Saving…" : "Save Hail"}
            </button>
            {saveBlocked ? (
              <p className="text-ca-2xs text-[color:var(--ca-status-warning-fg)]">Fix route validation errors before saving.</p>
            ) : null}
          </div>
        ) : null}

        <div className="hidden" data-hail-workspace-modes aria-hidden="true">
          <span data-hail-workspace-mode="preview" />
          <span data-hail-workspace-mode="route" />
          <span data-hail-workspace-advanced-visual />
        </div>

        {selectedId ? (
          <details className="rounded-md border border-[color:var(--ca-surface-border)]">
            <summary className="ca-focusable cursor-pointer px-3 py-2 text-ca-xs font-medium text-[color:var(--ca-text-secondary)]">
              Visual contract
            </summary>
            <Region
              as="div"
              regionId="visual_contract_readiness"
              className="min-w-0 border-t border-[color:var(--ca-surface-border)] p-3"
            >
              <HailVisualContractPanel
                hailId={String(selectedId)}
                draftBody={draftBody}
                enabled={editor.enabled}
                shortText={editor.shortText}
                glyph={editor.glyph}
                visual={editor.visual}
                knownGlyphs={knownGlyphs}
                glyphCatalog={glyphCatalog}
                knownEffects={knownEffects}
                knownSizeTiers={knownSizeTiers}
                knownPaletteIds={knownPaletteIds}
                knownPlacementIds={knownPlacementIds}
                onEnabledChange={(enabled) => onEditorChange({ enabled })}
                onShortTextChange={(shortText) => onEditorChange({ shortText })}
                onGlyphChange={(glyph) => onEditorChange({ glyph })}
                onVisualChange={onVisualChange}
                onSave={onSave}
                savePending={savePending}
                saveBlocked={saveBlocked}
                dirty={dirty}
                readOnly={!advancedVisualEditEnabled}
                onEnableAdvancedEdit={onEnableAdvancedEdit}
                onDisableAdvancedEdit={onDisableAdvancedEdit}
              />
            </Region>
          </details>
        ) : null}

        <details className="rounded-md border border-[color:var(--ca-surface-border)]">
          <summary className="ca-focusable cursor-pointer px-3 py-2 text-ca-xs font-medium text-[color:var(--ca-text-secondary)]">
            Routes and behavior
          </summary>
          <div className="min-w-0 space-y-4 border-t border-[color:var(--ca-surface-border)] p-3">
            <div data-hail-route-details-section>
              <RouteEditor knownRooms={knownRooms} routes={editor.routes} errors={routeValidationErrors} onChange={(routes) => onEditorChange({ routes })} />
            </div>
            <div className="space-y-3" data-hail-behavior-section>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                  Display id
                  <input className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 font-mono text-ca-xs" value={editor.displayId} onChange={(e) => onEditorChange({ displayId: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                  Category
                  <select className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm" value={editor.category} onChange={(e) => onEditorChange({ category: e.target.value })}>
                    {knownCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                  Cooldown (seconds)
                  <input className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm" value={editor.cooldownSec} onChange={(e) => onEditorChange({ cooldownSec: e.target.value })} />
                </label>
              </div>
            </div>
            {!archived && selectedId ? (
              <div data-hail-archive-section>
                {confirmArchive ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)] p-2">
                    <span className="text-ca-2xs text-[color:var(--ca-text-muted)]">Archive this Hail?</span>
                    <button type="button" className="ca-focusable rounded-md border border-[color:var(--ca-status-error-fg)] px-2 py-1 text-ca-2xs text-[color:var(--ca-status-error-fg)]" disabled={archivePending} onClick={onConfirmArchive}>
                      Confirm archive
                    </button>
                    <button type="button" className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-2 py-1 text-ca-2xs" onClick={onCancelArchive}>
                      Keep
                    </button>
                  </div>
                ) : (
                  <button type="button" className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-xs text-[color:var(--ca-status-error-fg)]" onClick={onStartArchive}>
                    Archive Hail
                  </button>
                )}
              </div>
            ) : null}
            {archived && selectedId ? (
              <div data-hail-archive-section data-hail-restore-section>
                <button
                  type="button"
                  className="ca-focusable rounded-md border border-[color:var(--ca-brand-600)] px-3 py-1.5 text-ca-xs font-medium text-[color:var(--ca-brand-600)] disabled:opacity-50"
                  disabled={restorePending}
                  onClick={onRestore}
                  data-hail-restore
                >
                  {restorePending ? "Restoring…" : "Restore Hail"}
                </button>
              </div>
            ) : null}
          </div>
        </details>

        <Region as="details" regionId="technical_signals" className="rounded-md border border-[color:var(--ca-surface-border)]">
          <summary className="ca-focusable cursor-pointer px-3 py-2 text-ca-xs font-medium text-[color:var(--ca-text-secondary)]">
            Technical details
          </summary>
          <div className="min-w-0 space-y-4 border-t border-[color:var(--ca-surface-border)] p-3">
            <div data-hail-render-contract-legend>
              <dl
                className="grid grid-cols-2 gap-x-4 gap-y-2 text-ca-2xs sm:grid-cols-4"
                data-hail-paintbox-contract-legend
              >
                <div>
                  <dt className="text-[color:var(--ca-text-muted)]">Effect</dt>
                  <dd className="font-mono text-[color:var(--ca-text-secondary)]">{displayEffectId(editor.visual.effectId)}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--ca-text-muted)]">Scale</dt>
                  <dd className="font-mono text-[color:var(--ca-text-secondary)]">{displaySizeTier(editor.visual.scale)}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--ca-text-muted)]">Placement</dt>
                  <dd className="font-mono text-[color:var(--ca-text-secondary)]">{displayPlacementId(editor.visual.placementId)}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--ca-text-muted)]">Look</dt>
                  <dd className="text-[color:var(--ca-text-secondary)]">{visualPresentationSummary(editor.visual)}</dd>
                </div>
              </dl>
            </div>
            <div data-hail-preview-proof-section>
              {rendererLines.find((line) => line.startsWith("Primary renderer:")) ? (
                <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">{rendererLines.find((line) => line.startsWith("Primary renderer:"))}</p>
              ) : null}
              {readinessLines.length ? (
                <ul className="space-y-0.5 text-ca-2xs text-[color:var(--ca-text-secondary)]">
                  {readinessLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <details className="rounded-md border border-[color:var(--ca-surface-border)]" data-hail-technical-receipts>
              <summary className="ca-focusable cursor-pointer px-3 py-2 text-ca-xs text-[color:var(--ca-text-muted)]">
                Technical receipts
              </summary>
              <div className="space-y-3 border-t border-[color:var(--ca-surface-border)] p-3">
                <dl className="grid grid-cols-1 gap-2 text-ca-2xs sm:grid-cols-2">
                  <div>
                    <dt className="text-[color:var(--ca-text-muted)]">Hail id</dt>
                    <dd className="break-all font-mono">{String(selectedId ?? "—")}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--ca-text-muted)]">Schema version</dt>
                    <dd className="font-mono">{String(selectedHail?.schema_version ?? 1)}</dd>
                  </div>
                </dl>
                <pre className="max-w-full overflow-x-auto whitespace-pre rounded bg-[color:var(--ca-surface-inset)] p-2 font-mono text-ca-2xs" data-hail-technical-receipts-json>
                  {roomsJson}
                </pre>
              </div>
            </details>
          </div>
        </Region>

        <div
          className="rounded-md border border-[color:var(--ca-brand-400)]/50 bg-[color:var(--ca-surface-muted)]/30 p-3"
          data-hail-glyph-plot-link
        >
          <p className="text-ca-xs font-medium text-[color:var(--ca-text-secondary)]">Glyph plot (P1)</p>
          <p className="mt-1 text-ca-2xs text-[color:var(--ca-text-muted)]">
            Validate subjects at 48 / 96 / 24px inside Axiom before registering to the delivery engine.
          </p>
          <a
            href="#/hails/plot"
            className="ca-focusable mt-2 inline-flex text-ca-xs font-medium text-[color:var(--ca-brand-600)] hover:underline"
          >
            Open glyph plot
          </a>
        </div>

        <div
          className="rounded-md border border-[color:var(--ca-surface-border)] p-3"
          data-hail-glyph-workbench-link
        >
          <p className="text-ca-xs font-medium text-[color:var(--ca-text-secondary)]">Glyph generation workbench</p>
          <p className="mt-1 text-ca-2xs text-[color:var(--ca-text-muted)]">
            Prepare briefs, stage glyph assets, accept, and promote staged bindings.
          </p>
          <a
            href="#/hails/glyph-workbench"
            className="ca-focusable mt-2 inline-flex text-ca-xs font-medium text-[color:var(--ca-brand-600)] hover:underline"
          >
            Open glyph workbench
          </a>
        </div>

        <Region
          as="details"
          regionId="advanced_operator_send"
          className="rounded-md border border-[color:var(--ca-surface-border)]"
          data-hail-manual-send
        >
          <summary className="ca-focusable cursor-pointer px-3 py-2 text-ca-xs font-medium text-[color:var(--ca-text-secondary)]">
            Manual send
          </summary>
          <div className="space-y-2 border-t border-[color:var(--ca-surface-border)] p-3">
            <p className="text-ca-xs text-[color:var(--ca-text-secondary)]">
              Sends the saved Hail package to its configured delivery route.
              {dirty ? " Save first — unsaved edits are not included." : null}
            </p>
            {sendError ? (
              <p className="text-ca-2xs text-[color:var(--ca-status-error-fg)]" role="alert">
                {sendError.message}
              </p>
            ) : null}
            {sendResult ? (
              <p className="text-ca-2xs text-[color:var(--ca-status-success-fg)]">{sendResult}</p>
            ) : null}
            <button
              type="button"
              className="ca-focusable rounded-md border border-[color:var(--ca-brand-600)] bg-[color:var(--ca-surface)] px-3 py-1.5 text-ca-xs font-medium text-[color:var(--ca-brand-600)] disabled:opacity-50"
              disabled={!selectedId || !onSend || sendPending || dirty || Boolean(selectedHail?.archived)}
              title={
                dirty
                  ? "Save before sending"
                  : selectedHail?.archived
                    ? "Archived hails cannot be sent"
                    : "Send Hail to configured route"
              }
              data-hail-studio-send
              onClick={() => onSend?.()}
            >
              {sendPending ? "Sending…" : "Send Hail"}
            </button>
          </div>
        </Region>
      </div>
    </details>
  );
}
