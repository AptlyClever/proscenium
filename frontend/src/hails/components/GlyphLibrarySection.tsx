import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { patchCustomGlyph, type ComposerGlyphSpec, type GlyphCatalogEntry } from "../../api";
import {
  customGlyphStyleSummary,
  formatGlyphTimestamp,
  myGlyphsForSelector,
  composableBuiltInGlyphIds,
} from "../hailGlyphLibrary";
import { glyphSelectorLabel } from "../hailGlyphRegistry";
import { HailGlyphAvatar } from "../hailGlyphDisplay";
import { HailMedallion, resolveHailGlyphId } from "../hailMedallions";
import {
  isComposerGlyphDeliverableOnGoogleTv,
  undeliverableGlyphReason,
} from "../hailsConsumerCapability";

type GlyphLibrarySectionProps = {
  knownGlyphs: string[];
  glyphCatalog?: GlyphCatalogEntry[];
  customGlyphs: ComposerGlyphSpec[];
  selectedGlyph: string;
  onSelectGlyph: (glyphId: string) => void;
  onLibraryChanged: () => void;
  selectOnly?: boolean;
};

function BuiltInGlyphCard({
  glyphId,
  catalog,
  selected,
  onSelect,
}: {
  glyphId: string;
  catalog?: GlyphCatalogEntry[];
  selected: boolean;
  onSelect: () => void;
}) {
  const deliverable = isComposerGlyphDeliverableOnGoogleTv(glyphId);
  return (
    <li>
      <button
        type="button"
        className={
          "ca-focusable flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-ca-sm " +
          (selected
            ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/5"
            : deliverable
              ? "border-[color:var(--ca-surface-border)]"
              : "border-[color:var(--ca-surface-border)] opacity-60")
        }
        disabled={!deliverable && !selected}
        title={!deliverable ? undeliverableGlyphReason(glyphId) : undefined}
        onClick={onSelect}
        data-hail-glyph-built-in={glyphId}
        data-hail-glyph-deliverable={deliverable ? "true" : "false"}
      >
        <HailMedallion glyphId={resolveHailGlyphId({ kind: "glyph", value: glyphId })} size="compact" />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{glyphSelectorLabel(glyphId, catalog)}</span>
          {!deliverable ? (
            <span className="block text-ca-2xs text-[color:var(--ca-status-warning-fg)]">Not on Google TV</span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

function CustomGlyphCard({
  spec,
  selected,
  onSelect,
  onRenamed,
  onArchived,
  selectOnly = false,
}: {
  spec: ComposerGlyphSpec;
  selected: boolean;
  onSelect: () => void;
  onRenamed: () => void;
  onArchived: () => void;
  selectOnly?: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(spec.label);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const mutPatch = useMutation({
    mutationFn: (body: { label?: string; archived?: boolean }) => patchCustomGlyph(spec.glyph_id, body),
    onSuccess: () => {
      setRenaming(false);
      setConfirmArchive(false);
      onRenamed();
      if (mutPatch.variables?.archived) {
        onArchived();
      }
    },
  });

  const updated = formatGlyphTimestamp(spec.updated_at ?? spec.created_at);
  const deliverable = isComposerGlyphDeliverableOnGoogleTv(spec.glyph_id, spec);

  return (
    <li>
      <div
        className={
          "flex h-full flex-col gap-2 rounded-md border p-3 " +
          (selected
            ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/5 ring-1 ring-inset ring-[color:var(--ca-brand-600)]/15"
            : deliverable
              ? "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-raised)]/30"
              : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)]/20 opacity-75")
        }
        data-hail-glyph-custom={spec.glyph_id}
        data-hail-glyph-deliverable={deliverable ? "true" : "false"}
      >
        <div className="flex items-start gap-3">
          <HailGlyphAvatar
            glyphId={spec.glyph_id}
            customGlyph={spec}
            size="tile"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-ca-sm font-medium text-[color:var(--ca-text-primary)]">{spec.label}</p>
              {spec.archived ? (
                <span className="rounded bg-[color:var(--ca-surface-border)] px-1.5 py-0.5 text-ca-2xs uppercase text-[color:var(--ca-text-muted)]">
                  Archived
                </span>
              ) : null}
            </div>
            <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">{customGlyphStyleSummary(spec)}</p>
            {!deliverable ? (
              <p className="text-ca-2xs text-[color:var(--ca-status-warning-fg)]">
                {undeliverableGlyphReason(spec.glyph_id)}
              </p>
            ) : null}
            {updated ? <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">Updated {updated}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={
              "ca-focusable rounded-md px-3 py-1.5 text-ca-2xs font-medium " +
              (selected
                ? "border border-[color:var(--ca-brand-600)] text-[color:var(--ca-brand-600)]"
                : deliverable
                  ? "bg-[color:var(--ca-brand-600)] text-[color:var(--ca-on-brand)]"
                  : "border border-[color:var(--ca-surface-border)] text-[color:var(--ca-text-muted)]")
            }
            disabled={!deliverable && !selected}
            title={!deliverable ? undeliverableGlyphReason(spec.glyph_id) : undefined}
            onClick={onSelect}
          >
            {selected ? "Selected" : deliverable ? "Use Glyph" : "Not on Google TV"}
          </button>
          {!selectOnly ? (
            !renaming ? (
              <button
                type="button"
                className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-2xs"
                disabled={mutPatch.isPending}
                onClick={() => {
                  setRenameValue(spec.label);
                  setRenaming(true);
                }}
              >
                Rename Glyph
              </button>
            ) : (
              <form
                className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (renameValue.trim()) {
                    mutPatch.mutate({ label: renameValue.trim() });
                  }
                }}
              >
                <input
                  className="ca-focusable min-w-0 flex-1 rounded-md border border-[color:var(--ca-surface-border)] px-2 py-1 text-ca-sm"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                />
                <button type="submit" className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-2 py-1 text-ca-2xs text-[color:var(--ca-on-brand)]" disabled={mutPatch.isPending}>
                  Save
                </button>
                <button type="button" className="ca-focusable text-ca-2xs underline" onClick={() => setRenaming(false)}>
                  Cancel
                </button>
              </form>
            )
          ) : null}
          {!selectOnly && !spec.archived && !confirmArchive ? (
            <button
              type="button"
              className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-2xs text-[color:var(--ca-status-error-fg)]"
              disabled={mutPatch.isPending}
              onClick={() => setConfirmArchive(true)}
            >
              Archive Glyph
            </button>
          ) : null}
          {!selectOnly && spec.archived ? (
            <button
              type="button"
              className="ca-focusable rounded-md border border-[color:var(--ca-brand-600)] px-3 py-1.5 text-ca-2xs text-[color:var(--ca-brand-600)]"
              disabled={mutPatch.isPending}
              onClick={() => mutPatch.mutate({ archived: false })}
            >
              Restore Glyph
            </button>
          ) : null}
          {!selectOnly && confirmArchive ? (
            <div className="flex flex-wrap items-center gap-2 text-ca-2xs">
              <span className="text-[color:var(--ca-text-muted)]">Archive this Custom Glyph?</span>
              <button
                type="button"
                className="ca-focusable rounded-md border border-[color:var(--ca-status-error-fg)] px-2 py-1 text-[color:var(--ca-status-error-fg)]"
                disabled={mutPatch.isPending}
                onClick={() => mutPatch.mutate({ archived: true })}
              >
                Confirm
              </button>
              <button type="button" className="ca-focusable underline" onClick={() => setConfirmArchive(false)}>
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function GlyphLibrarySection({
  knownGlyphs,
  glyphCatalog,
  customGlyphs,
  selectedGlyph,
  onSelectGlyph,
  onLibraryChanged,
  selectOnly = false,
}: GlyphLibrarySectionProps) {
  const builtInIds = composableBuiltInGlyphIds(knownGlyphs);
  const myGlyphs = myGlyphsForSelector(customGlyphs, selectedGlyph);

  return (
    <div className="space-y-4" data-hail-glyph-library>
      <section className="space-y-2" data-hail-glyph-library-built-in>
        <h5 className="text-ca-xs font-semibold uppercase tracking-wide text-[color:var(--ca-text-muted)]">Built-in Glyphs</h5>
        <ul className="grid gap-2 sm:grid-cols-2">
          {builtInIds.map((glyphId) => (
            <BuiltInGlyphCard
              key={glyphId}
              glyphId={glyphId}
              catalog={glyphCatalog}
              selected={selectedGlyph === glyphId}
              onSelect={() => onSelectGlyph(glyphId)}
            />
          ))}
        </ul>
      </section>

      <section className="space-y-2" data-hail-glyph-library-my-glyphs>
        <h5 className="text-ca-xs font-semibold uppercase tracking-wide text-[color:var(--ca-text-muted)]">My Glyphs</h5>
        {myGlyphs.length ? (
          <ul className="grid gap-2">
            {myGlyphs.map((spec) => (
              <CustomGlyphCard
                key={spec.glyph_id}
                spec={spec}
                selected={selectedGlyph === spec.glyph_id}
                onSelect={() => onSelectGlyph(spec.glyph_id)}
                onRenamed={onLibraryChanged}
                onArchived={onLibraryChanged}
                selectOnly={selectOnly}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-[color:var(--ca-surface-border)] px-3 py-4 text-ca-sm text-[color:var(--ca-text-muted)]" data-hail-glyph-library-empty>
            {selectOnly ? "No My Glyphs yet." : "No My Glyphs yet — use Create Glyph to save one here."}
          </p>
        )}
      </section>
    </div>
  );
}
