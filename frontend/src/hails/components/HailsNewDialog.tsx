import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { postHail, type ComposerGlyphSpec, type EffectRegistryEntry, type EffectRegistryPayload, type GlyphCatalogEntry, type MessageRegistryPayload } from "../../api";
import { composerGlyphLabel } from "../../composerPreviewSummary";
import {
  composerVisualFromSpec,
  hailBodyFromComposer,
} from "../hailGlyphComposer";
import { deliveryProviderLabel, roomLabel } from "../hailRouteReadiness";
import { DEFAULT_VISUAL_FIELDS, type HailVisualFields } from "../hailVisualContract";
import { applyMessageSidekickDefaults } from "../hailMessageSidekickTuning";
import { hailAuthoringPreviewLoadoutGridClass } from "../hailAuthoringPreviewLayout";
import { ComposerSaveErrors } from "../../components/ComposerSaveErrors";
import { HailGlyphStripPicker } from "./HailGlyphStripPicker";
import { HailLoadoutPresets } from "./HailLoadoutPresets";
import { HailRegistryAuthoringPreviewStack } from "./HailRegistryAuthoringPreviewStack";

export type GlyphForgeOpenContext = {
  hailNameHint?: string;
  scale?: string;
  paletteId?: string;
  effectId?: string;
  onGlyphSaved?: (glyphId: string) => void;
};

type HailsNewDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (record: Record<string, unknown>) => void;
  knownRooms: string[];
  knownGlyphs: string[];
  knownEffects: string[];
  knownPaletteIds: string[];
  knownSizeTiers: string[];
  effectRegistry?: EffectRegistryPayload | null;
  messageRegistry?: MessageRegistryPayload | null;
  glyphCatalog?: GlyphCatalogEntry[];
  customGlyphs?: ComposerGlyphSpec[];
  onLibraryChanged?: () => void;
};

const SOURCE_AREA = "arcade";
const WORKSPACE_GUTTER = "pl-0 sm:pl-4 lg:pl-10";

function defaultDestination(knownRooms: string[]): string {
  return knownRooms[0] ?? "master_bedroom";
}

