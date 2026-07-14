import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { deleteEffectPreset, registerEffectPreset, resetEffectPreset, saveEffectPreset } from "../../../api";
import {
  applyEffectPreset,
  effectPresetPayloadFromVisual,
  type HailEffectPreset,
} from "../../hailEffectsGallery";
import { registryEntryForEffect } from "../../hailEffectRegistryPreview";
import { hailAuthoringPreviewLoadoutGridClass } from "../../hailAuthoringPreviewLayout";
import { selectEffectWithRegistryDefaults, applyRegistryVisualDefaults } from "../../hailEffectTuning";
import { displayEffectId } from "../../hailComposerLabels";
import { DEFAULT_VISUAL_FIELDS, type HailVisualFields } from "../../hailVisualContract";
import type { EffectRegistryPayload } from "../../../api";
import {
  defaultAuthoringLayerToggles,
  type HailAuthoringLayerToggles,
} from "../../hailAuthoringIntent";
import { ComposerSaveErrors } from "../../../components/ComposerSaveErrors";
import { HailLoadoutPresets } from "../HailLoadoutPresets";
import { HailForgeAuthoringPreviewStack } from "./HailForgeAuthoringPreviewStack";
import type { HailForgeSelection } from "./HailForgeLibrary";
import { createTemplateRegion } from "../../../components/PageTemplate";
import type { HailsForgeRegionId } from "../../../pageTemplateRegions.generated";

const Region = createTemplateRegion<HailsForgeRegionId>();

const WORKSPACE_GUTTER = "pl-0 sm:pl-4 lg:pl-10";

type HailForgeEffectWorkspaceProps = {
  selection: HailForgeSelection & { kind: "effect" };
  effectPresets: HailEffectPreset[];
  knownEffects: string[];
  knownPaletteIds: string[];
  knownSizeTiers: string[];
  effectRegistry?: EffectRegistryPayload | null;
  onLibraryChanged: () => void;
  onSelectionChange: (selection: HailForgeSelection) => void;
  onWorkspaceMetaChange?: (meta: { dirty: boolean; saveBlocked: boolean }) => void;
};

type EditorSnapshot = {
  label: string;
  description: string;
  visual: HailVisualFields;
};

function snapshotFromPreset(preset: HailEffectPreset | null, effectId: string, registry: EffectRegistryPayload | null): EditorSnapshot {
  if (preset) {
    return {
      label: preset.label,
      description: preset.description ?? "",
      visual: applyRegistryVisualDefaults(applyEffectPreset(preset, DEFAULT_VISUAL_FIELDS), registry),
    };
  }
  return {
    label: displayEffectId(effectId),
    description: "",
    visual: selectEffectWithRegistryDefaults(DEFAULT_VISUAL_FIELDS, effectId, registry),
  };
}

