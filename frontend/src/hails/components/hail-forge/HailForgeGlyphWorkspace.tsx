import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  composerRegisterGlyph,
  composerSeedGlyph,
  patchCustomGlyph,
  type ComposerGlyphSpec,
  type CustomGlyphPatchBody,
  type EffectRegistryPayload,
} from "../../../api";
import { composerGlyphLabel } from "../../../composerPreviewSummary";
import { buildComposerGlyphPersistPayload, composerVisualFromSpec, mergeRegeneratedGlyphSpec } from "../../hailGlyphComposer";
import { registryEntryForEffect } from "../../hailEffectRegistryPreview";
import { DEFAULT_VISUAL_FIELDS, type HailVisualFields } from "../../hailVisualContract";
import {
  defaultAuthoringLayerToggles,
  type HailAuthoringLayerToggles,
} from "../../hailAuthoringIntent";
import { hailAuthoringPreviewLoadoutGridClass } from "../../hailAuthoringPreviewLayout";
import { ComposerSaveErrors } from "../../../components/ComposerSaveErrors";
import { FrozenPlotNotice } from "../FrozenPlotNotice";
import { GlyphHeroQualityGate } from "../GlyphHeroQualityGate";
import { HailForgeAuthoringPreviewStack } from "./HailForgeAuthoringPreviewStack";
import type { HailForgeSelection } from "./HailForgeLibrary";
import { useGlyphHeroQuality } from "../../../hooks/useGlyphHeroQuality";
import { createTemplateRegion } from "../../../components/PageTemplate";
import type { HailsForgeRegionId } from "../../../pageTemplateRegions.generated";

const Region = createTemplateRegion<HailsForgeRegionId>();

const HailLoadoutPresets = lazy(() =>
  import("../HailLoadoutPresets").then((module) => ({ default: module.HailLoadoutPresets })),
);

function ForgeLoadoutPresets(props: ComponentProps<typeof HailLoadoutPresets>) {
  return (
    <Suspense fallback={<div className="text-ca-xs text-[color:var(--ca-text-muted)]" data-hail-forge-loadout-loading>Loading loadout…</div>}>
      <HailLoadoutPresets {...props} />
    </Suspense>
  );
}

const WORKSPACE_GUTTER = "pl-0 sm:pl-4 lg:pl-10";

function glyphPatchBodyFromPayload(payload: ComposerGlyphSpec): CustomGlyphPatchBody {
  const body: CustomGlyphPatchBody = {
    label: payload.label,
    visual: payload.visual,
    animation_enabled: payload.animation_enabled,
    speed_tier: payload.speed_tier,
    transition_style: payload.transition_style,
    fallback_emoji: payload.fallback_emoji,
    semantic_bucket: payload.semantic_bucket,
    source: payload.source,
    seed: payload.seed,
  };
  if (payload.procedural_motif_id) {
    body.procedural_motif_id = payload.procedural_motif_id;
  }
  if (payload.procedural_graph) {
    body.procedural_graph = payload.procedural_graph;
  }
  if (payload.glyph_family_id) {
    body.glyph_family_id = payload.glyph_family_id;
  }
  return body;
}

function workspaceSnapshot(
  spec: ComposerGlyphSpec | null,
  visual: HailVisualFields,
  nameDraft: string,
): string {
  return JSON.stringify({
    spec,
    visual,
    name: nameDraft.trim(),
  });
}

type HailForgeGlyphWorkspaceProps = {
  selection: HailForgeSelection & { kind: "glyph" };
  newGlyphSession: number;
  customGlyphs: ComposerGlyphSpec[];
  knownEffects: string[];
  knownPaletteIds: string[];
  knownSizeTiers: string[];
  effectRegistry?: EffectRegistryPayload | null;
  onLibraryChanged: () => void;
  onSelectionChange: (selection: HailForgeSelection) => void;
  onWorkspaceMetaChange?: (meta: { dirty: boolean; saveBlocked: boolean }) => void;
};

