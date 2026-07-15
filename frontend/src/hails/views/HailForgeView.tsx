import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchHails } from "../../api";
import { routePath } from "../../hashRoute";
import { normalizeCustomGlyphs } from "../hailGlyphLibrary";
import { normalizeEffectPresets } from "../hailEffectsGallery";
import { HailForgeEffectWorkspace } from "../components/hail-forge/HailForgeEffectWorkspace";
import { HailForgeGlyphWorkspace } from "../components/hail-forge/HailForgeGlyphWorkspace";
import { HailForgeLibrary, type HailForgeSelection } from "../components/hail-forge/HailForgeLibrary";
import { AxiomBuildPill } from "../../components/AxiomBuildPill";
import { RouteSurfaceHeader } from "../../components/RouteSurfaceHeader";
import { deriveForgePageTemplateState } from "../hailForgePageTemplate";
import { getHailsForgePageTemplateData } from "../../pageTemplateData";
import { PageTemplate } from "../../components/PageTemplate";

const FORGE_PAGE_TEMPLATE = getHailsForgePageTemplateData();
const FORGE_PAGE_HELPER = FORGE_PAGE_TEMPLATE.template.purpose_lead;

type HailForgeViewProps = {
  forgeIntent?: "new-glyph";
};

function initialSelection(
  customGlyphs: ReturnType<typeof normalizeCustomGlyphs>,
  forgeIntent?: "new-glyph",
): HailForgeSelection {
  if (forgeIntent === "new-glyph") {
    return { kind: "glyph", glyphId: "new", mode: "new" };
  }
  const firstCustom = customGlyphs.find((g) => g.archived !== true);
  if (firstCustom) {
    return { kind: "glyph", glyphId: firstCustom.glyph_id, mode: "custom" };
  }
  return { kind: "glyph", glyphId: "new", mode: "new" };
}

export function HailForgeView({ forgeIntent }: HailForgeViewProps) {
  const qc = useQueryClient();
  const hailsQ = useQuery({ queryKey: ["hails"], queryFn: fetchHails, staleTime: 15_000 });

  const knownEffects = hailsQ.data?.known_effects ?? hailsQ.data?.effect_registry?.active_effect_ids ?? [];
  const effectRegistry = hailsQ.data?.effect_registry ?? null;
  const knownSizeTiers = hailsQ.data?.known_size_tiers ?? ["small", "medium", "large"];
  const knownPaletteIds = hailsQ.data?.known_palette_ids ?? ["axiom_dark_cyan"];
  const customGlyphs = useMemo(
    () => normalizeCustomGlyphs(hailsQ.data?.custom_glyphs),
    [hailsQ.data?.custom_glyphs],
  );
  const effectPresets = useMemo(
    () => normalizeEffectPresets(hailsQ.data?.effect_presets),
    [hailsQ.data?.effect_presets],
  );

  const [selection, setSelection] = useState<HailForgeSelection | null>(null);
  const [newGlyphSession, setNewGlyphSession] = useState(0);
  const [workspaceDirty, setWorkspaceDirty] = useState(false);
  const [workspaceSaveBlocked, setWorkspaceSaveBlocked] = useState(false);
  useEffect(() => {
    if (selection || hailsQ.isLoading) return;
    setSelection(initialSelection(customGlyphs, forgeIntent));
  }, [selection, customGlyphs, forgeIntent, hailsQ.isLoading]);

  useEffect(() => {
    if (forgeIntent === "new-glyph") {
      setNewGlyphSession((n) => n + 1);
      setSelection({ kind: "glyph", glyphId: "new", mode: "new" });
    }
  }, [forgeIntent]);

  const handleForgeSelect = (next: HailForgeSelection) => {
    if (next.kind === "glyph" && next.mode === "new") {
      setNewGlyphSession((n) => n + 1);
    }
    setSelection(next);
  };

  useEffect(() => {
    setWorkspaceDirty(false);
    setWorkspaceSaveBlocked(false);
  }, [selection]);

  const templateState = deriveForgePageTemplateState({
    loading: hailsQ.isLoading || !selection,
    selection,
    dirty: workspaceDirty,
    saveBlocked: workspaceSaveBlocked,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["hails"] });
    qc.invalidateQueries({ queryKey: ["effective", "lcard"] });
  };

  return (
    <PageTemplate
      className="min-h-0 space-y-5"
      templateId="axiom.hails.forge.v002"
      state={templateState}
      data-hail-forge-page
    >
      <RouteSurfaceHeader
        hash="#/hails/forge"
        fallbackTitle="Hail Forge"
        fallbackLead={FORGE_PAGE_HELPER}
        regionId="ownership_summary"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AxiomBuildPill surface="forge" />
            <a
              href={routePath({ name: "axiom-hails" })}
              className="ca-focusable rounded-full border border-[color:var(--ca-surface-border)] px-3 py-1.5 text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-secondary)] hover:text-[color:var(--ca-text-primary)]"
              data-hail-forge-back
            >
              ← Hails
            </a>
          </div>
        }
      />

      <div
        className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)] lg:gap-8"
        data-hail-forge-layout
      >
        <HailForgeLibrary
          customGlyphs={customGlyphs}
          knownEffects={knownEffects}
          effectPresets={effectPresets}
          selection={selection}
          onSelect={handleForgeSelect}
        />

        <div className="min-w-0 lg:border-l lg:border-[color:var(--ca-surface-border)] lg:pl-0" data-hail-forge-workspace>
          {!selection ? (
            <section className="ca-panel p-6 text-ca-sm text-[color:var(--ca-text-muted)]">Loading…</section>
          ) : selection.kind === "glyph" ? (
            <HailForgeGlyphWorkspace
              selection={selection}
              newGlyphSession={newGlyphSession}
              customGlyphs={customGlyphs}
              knownEffects={knownEffects}
              knownPaletteIds={knownPaletteIds}
              knownSizeTiers={knownSizeTiers}
              effectRegistry={effectRegistry}
              onLibraryChanged={invalidate}
              onSelectionChange={handleForgeSelect}
              onWorkspaceMetaChange={({ dirty, saveBlocked }) => {
                setWorkspaceDirty(dirty);
                setWorkspaceSaveBlocked(saveBlocked);
              }}
            />
          ) : (
            <HailForgeEffectWorkspace
              selection={selection}
              effectPresets={effectPresets}
              knownEffects={knownEffects}
              knownPaletteIds={knownPaletteIds}
              knownSizeTiers={knownSizeTiers}
              effectRegistry={effectRegistry}
              onLibraryChanged={invalidate}
              onSelectionChange={handleForgeSelect}
              onWorkspaceMetaChange={({ dirty, saveBlocked }) => {
                setWorkspaceDirty(dirty);
                setWorkspaceSaveBlocked(saveBlocked);
              }}
            />
          )}
        </div>
      </div>
    </PageTemplate>
  );
}