export function HailsNewDialog({
  open,
  onClose,
  onSaved,
  knownRooms,
  knownGlyphs,
  knownEffects,
  knownPaletteIds,
  knownSizeTiers,
  effectRegistry = null,
  messageRegistry = null,
  glyphCatalog,
  customGlyphs = [],
  onLibraryChanged,
}: HailsNewDialogProps) {
  const [beat, setBeat] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [shortText, setShortText] = useState("");
  const [selectedGlyph, setSelectedGlyph] = useState<string | null>(null);
  const [destinationArea, setDestinationArea] = useState(() => defaultDestination(knownRooms));
  const [visual, setVisual] = useState<HailVisualFields>(DEFAULT_VISUAL_FIELDS);
  const [effectsPreviewEnabled, setEffectsPreviewEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    setBeat(1);
    setName("");
    setShortText("");
    setSelectedGlyph(null);
    setDestinationArea(defaultDestination(knownRooms));
    setVisual(applyMessageSidekickDefaults(DEFAULT_VISUAL_FIELDS, messageRegistry));
    setEffectsPreviewEnabled(true);
  }, [open, knownRooms, messageRegistry]);

  const selectedCustomGlyph = useMemo(
    () => customGlyphs.find((g) => g.glyph_id === selectedGlyph) ?? null,
    [customGlyphs, selectedGlyph],
  );

  const beat1Valid =
    Boolean(selectedGlyph) &&
    name.trim().length > 0 &&
    shortText.trim().length > 0;

  const handleSelectGlyph = (glyphId: string) => {
    setSelectedGlyph(glyphId);
    const custom = customGlyphs.find((g) => g.glyph_id === glyphId);
    setVisual(custom ? composerVisualFromSpec(custom) : DEFAULT_VISUAL_FIELDS);
  };

  const mutSave = useMutation({
    mutationFn: async () => {
      if (!selectedGlyph || !beat1Valid) {
        throw new Error("Complete Build step before saving.");
      }
      const body = hailBodyFromComposer({
        name,
        shortText,
        glyphId: selectedGlyph,
        visual,
        sourceArea: SOURCE_AREA,
        destinationArea,
      });
      return postHail(body);
    },
    onSuccess: (record) => {
      onSaved(record as Record<string, unknown>);
      onClose();
    },
  });

  const previewGlyphId = selectedGlyph ?? "";
  const previewGlyphLabel = selectedGlyph
    ? composerGlyphLabel(selectedGlyph, glyphCatalog, selectedCustomGlyph)
    : "No glyph selected";
  const previewTransition = selectedCustomGlyph?.transition_style ?? "fade";
  const registryEntry = useMemo(() => {
    const entries = effectRegistry?.entries;
    if (!entries || typeof entries !== "object") {
      return null;
    }
    const key = visual.effectId?.trim() || "transporter";
    return (entries as unknown as Record<string, EffectRegistryEntry | undefined>)[key] ?? null;
  }, [effectRegistry, visual.effectId]);

  const openForge = () => {
    onLibraryChanged?.();
    window.location.hash = "#/axiom/hails/forge/new-glyph";
  };

  if (!open) return null;

  return (
    <div
      className="ca-modal-scrim ca-overlay-inset fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !mutSave.isPending) onClose();
      }}
    >
      <div
        className="ca-panel flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hails-new-title"
        data-hails-new-dialog
        data-hails-new-beat={beat}
      >
        <header className="border-b border-[color:var(--ca-surface-border)] px-5 py-4">
          <h3 id="hails-new-title" className="text-ca-base font-semibold text-[color:var(--ca-text-primary)]">
            New Hail
          </h3>
          <p className="mt-1 text-ca-2xs text-[color:var(--ca-text-muted)]">
            {beat === 1 ? "Build — pick a glyph, look, name, and message." : "Where it goes — choose the destination room."}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {beat === 1 ? (
            <div className={`space-y-5 ${WORKSPACE_GUTTER}`} data-hails-new-build data-hails-new-workspace-gutter>
              <section data-hails-new-glyph-strip>
                <HailGlyphStripPicker
                  knownGlyphs={knownGlyphs}
                  glyphCatalog={glyphCatalog}
                  customGlyphs={customGlyphs}
                  selectedGlyph={selectedGlyph ?? ""}
                  paletteId={visual.paletteId}
                  onSelectGlyph={handleSelectGlyph}
                  onCreateGlyph={openForge}
                />
              </section>

              <div data-hails-new-preview-loadout-row>
                <div className={hailAuthoringPreviewLoadoutGridClass} data-hail-authoring-preview-loadout-grid>
                  <div className="min-w-0" data-hails-new-preview>
                    <HailRegistryAuthoringPreviewStack
                      surface="new"
                      shortText={shortText || name}
                      glyphId={previewGlyphId}
                      glyphLabel={previewGlyphLabel}
                      visual={visual}
                      customGlyph={selectedCustomGlyph}
                      customGlyphs={customGlyphs}
                      glyphCatalog={glyphCatalog}
                      animationEnabled={effectsPreviewEnabled}
                      transitionStyle={previewTransition}
                      registryEntry={registryEntry}
                      effectsPreviewEnabled={effectsPreviewEnabled}
                      onEffectsPreviewEnabledChange={setEffectsPreviewEnabled}
                    />
                  </div>
                  <HailLoadoutPresets
                    visual={visual}
                    knownEffects={knownEffects}
                    knownPaletteIds={knownPaletteIds}
                    knownSizeTiers={knownSizeTiers}
                    effectRegistry={effectRegistry}
                    messageRegistry={messageRegistry}
                    onVisualChange={setVisual}
                  />
                </div>
              </div>

              <section className="grid gap-3 sm:grid-cols-2" data-hails-new-copy>
                <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                  Name
                  <input
                    className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Hail name"
                  />
                </label>
                <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)] sm:col-span-2">
                  Message
                  <input
                    className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                    value={shortText}
                    onChange={(e) => setShortText(e.target.value)}
                    placeholder="Short message shown with the Hail"
                  />
                </label>
              </section>
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-5" data-hails-new-route>
              <section className="space-y-3 rounded-lg border border-[color:var(--ca-surface-border)] p-4">
                <div className="space-y-1">
                  <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">From</p>
                  <p className="text-ca-sm font-medium text-[color:var(--ca-text-primary)]" data-hails-new-source>
                    {roomLabel(SOURCE_AREA)}
                  </p>
                  <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">Always launches from Arcade.</p>
                </div>
                <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
                  To
                  <select
                    className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                    value={destinationArea}
                    onChange={(e) => setDestinationArea(e.target.value)}
                    data-hails-new-destination
                  >
                    {knownRooms.map((room) => (
                      <option key={room} value={room}>
                        {roomLabel(room)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="space-y-1 border-t border-[color:var(--ca-surface-border)] pt-3">
                  <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">Delivery</p>
                  <p className="text-ca-sm text-[color:var(--ca-text-primary)]" data-hails-new-delivery>
                    {deliveryProviderLabel("lcard")}
                  </p>
                </div>
              </section>
              <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
                Route: {roomLabel(SOURCE_AREA)} → {roomLabel(destinationArea)}
              </p>
            </div>
          )}

          {mutSave.isError ? (
            <div className="mt-4">
              <ComposerSaveErrors error={mutSave.error as Error} />
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[color:var(--ca-surface-border)] px-5 py-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-4 py-2 text-ca-sm text-[color:var(--ca-text-primary)]"
            disabled={mutSave.isPending}
            onClick={onClose}
          >
            Cancel
          </button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {beat === 2 ? (
              <button
                type="button"
                className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] px-4 py-2 text-ca-sm text-[color:var(--ca-text-primary)]"
                disabled={mutSave.isPending}
                onClick={() => setBeat(1)}
              >
                Back
              </button>
            ) : null}
            {beat === 1 ? (
              <button
                type="button"
                className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
                disabled={!beat1Valid}
                onClick={() => setBeat(2)}
                data-hails-new-next
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-4 py-2 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
                disabled={mutSave.isPending || !destinationArea}
                onClick={() => mutSave.mutate()}
                data-hails-new-save
              >
                {mutSave.isPending ? "Saving…" : "Save Hail"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