export function HailForgeGlyphWorkspace({
  selection,
  newGlyphSession,
  customGlyphs,
  knownEffects,
  knownPaletteIds,
  knownSizeTiers,
  effectRegistry = null,
  onLibraryChanged,
  onSelectionChange,
  onWorkspaceMetaChange,
}: HailForgeGlyphWorkspaceProps) {
  const qc = useQueryClient();
  const existing = customGlyphs.find((g) => g.glyph_id === selection.glyphId) ?? null;
  const isNew = selection.mode === "new";

  const [customSpec, setCustomSpec] = useState<ComposerGlyphSpec | null>(isNew ? null : existing);
  const [visual, setVisual] = useState<HailVisualFields>(() => {
    if (existing?.visual) return composerVisualFromSpec(existing);
    return DEFAULT_VISUAL_FIELDS;
  });
  const [reEncodeSeed, setReEncodeSeed] = useState(0);
  const [layerToggles, setLayerToggles] = useState<HailAuthoringLayerToggles>(() =>
    defaultAuthoringLayerToggles({ intent: "glyph", isNewGlyph: isNew }),
  );
  const [nameDraft, setNameDraft] = useState(existing?.label ?? "");

  useEffect(() => {
    if (isNew) return;
    if (existing) {
      setCustomSpec(existing);
      setVisual(composerVisualFromSpec(existing));
      setNameDraft(existing.label);
      setReEncodeSeed(0);
    }
  }, [selection.glyphId, selection.mode, existing, isNew]);

  type SeedMutationVars = {
    glyph_name: string;
    hail_name: string;
    seed?: number;
    scale: string;
    palette_id: string;
    effect_id: string;
    glyph_family_id?: string;
    variation_only?: boolean;
    remix?: boolean;
    motifOnly?: boolean;
    glyph_id?: string;
  };

  const mutSeed = useMutation({
    mutationFn: ({ motifOnly: _motifOnly, ...body }: SeedMutationVars) => composerSeedGlyph(body),
    onSuccess: (spec, variables) => {
      if (variables.motifOnly) {
        setCustomSpec((prev) => (prev ? mergeRegeneratedGlyphSpec(prev, spec) : spec));
      } else {
        setCustomSpec(spec);
        setVisual(
          isNew
            ? composerVisualFromSpec(spec)
            : (prev) => ({
                ...composerVisualFromSpec(spec),
                scale: prev.scale,
                paletteId: prev.paletteId,
                effectId: prev.effectId,
              }),
        );
        if (!nameDraft.trim()) setNameDraft(spec.label);
      }
      void qc.invalidateQueries({ queryKey: ["composer-paintbox-preview"] });
    },
  });

  const mutRegister = useMutation({
    mutationFn: async (spec: ComposerGlyphSpec) =>
      composerRegisterGlyph({
        ...spec,
        label: nameDraft.trim() || spec.label.trim() || "Custom Glyph",
        visual: {
          effect_id: visual.effectId,
          palette_id: visual.paletteId,
          scale: visual.scale,
          duration_ms: Number(visual.durationMs) || 5000,
          placement_id: visual.placementId,
          placement_mode: "preset",
        },
        animation_enabled: spec.animation_enabled,
        speed_tier: spec.speed_tier,
        transition_style: spec.transition_style,
      }),
    onSuccess: (registered) => {
      onLibraryChanged();
      void qc.invalidateQueries({ queryKey: ["composer-paintbox-preview"] });
      onSelectionChange({ kind: "glyph", glyphId: registered.glyph_id, mode: "custom" });
    },
  });

  const mutPatch = useMutation({
    mutationFn: (body: CustomGlyphPatchBody) => patchCustomGlyph(selection.glyphId, body),
    onSuccess: (updated) => {
      onLibraryChanged();
      void qc.invalidateQueries({ queryKey: ["composer-paintbox-preview"] });
      if (updated.archived) {
        onSelectionChange({ kind: "glyph", glyphId: "new", mode: "new" });
        return;
      }
      setNameDraft(updated.label);
      setCustomSpec(updated);
      setVisual(composerVisualFromSpec(updated));
    },
  });

  useEffect(() => {
    if (!isNew) return;
    setCustomSpec(null);
    setVisual(DEFAULT_VISUAL_FIELDS);
    setNameDraft("");
    setReEncodeSeed(0);
    setLayerToggles(defaultAuthoringLayerToggles({ intent: "glyph", isNewGlyph: true }));
  }, [isNew, newGlyphSession]);

  useEffect(() => {
    if (!isNew) return;
    const glyphName = nameDraft.trim();
    if (glyphName.length < 2) {
      setCustomSpec(null);
      return;
    }
    mutSeed.mutate({
      glyph_name: glyphName,
      hail_name: "",
      scale: visual.scale,
      palette_id: visual.paletteId,
      effect_id: visual.effectId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed when operator names the mark
  }, [isNew, nameDraft, newGlyphSession]);

  const busy = mutSeed.isPending || mutRegister.isPending || mutPatch.isPending;
  const previewGlyphId = customSpec?.glyph_id ?? "custom-pending";
  const previewGlyphSpec = useMemo(
    () => (customSpec ? buildComposerGlyphPersistPayload(customSpec, visual, nameDraft) : null),
    [customSpec, visual, nameDraft],
  );
  const { heroErrors, heroValidating, heroQualityReady } = useGlyphHeroQuality(previewGlyphSpec, customGlyphs);
  const previewGlyphLabel = composerGlyphLabel(previewGlyphId, undefined, previewGlyphSpec);
  const previewAnimationEnabled = customSpec?.animation_enabled !== false && visual.effectId !== "none";
  const registryEntry = registryEntryForEffect(effectRegistry, visual.effectId);

  const requestSeed = (
    body: { glyph_name: string; hail_name: string; seed?: number },
    motifOnly = false,
    family?: { glyph_family_id?: string; variation_only?: boolean; remix?: boolean },
  ) => {
    mutSeed.mutate({
      ...body,
      scale: visual.scale,
      palette_id: visual.paletteId,
      effect_id: visual.effectId,
      glyph_family_id: family?.glyph_family_id,
      variation_only: family?.variation_only,
      glyph_id: !isNew ? customSpec?.glyph_id ?? selection.glyphId : undefined,
      remix: family?.remix,
      motifOnly,
    });
  };

  const previewLoadoutGridClass = hailAuthoringPreviewLoadoutGridClass;

  const handleReEncode = () => {
    const glyphName = nameDraft.trim() || customSpec?.label.trim() || "";
    if (!glyphName || !customSpec?.glyph_family_id) return;
    const next = reEncodeSeed + 1;
    setReEncodeSeed(next);
    requestSeed(
      { glyph_name: glyphName, hail_name: "", seed: next },
      true,
      {
        glyph_family_id: customSpec.glyph_family_id,
        variation_only: true,
        remix: false,
      },
    );
  };

  const canSave = Boolean(customSpec?.glyph_id);
  const workspaceBaseline = useMemo(() => {
    if (isNew || !existing) return "";
    return workspaceSnapshot(existing, composerVisualFromSpec(existing), existing.label);
  }, [existing, isNew, selection.glyphId]);
  const workspaceDirty = isNew
    ? Boolean(customSpec)
    : workspaceSnapshot(customSpec, visual, nameDraft) !== workspaceBaseline;
  const workspaceSaveBlocked = heroQualityReady && heroErrors.length > 0;
  const canPersist = canSave && (isNew || workspaceDirty) && !workspaceSaveBlocked;

  const persistGlyph = () => {
    if (!customSpec) return;
    const payload = buildComposerGlyphPersistPayload(customSpec, visual, nameDraft);
    if (isNew) {
      mutRegister.mutate(payload);
      return;
    }
    mutPatch.mutate(glyphPatchBodyFromPayload(payload));
  };

  useEffect(() => {
    onWorkspaceMetaChange?.({ dirty: workspaceDirty, saveBlocked: workspaceSaveBlocked });
  }, [onWorkspaceMetaChange, workspaceDirty, workspaceSaveBlocked]);

  return (
    <section className="min-w-0" data-hail-forge-glyph-workspace data-hail-glyph-forge>
      <div className={`space-y-5 ${WORKSPACE_GUTTER}`} data-hail-forge-workspace-gutter>
        <FrozenPlotNotice surfaceLabel="Procedural glyph seeding and Re-encode" />
        <Region as="div" regionId="authoring_preview_loadout" data-hail-forge-preview-loadout-row>
          <div className={previewLoadoutGridClass} data-hail-authoring-preview-loadout-grid>
            <HailForgeAuthoringPreviewStack
              surface="forge"
              shortText={nameDraft || customSpec?.label || "Your Glyph"}
              glyphId={previewGlyphId}
              glyphLabel={previewGlyphLabel}
              visual={visual}
              customGlyph={previewGlyphSpec}
              customGlyphs={customGlyphs}
              animationEnabled={previewAnimationEnabled}
              transitionStyle={customSpec?.transition_style ?? "fade"}
              registryEntry={registryEntry}
              authoringIntent="glyph"
              effectsPreviewEnabled={layerToggles.effectsEnabled}
              onEffectsPreviewEnabledChange={(enabled) =>
                setLayerToggles((prev) => ({ ...prev, effectsEnabled: enabled }))
              }
              glyphPreviewEnabled={layerToggles.glyphVisible}
              messagePreviewEnabled={layerToggles.messageVisible}
              onMessagePreviewEnabledChange={(visible) =>
                setLayerToggles((prev) => ({ ...prev, messageVisible: visible }))
              }
              shellPreviewEnabled={layerToggles.shellVisible}
              onShellPreviewEnabledChange={(visible) =>
                setLayerToggles((prev) => ({ ...prev, shellVisible: visible }))
              }
              onReEncode={customSpec ? handleReEncode : undefined}
              actionBusy={busy}
            />
            <ForgeLoadoutPresets
              visual={visual}
              knownEffects={knownEffects}
              knownPaletteIds={knownPaletteIds}
              knownSizeTiers={knownSizeTiers}
              effectRegistry={effectRegistry}
              onVisualChange={setVisual}
              glyphMotion={
                customSpec
                  ? {
                      spec: customSpec,
                      onSpecChange: setCustomSpec,
                    }
                  : undefined
              }
            />
          </div>
        </Region>

        <Region as="div" regionId="authoring_identity_editor" className="space-y-4" data-hail-forge-glyph-fields>
          {!customSpec ? (
            <div className="space-y-2">
              <p className="rounded-md border border-dashed border-[color:var(--ca-surface-border)] px-3 py-4 text-ca-sm text-[color:var(--ca-text-muted)]">
                {mutSeed.isPending
                  ? "Preparing your Glyph…"
                  : nameDraft.trim().length < 2
                    ? "Name your Glyph first (e.g. Combadge, Ohio, Mom) — then we generate a shaped mark."
                    : "Starting…"}
              </p>
              {mutSeed.error ? (
                <ComposerSaveErrors title="Could not seed Glyph" error={mutSeed.error as Error} />
              ) : null}
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
            Glyph name
            <input
              className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              data-hail-forge-glyph-name
            />
          </label>

          {customSpec ? (
            <div
              className="space-y-1 rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-fill-inset)] px-3 py-2 text-ca-2xs text-[color:var(--ca-text-muted)]"
              data-hail-forge-recipe-meta
            >
              <p>
                Subject recipe:{" "}
                <span className="font-mono text-[color:var(--ca-text-secondary)]">
                  {customSpec.glyph_family_id ?? customSpec.procedural_graph?.generator_id ?? "—"}
                </span>
              </p>
              {typeof customSpec.procedural_graph?.composition === "object" &&
              customSpec.procedural_graph.composition &&
              "lead_phrase" in customSpec.procedural_graph.composition ? (
                <p>
                  Lead phrase:{" "}
                  <span className="text-[color:var(--ca-text-secondary)]">
                    {String((customSpec.procedural_graph.composition as { lead_phrase?: string }).lead_phrase)}
                  </span>
                </p>
              ) : null}
              {customSpec.glyph_family_id === "char_combadge_delta_v1" ? (
                <p className="flex flex-wrap items-center gap-2">
                  <a
                    href="#/hails/plot/custom-combadge-plot"
                    className="text-[color:var(--ca-brand-400)] hover:underline"
                  >
                    Open combadge plot judgment
                  </a>
                  <FrozenPlotNotice compact />
                </p>
              ) : null}
            </div>
          ) : null}

          {(mutRegister.error || mutPatch.error) && (
            <ComposerSaveErrors
              title="Could not save Glyph"
              error={(mutRegister.error ?? mutPatch.error) as Error}
            />
          )}

          <GlyphHeroQualityGate errors={heroErrors} validating={heroValidating} />

          <Region
            as="div"
            regionId="authoring_persistence_actions"
            className="flex flex-wrap items-center gap-2"
            data-hail-forge-glyph-actions
          >
            <button
              type="button"
              className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
              disabled={!canPersist || busy}
              onClick={persistGlyph}
              data-hail-glyph-forge-save
            >
              {mutRegister.isPending || mutPatch.isPending
                ? "Saving…"
                : isNew
                  ? "Save Glyph"
                  : "Update Glyph"}
            </button>
            {!isNew && existing ? (
              <>
                <button
                  type="button"
                  className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-4 py-2 text-ca-sm disabled:opacity-50"
                  disabled={!workspaceDirty || busy}
                  onClick={() => {
                    const payload = customSpec
                      ? buildComposerGlyphPersistPayload(customSpec, visual, nameDraft)
                      : null;
                    if (!payload) return;
                    mutPatch.mutate({ label: payload.label });
                  }}
                  data-hail-forge-glyph-rename
                >
                  {mutPatch.isPending ? "Renaming…" : "Rename"}
                </button>
                <button
                  type="button"
                  className="ca-focusable rounded-md border border-[color:var(--ca-status-error-fg)]/40 px-4 py-2 text-ca-sm text-[color:var(--ca-status-error-fg)] disabled:opacity-50"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Remove "${existing.label}" from My Glyphs?`)) {
                      mutPatch.mutate({ archived: true });
                    }
                  }}
                  data-hail-forge-glyph-delete
                >
                  Delete
                </button>
              </>
            ) : null}
          </Region>
        </Region>
      </div>
    </section>
  );
}
