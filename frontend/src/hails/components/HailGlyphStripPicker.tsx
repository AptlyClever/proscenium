import type { ComposerGlyphSpec, GlyphCatalogEntry } from "../../api";
import {
  composableBuiltInGlyphIds,
  myGlyphsForSelector,
} from "../hailGlyphLibrary";
import { glyphChipName, glyphChipText } from "../hailGlyphRegistry";
import { HailGlyphAvatar } from "../hailGlyphDisplay";
import { HailMedallion, resolveHailGlyphId } from "../hailMedallions";
import {
  isComposerGlyphDeliverableOnGoogleTv,
  undeliverableGlyphReason,
} from "../hailsConsumerCapability";

/** Uniform chip footprint — built-in, custom, and New Glyph affordances share this shape. */
export const GLYPH_CHIP_SIZE_CLASS = "h-[5.5rem] w-[7.5rem] max-w-[7.5rem]";

type HailGlyphStripPickerProps = {
  knownGlyphs: string[];
  glyphCatalog?: GlyphCatalogEntry[];
  customGlyphs: ComposerGlyphSpec[];
  selectedGlyph: string;
  /** Active hail Color loadout — tints strip chips to match compose preview. */
  paletteId?: string;
  onSelectGlyph: (glyphId: string) => void;
  onCreateGlyph?: () => void;
};

function stripChipClass(selected: boolean): string {
  return (
    "ca-focusable flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-1.5 text-center transition " +
    GLYPH_CHIP_SIZE_CLASS +
    " " +
    (selected
      ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/10 text-[color:var(--ca-brand-600)]"
      : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] text-[color:var(--ca-text-secondary)] hover:border-[color:var(--ca-brand-600)]/40")
  );
}

function GlyphChipContent({
  glyphId,
  name,
  text,
  customGlyph,
  customGlyphs,
  glyphCatalog,
  paletteId,
}: {
  glyphId: string;
  name: string;
  text: string;
  customGlyph?: ComposerGlyphSpec | null;
  customGlyphs: ComposerGlyphSpec[];
  glyphCatalog?: GlyphCatalogEntry[];
  paletteId?: string;
}) {
  return (
    <>
      <span className="flex shrink-0 items-center justify-center" aria-hidden="true">
        {customGlyph ? (
          <HailGlyphAvatar
            glyphId={glyphId}
            customGlyph={customGlyph}
            customGlyphs={customGlyphs}
            glyphCatalog={glyphCatalog}
            paletteId={paletteId}
            size="standard"
            bare
            focusGlyph
          />
        ) : (
          <HailMedallion
            glyphId={resolveHailGlyphId({ kind: "glyph", value: glyphId })}
            paletteId={paletteId}
            size="standard"
            bare
            focusGlyph
          />
        )}
      </span>
      <span className="w-full truncate text-ca-2xs font-medium leading-tight">{name}</span>
      {text ? (
        <span className="w-full truncate text-ca-2xs leading-tight text-[color:var(--ca-text-muted)]">{text}</span>
      ) : (
        <span className="h-[0.875rem]" aria-hidden="true" />
      )}
    </>
  );
}

export function HailGlyphStripPicker({
  knownGlyphs,
  glyphCatalog,
  customGlyphs,
  selectedGlyph,
  paletteId,
  onSelectGlyph,
  onCreateGlyph,
}: HailGlyphStripPickerProps) {
  const builtInIds = composableBuiltInGlyphIds(knownGlyphs);
  const myGlyphs = myGlyphsForSelector(customGlyphs, selectedGlyph);

  return (
    <div className="space-y-2" data-hail-glyph-strip>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">Glyph</p>
        {onCreateGlyph ? (
          <button
            type="button"
            className="ca-focusable text-ca-2xs font-medium text-[color:var(--ca-brand-600)] hover:underline"
            onClick={onCreateGlyph}
            data-hail-glyph-forge-link
          >
            Open Hail Forge
          </button>
        ) : null}
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
        data-hail-glyph-strip-chips
      >
        {builtInIds.map((glyphId) => {
          const selected = selectedGlyph === glyphId;
          const deliverable = isComposerGlyphDeliverableOnGoogleTv(glyphId);
          const name = glyphChipName(glyphId, glyphCatalog);
          const text = glyphChipText(glyphId, glyphCatalog);
          return (
            <button
              key={glyphId}
              type="button"
              className={stripChipClass(selected) + (deliverable ? "" : " opacity-60")}
              disabled={!deliverable && !selected}
              onClick={() => onSelectGlyph(glyphId)}
              title={
                !deliverable
                  ? undeliverableGlyphReason(glyphId)
                  : text
                    ? `${name} — ${text}`
                    : name
              }
              aria-label={text ? `${name}. ${text}` : name}
              data-hail-glyph-strip-chip={glyphId}
              data-hail-glyph-strip-built-in
              data-hail-glyph-strip-selected={selected ? "true" : "false"}
              data-hail-glyph-deliverable={deliverable ? "true" : "false"}
            >
              <GlyphChipContent
                glyphId={glyphId}
                name={name}
                text={text}
                customGlyphs={customGlyphs}
                glyphCatalog={glyphCatalog}
                paletteId={paletteId}
              />
            </button>
          );
        })}
        {myGlyphs.map((spec) => {
          const selected = selectedGlyph === spec.glyph_id;
          const deliverable = isComposerGlyphDeliverableOnGoogleTv(spec.glyph_id, spec);
          const name = spec.label;
          const text = glyphChipText(spec.glyph_id, glyphCatalog, spec.label, spec.semantic_bucket);
          return (
            <button
              key={spec.glyph_id}
              type="button"
              className={stripChipClass(selected) + (deliverable ? "" : " opacity-60")}
              disabled={!deliverable && !selected}
              onClick={() => onSelectGlyph(spec.glyph_id)}
              title={
                !deliverable
                  ? undeliverableGlyphReason(spec.glyph_id, spec)
                  : text
                    ? `${name} — ${text}`
                    : name
              }
              aria-label={text ? `${name}. ${text}` : name}
              data-hail-glyph-strip-chip={spec.glyph_id}
              data-hail-glyph-strip-custom-chip
              data-hail-glyph-strip-selected={selected ? "true" : "false"}
              data-hail-glyph-deliverable={deliverable ? "true" : "false"}
            >
              <GlyphChipContent
                glyphId={spec.glyph_id}
                name={name}
                text={text}
                customGlyph={spec}
                customGlyphs={customGlyphs}
                glyphCatalog={glyphCatalog}
                paletteId={paletteId}
              />
            </button>
          );
        })}
        {onCreateGlyph ? (
          <button
            type="button"
            className={
              "ca-focusable flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-ca-2xs font-medium transition " +
              GLYPH_CHIP_SIZE_CLASS +
              " border-[color:var(--ca-brand-600)]/50 text-[color:var(--ca-brand-600)] hover:border-[color:var(--ca-brand-600)] hover:bg-[color:var(--ca-brand-600)]/5"
            }
            onClick={onCreateGlyph}
            title="Create a new custom Glyph"
            aria-label="New Glyph"
            data-hail-glyph-strip-new
          >
            <span className="text-lg leading-none" aria-hidden="true">
              +
            </span>
            <span>New Glyph</span>
          </button>
        ) : null}
        {!builtInIds.length && !myGlyphs.length ? (
          <p className="text-ca-2xs text-[color:var(--ca-text-muted)]" data-hail-glyph-strip-empty>
            No glyphs available.
          </p>
        ) : null}
      </div>
    </div>
  );
}
