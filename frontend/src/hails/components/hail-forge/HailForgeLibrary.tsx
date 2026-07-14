import { type ReactNode } from "react";
import { applyEffectPreset } from "../../hailEffectsGallery";
import { HailGlyphAvatar } from "../../hailGlyphDisplay";
import { customGlyphStyleSummary } from "../../hailGlyphLibrary";
import { displayEffectId, displayPaletteId } from "../../hailComposerLabels";
import { DEFAULT_VISUAL_FIELDS } from "../../hailVisualContract";
import type { ComposerGlyphSpec } from "../../../api";
import type { HailEffectPreset } from "../../hailEffectsGallery";
import { createTemplateRegion } from "../../../components/PageTemplate";
import type { HailsForgeRegionId } from "../../../pageTemplateRegions.generated";

const Region = createTemplateRegion<HailsForgeRegionId>();

export type HailForgeSelection =
  | { kind: "glyph"; glyphId: string; mode: "custom" | "new" }
  | { kind: "effect"; effectId: string; presetId?: string | null };

type HailForgeLibraryProps = {
  customGlyphs: ComposerGlyphSpec[];
  knownEffects: string[];
  effectPresets: HailEffectPreset[];
  selection: HailForgeSelection | null;
  onSelect: (selection: HailForgeSelection) => void;
};

function sectionLabel(text: string) {
  return (
    <p className="px-0.5 text-ca-2xs font-semibold uppercase tracking-wide text-[color:var(--ca-text-muted)]">{text}</p>
  );
}

function tileClass(active: boolean): string {
  return (
    "ca-focusable w-full rounded-lg border px-2.5 py-2 text-left transition " +
    (active
      ? "border-[color:var(--ca-brand-600)] bg-[color:var(--ca-brand-600)]/8"
      : "border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-raised)]/50 hover:border-[color:var(--ca-brand-600)]/35")
  );
}

function newEntryButton(label: string, dataAttr: string, onClick: () => void, legacyDataAttr?: string) {
  return (
    <button
      type="button"
      className="ca-focusable flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--ca-brand-600)]/40 bg-[color:var(--ca-brand-600)]/5 px-3 py-2 text-ca-xs font-medium text-[color:var(--ca-brand-600)] transition hover:border-[color:var(--ca-brand-600)]/70"
      onClick={onClick}
      data-hail-forge-new-entry={dataAttr}
      {...(legacyDataAttr ? { [legacyDataAttr]: "true" } : {})}
    >
      <span aria-hidden="true">+</span>
      {label}
    </button>
  );
}

function effectPresetSummary(preset: HailEffectPreset): string {
  const visual = preset.visual;
  return `${displayEffectId(visual.effect_id)} · ${displayPaletteId(visual.palette_id)}`;
}

function EffectTilePreview({ preset }: { preset: HailEffectPreset }) {
  const visual = applyEffectPreset(preset, DEFAULT_VISUAL_FIELDS);
  return (
    <div
      className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-panel)]"
      aria-hidden="true"
      data-hail-forge-effect-tile-preview
    >
      <span className="absolute inset-0 flex items-center justify-center text-ca-2xs font-semibold uppercase text-[color:var(--ca-text-muted)]">
        {displayEffectId(visual.effectId).slice(0, 2)}
      </span>
    </div>
  );
}

type ForgeLibraryTileProps = {
  active: boolean;
  title: string;
  subtitle: string;
  preview: ReactNode;
  onClick: () => void;
  dataAttrs: Record<string, string | undefined>;
};

function ForgeLibraryTile({ active, title, subtitle, preview, onClick, dataAttrs }: ForgeLibraryTileProps) {
  return (
    <button type="button" className={tileClass(active)} onClick={onClick} {...dataAttrs}>
      <div className="flex items-center gap-2">
        {preview}
        <div className="min-w-0">
          <p className="truncate text-ca-xs font-semibold text-[color:var(--ca-text-primary)]">{title}</p>
          <p className="truncate text-ca-2xs text-[color:var(--ca-text-muted)]">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

export function HailForgeLibrary({
  customGlyphs,
  knownEffects,
  effectPresets,
  selection,
  onSelect,
}: HailForgeLibraryProps) {
  const myGlyphs = customGlyphs.filter((g) => g.archived !== true);
  const sortedEffectPresets = [...effectPresets].sort((a, b) => a.label.localeCompare(b.label));

  const glyphActive = (glyphId: string, mode: "custom" | "new") =>
    selection?.kind === "glyph" && selection.glyphId === glyphId && selection.mode === mode;

  const effectActive = (effectId: string, presetId?: string | null) =>
    selection?.kind === "effect" &&
    selection.effectId === effectId &&
    (selection.presetId ?? null) === (presetId ?? null);

  return (
    <Region
      as="section"
      regionId="library_picker"
      className="ca-panel flex min-h-0 flex-col space-y-4 p-3"
      data-hail-forge-library
    >
      <div className="space-y-2" data-hail-forge-glyphs-section>
        {sectionLabel("Glyphs")}
        {newEntryButton("New Glyph", "glyph", () => onSelect({ kind: "glyph", glyphId: "new", mode: "new" }), "data-hail-forge-new-glyph")}
        <ul className="space-y-1.5" data-hail-forge-glyph-tiles>
          {myGlyphs.map((spec) => (
            <li key={spec.glyph_id}>
              <ForgeLibraryTile
                active={glyphActive(spec.glyph_id, "custom")}
                title={spec.label}
                subtitle={customGlyphStyleSummary(spec)}
                preview={
                  <HailGlyphAvatar
                    glyphId={spec.glyph_id}
                    customGlyph={spec}
                    customGlyphs={customGlyphs}
                    size="tile"
                    bare
                    focusGlyph
                  />
                }
                onClick={() => onSelect({ kind: "glyph", glyphId: spec.glyph_id, mode: "custom" })}
                dataAttrs={{
                  "data-hail-forge-glyph-tile": spec.glyph_id,
                  "data-hail-forge-glyph-custom": "true",
                }}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 border-t border-[color:var(--ca-surface-border)] pt-3" data-hail-forge-effects-section>
        {sectionLabel("Effects")}
        {newEntryButton(
          "New Effect",
          "effect",
          () => onSelect({ kind: "effect", effectId: knownEffects[0] ?? "transporter", presetId: "new" }),
          "data-hail-forge-new-effect-preset",
        )}
        <ul className="space-y-1.5" data-hail-forge-effect-tiles>
          {sortedEffectPresets.map((preset) => (
            <li key={preset.id}>
              <ForgeLibraryTile
                active={effectActive(preset.visual.effect_id, preset.id)}
                title={preset.label}
                subtitle={effectPresetSummary(preset)}
                preview={<EffectTilePreview preset={preset} />}
                onClick={() =>
                  onSelect({
                    kind: "effect",
                    effectId: preset.visual.effect_id,
                    presetId: preset.id,
                  })
                }
                dataAttrs={{
                  "data-hail-forge-effect-tile": preset.id,
                  "data-hail-forge-effect-preset": preset.id,
                  "data-hail-forge-effect-source": preset.source,
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </Region>
  );
}