export function HailForgeEffectWorkspace({
  selection,
  effectPresets,
  knownEffects,
  knownPaletteIds,
  knownSizeTiers,
  effectRegistry = null,
  onLibraryChanged,
  onSelectionChange,
  onWorkspaceMetaChange,
}: HailForgeEffectWorkspaceProps) {
  const isNew = selection.presetId === "new" || !selection.presetId;
  const matchedPreset = useMemo(
    () =>
      selection.presetId && selection.presetId !== "new"
        ? effectPresets.find((p) => p.id === selection.presetId) ?? null
        : null,
    [effectPresets, selection.presetId],
  );

  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [visual, setVisual] = useState<HailVisualFields>(DEFAULT_VISUAL_FIELDS);
  const [baseline, setBaseline] = useState("");
  const [layerToggles, setLayerToggles] = useState<HailAuthoringLayerToggles>(() =>
    defaultAuthoringLayerToggles({ intent: "effect" }),
  );

  useEffect(() => {
    const snap = snapshotFromPreset(matchedPreset, selection.effectId, effectRegistry);
    if (isNew && selection.presetId === "new") {
      snap.label = "";
      snap.description = "";
    }
    setLabel(snap.label);
    setDescription(snap.description);
    setVisual(snap.visual);
    setBaseline(JSON.stringify(snap));
  }, [selection.effectId, selection.presetId, matchedPreset, effectRegistry, isNew]);

  const dirty = JSON.stringify({ label, description, visual }) !== baseline;

  useEffect(() => {
    onWorkspaceMetaChange?.({ dirty, saveBlocked: !label.trim() });
  }, [onWorkspaceMetaChange, dirty, label]);

  const registryEntry = registryEntryForEffect(effectRegistry, visual.effectId);
  const isGallery = matchedPreset?.source === "gallery";
  const isCustom = matchedPreset?.source === "custom";

  const mutSave = useMutation({
    mutationFn: async () => {
      const payload = effectPresetPayloadFromVisual({
        id: matchedPreset?.id,
        label: label.trim() || displayEffectId(visual.effectId),
        description,
        visual,
        basePreset: matchedPreset,
      });
      if (isNew || !matchedPreset) {
        return registerEffectPreset(payload);
      }
      return saveEffectPreset(matchedPreset.id, payload);
    },
    onSuccess: (saved) => {
      onLibraryChanged();
      const record = saved as Record<string, unknown>;
      const savedVisual = record.visual as Record<string, unknown> | undefined;
      const presetId = String(record.id ?? matchedPreset?.id ?? "");
      if (presetId) {
        onSelectionChange({
          kind: "effect",
          effectId: String(savedVisual?.effect_id ?? visual.effectId),
          presetId,
        });
      }
    },
  });

  const mutReset = useMutation({
    mutationFn: () => resetEffectPreset(String(matchedPreset?.id)),
    onSuccess: (restored) => {
      onLibraryChanged();
      const record = restored as Record<string, unknown>;
      const savedVisual = record.visual as Record<string, unknown> | undefined;
      onSelectionChange({
        kind: "effect",
        effectId: String(savedVisual?.effect_id ?? selection.effectId),
        presetId: String(record.id),
      });
    },
  });

  const mutDelete = useMutation({
    mutationFn: () => deleteEffectPreset(String(matchedPreset?.id)),
    onSuccess: () => {
      onLibraryChanged();
      onSelectionChange({ kind: "effect", effectId: selection.effectId, presetId: null });
    },
  });

  const busy = mutSave.isPending || mutReset.isPending || mutDelete.isPending;
  const previewAnimationEnabled = visual.effectId !== "none";
  const saveLabel = isNew || !matchedPreset ? "Save Effect" : isGallery ? "Save Effect" : "Update Effect";

  return (
    <section className="min-w-0" data-hail-forge-effect-workspace>
      <div className={`space-y-5 ${WORKSPACE_GUTTER}`} data-hail-forge-workspace-gutter>
        <Region as="div" regionId="authoring_preview_loadout" data-hail-forge-preview-loadout-row>
          <div className={hailAuthoringPreviewLoadoutGridClass} data-hail-authoring-preview-loadout-grid>
            <HailForgeAuthoringPreviewStack
              surface="forge"
              shortText=""
              glyphId="default"
              glyphLabel="Default"
              visual={visual}
              animationEnabled={previewAnimationEnabled}
              transitionStyle={matchedPreset?.transition_style ?? "fade"}
              registryEntry={registryEntry}
              authoringIntent="effect"
              effectsPreviewEnabled
              glyphPreviewEnabled={layerToggles.glyphVisible}
              onGlyphPreviewEnabledChange={(visible) =>
                setLayerToggles((prev) => ({ ...prev, glyphVisible: visible }))
              }
              shellPreviewEnabled={layerToggles.shellVisible}
              onShellPreviewEnabledChange={(visible) =>
                setLayerToggles((prev) => ({ ...prev, shellVisible: visible }))
              }
            />
            <HailLoadoutPresets
              visual={visual}
              knownEffects={knownEffects}
              knownPaletteIds={knownPaletteIds}
              knownSizeTiers={knownSizeTiers}
              effectRegistry={effectRegistry}
              effectCustomization
              onVisualChange={setVisual}
            />
          </div>
        </Region>

        <Region as="div" regionId="authoring_identity_editor" className="space-y-4" data-hail-forge-effect-fields>
          <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
            Effect name
            <input
              className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Name this Effect"
              data-hail-forge-effect-name
            />
          </label>
          <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
            Description
            <input
              className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note for operators"
              data-hail-forge-effect-description
            />
          </label>
        </Region>

        {(mutSave.error || mutReset.error || mutDelete.error) && (
          <ComposerSaveErrors error={(mutSave.error ?? mutReset.error ?? mutDelete.error) as Error} />
        )}

        <Region
          as="div"
          regionId="authoring_persistence_actions"
          className="flex flex-wrap items-center gap-2"
          data-hail-forge-effect-actions
        >
          <button
            type="button"
            className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
            disabled={!label.trim() || busy || (!dirty && !isNew && Boolean(matchedPreset))}
            onClick={() => mutSave.mutate()}
            data-hail-forge-effect-save
          >
            {mutSave.isPending ? "Saving…" : saveLabel}
          </button>
          {isGallery && matchedPreset?.overridden ? (
            <button
              type="button"
              className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-4 py-2 text-ca-sm disabled:opacity-50"
              disabled={busy}
              onClick={() => mutReset.mutate()}
              data-hail-forge-effect-reset
            >
              {mutReset.isPending ? "Resetting…" : "Reset to default"}
            </button>
          ) : null}
          {isCustom && matchedPreset ? (
            <button
              type="button"
              className="ca-focusable rounded-md border border-[color:var(--ca-status-error-fg)]/40 px-4 py-2 text-ca-sm text-[color:var(--ca-status-error-fg)] disabled:opacity-50"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Delete Effect preset "${matchedPreset.label}"?`)) {
                  mutDelete.mutate();
                }
              }}
              data-hail-forge-effect-delete
            >
              {mutDelete.isPending ? "Deleting…" : "Delete"}
            </button>
          ) : null}
          {dirty && !busy ? (
            <p className="text-ca-2xs text-[color:var(--ca-text-muted)]" role="status">
              Unsaved changes
            </p>
          ) : null}
        </Region>
      </div>
    </section>
  );
}
