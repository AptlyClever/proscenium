import { HailGlyphAvatar, GlyphArchivedBadge } from "../../hailGlyphDisplay";
import { routeSummaryLabel, type HailWithDeliveryPolicy } from "../../hailDeliveryRoutes";
import { hailListSummaryLine } from "../../hailVisualContract";
import type { ComposerGlyphSpec, GlyphCatalogEntry } from "../../../api";
import { hailHasStaleComponents, staleComponentsMessage } from "../../hailPackageStale";
import { createTemplateRegion } from "../../../components/PageTemplate";
import type { HailsManagementRegionId } from "../../../pageTemplateRegions.generated";

const Region = createTemplateRegion<HailsManagementRegionId>();

type HailRecord = HailWithDeliveryPolicy & {
  archived?: boolean;
  stale_components?: boolean;
  message?: { short_text?: string };
  icon?: { value?: string };
  visual?: Record<string, unknown>;
};

type HailStudioLibraryProps = {
  hails: HailRecord[];
  selectedId: string | null;
  showArchived: boolean;
  archivedCount: number;
  glyphCatalog?: GlyphCatalogEntry[];
  customGlyphs?: ComposerGlyphSpec[];
  onSelect: (id: string) => void;
  onNewDraft: () => void;
  onToggleShowArchived: (show: boolean) => void;
  onDelete: (id: string) => void;
};

function hailStateChip(hail: HailRecord) {
  if (hail.archived === true) {
    return (
      <span className="rounded-full bg-[color:var(--ca-surface-border)] px-1.5 py-0.5 text-ca-2xs text-[color:var(--ca-text-muted)]">
        Archived
      </span>
    );
  }
  if (hail.enabled === false) {
    return (
      <span className="rounded-full bg-[color:var(--ca-status-warning-fg)]/12 px-1.5 py-0.5 text-ca-2xs text-[color:var(--ca-status-warning-fg)]">
        Off
      </span>
    );
  }
  if (hailHasStaleComponents(hail)) {
    return (
      <span
        className="rounded-full bg-[color:var(--ca-status-warning-fg)]/12 px-1.5 py-0.5 text-ca-2xs text-[color:var(--ca-status-warning-fg)]"
        title={staleComponentsMessage(hail)}
        data-hail-stale-components-badge
      >
        Stale
      </span>
    );
  }
  return null;
}

function messageSnippet(hail: HailRecord): string {
  const text = String(hail.message?.short_text ?? "").trim();
  if (text) return text.length > 56 ? `${text.slice(0, 56)}…` : text;
  return "No message";
}

export function HailStudioLibrary({
  hails,
  selectedId,
  showArchived,
  archivedCount,
  glyphCatalog,
  customGlyphs,
  onSelect,
  onNewDraft,
  onToggleShowArchived,
  onDelete,
}: HailStudioLibraryProps) {
  return (
    <Region
      as="section"
      regionId="hail_inventory"
      className="ca-panel flex min-h-0 flex-col space-y-3 p-3"
      data-hail-studio-library
      data-hail-list-primary
      data-hail-picker-catalog
    >
      <div className="space-y-2 px-1">
        <button
          type="button"
          className="ca-focusable flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--ca-brand-600)]/40 bg-[color:var(--ca-brand-600)]/5 px-3 py-2.5 text-ca-xs font-medium text-[color:var(--ca-brand-600)] transition hover:border-[color:var(--ca-brand-600)]/70 hover:bg-[color:var(--ca-brand-600)]/10"
          onClick={onNewDraft}
          data-hail-studio-new
          data-hails-composer-launch
        >
          <span aria-hidden="true" className="text-ca-base leading-none">
            +
          </span>
          New Hail
        </button>
        {archivedCount > 0 ? (
          <label className="flex cursor-pointer items-center gap-2 text-ca-2xs text-[color:var(--ca-text-muted)]">
            <input
              type="checkbox"
              className="rounded"
              checked={showArchived}
              onChange={(e) => onToggleShowArchived(e.target.checked)}
            />
            Show archived ({archivedCount})
          </label>
        ) : null}
      </div>
      {hails.length ? (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-0.5 pb-1" role="listbox" aria-label="Your Hails">
          {hails.map((hail) => {
            const active = hail.id === selectedId;
            const glyphId = String(hail.icon?.value ?? "default");
            const hailId = String(hail.id);
            const friendlySummary = hailListSummaryLine(hail, glyphCatalog);
            const routeSummary = routeSummaryLabel(hail);
            return (
              <li
                key={hailId}
                role="option"
                aria-selected={active}
                className={
                  "group relative rounded-lg transition " +
                  (active
                    ? "ring-2 ring-[color:var(--ca-brand-600)] ring-offset-1 ring-offset-[color:var(--ca-surface-panel)]"
                    : "")
                }
              >
                <div
                  className={
                    "overflow-hidden rounded-lg border transition " +
                    (active
                      ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/8"
                      : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-raised)]/50 hover:border-[color:var(--ca-brand-600)]/35 hover:bg-[color:var(--ca-surface-raised)]")
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSelect(hailId)}
                    className="ca-focusable flex w-full items-center gap-2.5 px-2.5 py-2 text-left"
                    title={`${friendlySummary} · ${routeSummary}`}
                    data-hail-picker-tile
                    data-hail-picker-tile-compact
                    data-hail-picker-selected={active ? "true" : "false"}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center" data-hail-picker-tile-glyph>
                      <HailGlyphAvatar
                        glyphId={glyphId}
                        glyphCatalog={glyphCatalog}
                        customGlyphs={customGlyphs}
                        size="tile"
                        bare
                        focusGlyph
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">
                          {hail.name ?? hail.id}
                        </span>
                        {hailStateChip(hail)}
                        <GlyphArchivedBadge glyphId={glyphId} customGlyphs={customGlyphs} glyphCatalog={glyphCatalog} />
                      </div>
                      <p
                        className="truncate text-ca-2xs text-[color:var(--ca-text-muted)]"
                        data-hail-list-message-snippet
                      >
                        {messageSnippet(hail)}
                      </p>
                    </div>
                    <span className="sr-only" data-hail-list-friendly-summary>
                      {friendlySummary}
                    </span>
                    <span className="sr-only" data-hail-list-route-summary>
                      {routeSummary}
                    </span>
                  </button>
                  <div className="absolute right-1 top-1 flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button
                      type="button"
                      data-hail-row-delete
                      aria-label={`Delete Hail "${hail.name ?? hail.id}"`}
                      className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-panel)]/95 px-1.5 py-0.5 text-ca-2xs text-[color:var(--ca-status-error-fg)]/80 shadow-sm backdrop-blur-sm hover:text-[color:var(--ca-status-error-fg)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(hailId);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-1 text-ca-sm text-[color:var(--ca-text-muted)]">
          No Hails yet. Create one to pick an icon, message, and room.
        </p>
      )}
    </Region>
  );
}
