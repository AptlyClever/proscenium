import { useState } from "react";
import type { ComposerGlyphSpec, EffectRegistryPayload, GlyphCatalogEntry, MessageRegistryPayload } from "../../../api";
import { composerGlyphLabel } from "../../../composerPreviewSummary";
import { enabledRoutes, patchRouteOnHail, type DeliveryRoute } from "../../hailDeliveryRoutes";
import { composerVisualFromSpec } from "../../hailGlyphComposer";
import { deliveryProviderLabel, roomLabel } from "../../hailRouteReadiness";
import { registryEntryForEffect } from "../../hailEffectRegistryPreview";
import { hailAuthoringPreviewLoadoutGridClass } from "../../hailAuthoringPreviewLayout";
import type { HailVisualFields } from "../../hailVisualContract";
import { staleComponentsMessage } from "../../hailPackageStale";
import { HailGlyphStripPicker } from "../HailGlyphStripPicker";
import { HailLoadoutPresets } from "../HailLoadoutPresets";
import { HailRegistryAuthoringPreviewStack } from "../HailRegistryAuthoringPreviewStack";
import { ComposerSaveErrors } from "../../../components/ComposerSaveErrors";
import { createTemplateRegion } from "../../../components/PageTemplate";
import type { HailsManagementRegionId } from "../../../pageTemplateRegions.generated";

const Region = createTemplateRegion<HailsManagementRegionId>();

const WORKSPACE_GUTTER = "pl-0 sm:pl-4 lg:pl-10";

type HailStudioEditPanelProps = {
  name: string;
  shortText: string;
  glyphId: string;
  visual: HailVisualFields;
  routes: DeliveryRoute[];
  enabled: boolean;
  archived?: boolean;
  knownRooms: string[];
  knownGlyphs: string[];
  knownEffects: string[];
  knownPaletteIds: string[];
  knownSizeTiers: string[];
  effectRegistry?: EffectRegistryPayload | null;
  messageRegistry?: MessageRegistryPayload | null;
  glyphCatalog?: GlyphCatalogEntry[];
  customGlyphs?: ComposerGlyphSpec[];
  dirty: boolean;
  savePending: boolean;
  saveBlocked: boolean;
  staleComponents?: boolean;
  saveError?: Error | null;
  onEditorChange: (patch: {
    name?: string;
    shortText?: string;
    glyph?: string;
    visual?: HailVisualFields;
    routes?: DeliveryRoute[];
  }) => void;
  onSave: () => void;
  onOpenGlyphForge?: () => void;
  effectsPreviewEnabled?: boolean;
  onEffectsPreviewEnabledChange?: (enabled: boolean) => void;
};

export function HailStudioEditPanel({
  name,
  shortText,
  glyphId,
  visual,
  routes,
  enabled,
  archived,
  knownRooms,
  knownGlyphs,
  knownEffects,
  knownPaletteIds,
  knownSizeTiers,
  effectRegistry = null,
  messageRegistry = null,
  glyphCatalog,
  customGlyphs = [],
  dirty,
  savePending,
  saveBlocked,
  staleComponents = false,
  saveError,
  onEditorChange,
  onSave,
  onOpenGlyphForge,
  effectsPreviewEnabled = true,
  onEffectsPreviewEnabledChange,
}: HailStudioEditPanelProps) {
  const [shellPreviewEnabled, setShellPreviewEnabled] = useState(true);
  const [messagePreviewEnabled, setMessagePreviewEnabled] = useState(true);
  const customGlyph = customGlyphs.find((g) => g.glyph_id === glyphId) ?? null;

  const primaryRoute = enabledRoutes(routes)[0] ?? routes[0] ?? null;
  const sourceArea = primaryRoute?.launch_room_id ?? "arcade";
  const destinationArea = primaryRoute?.destination_room_id ?? knownRooms[0] ?? "master_bedroom";
  const deliveryLabel = deliveryProviderLabel(primaryRoute?.provider ?? "lcard");

  const previewGlyphLabel = composerGlyphLabel(glyphId, glyphCatalog, customGlyph);
  const previewTransition = customGlyph?.transition_style ?? "fade";
  const registryEntry = registryEntryForEffect(effectRegistry, visual.effectId);
  const previewAnimationEnabled = customGlyph?.animation_enabled !== false && visual.effectId !== "none";

  const handleSelectGlyph = (nextGlyphId: string) => {
    const custom = customGlyphs.find((g) => g.glyph_id === nextGlyphId);
    onEditorChange({
      glyph: nextGlyphId,
      visual: custom ? composerVisualFromSpec(custom) : visual,
    });
  };

  const handleDestinationChange = (nextDestination: string) => {
    const patched = patchRouteOnHail(routes, {
      loadedRouteId: String(primaryRoute?.id ?? ""),
      sourceArea,
      destinationArea: nextDestination,
    });
    onEditorChange({ routes: patched });
  };

  return (
    <Region
      as="section"
      regionId="definition_editor"
      className="min-w-0"
      data-hail-studio-edit-panel
      data-hails-page-mode="studio"
    >
      {staleComponents ? (
        <div
          className="mb-4 rounded-md border border-[color:var(--ca-status-warning-fg)]/35 bg-[color:var(--ca-status-warning-fg)]/8 px-3 py-2 text-ca-xs text-[color:var(--ca-status-warning-fg)]"
          role="status"
          data-hail-stale-components-banner
        >
          {staleComponentsMessage({ stale_components: true })}
        </div>
      ) : null}
      <div className={`space-y-5 ${WORKSPACE_GUTTER}`} data-hail-studio-workspace-gutter>
        <div data-hail-studio-preview-loadout-row>
          {/* Authoring preview stack renders HailPaintboxPreview with variant="studio". */}
          <div className={hailAuthoringPreviewLoadoutGridClass} data-hail-authoring-preview-loadout-grid>
            <HailRegistryAuthoringPreviewStack
              surface="studio"
              shortText={shortText || name}
              glyphId={glyphId}
              glyphLabel={previewGlyphLabel}
              visual={visual}
              customGlyph={customGlyph}
              customGlyphs={customGlyphs}
              glyphCatalog={glyphCatalog}
              animationEnabled={previewAnimationEnabled}
              transitionStyle={previewTransition}
              archived={archived}
              enabled={enabled}
              registryEntry={registryEntry}
              authoringIntent="compose"
              effectsPreviewEnabled={effectsPreviewEnabled}
              onEffectsPreviewEnabledChange={onEffectsPreviewEnabledChange}
              messagePreviewEnabled={messagePreviewEnabled}
              onMessagePreviewEnabledChange={setMessagePreviewEnabled}
              shellPreviewEnabled={shellPreviewEnabled}
              onShellPreviewEnabledChange={setShellPreviewEnabled}
              previewRoomId={destinationArea}
              deliveryRoutes={routes}
            />
            <HailLoadoutPresets
              visual={visual}
              knownEffects={knownEffects}
              knownPaletteIds={knownPaletteIds}
              knownSizeTiers={knownSizeTiers}
              effectRegistry={effectRegistry}
              messageRegistry={messageRegistry}
              onVisualChange={(nextVisual) => onEditorChange({ visual: nextVisual })}
            />
          </div>
        </div>

        <section data-hails-studio-glyph-strip>
          <HailGlyphStripPicker
            knownGlyphs={knownGlyphs}
            glyphCatalog={glyphCatalog}
            customGlyphs={customGlyphs}
            selectedGlyph={glyphId}
            paletteId={visual.paletteId}
            onSelectGlyph={handleSelectGlyph}
            onCreateGlyph={onOpenGlyphForge}
          />
        </section>

        <div className="space-y-5" data-hail-studio-edit-fields>
          <section className="grid gap-3 sm:grid-cols-2" data-hails-studio-copy>
            <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
              Name
              <input
                className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                value={name}
                onChange={(e) => onEditorChange({ name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)] sm:col-span-2">
              Message
              <input
                className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                value={shortText}
                onChange={(e) => onEditorChange({ shortText: e.target.value })}
                placeholder="Short message shown with the Hail"
              />
            </label>
          </section>

          <Region
            as="section"
            regionId="delivery_policy_route_editor"
            className="grid gap-3 sm:grid-cols-3"
            data-hails-studio-route-row
          >
            <div className="space-y-1">
              <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">From</p>
              <p className="text-ca-sm font-medium text-[color:var(--ca-text-primary)]" data-hails-studio-source>
                {roomLabel(sourceArea)}
              </p>
            </div>
            <label className="flex flex-col gap-1 text-ca-sm text-[color:var(--ca-text-secondary)]">
              To
              <select
                className="ca-focusable rounded-md border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface)] px-3 py-2 text-ca-sm"
                value={destinationArea}
                onChange={(e) => handleDestinationChange(e.target.value)}
                data-hails-studio-destination
              >
                {knownRooms.map((room) => (
                  <option key={room} value={room}>
                    {roomLabel(room)}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1">
              <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-text-muted)]">Delivery</p>
              <p className="text-ca-sm text-[color:var(--ca-text-primary)]" data-hails-studio-delivery>
                {deliveryLabel}
              </p>
            </div>
          </Region>

          {saveError ? <ComposerSaveErrors title="Could not save Hail" error={saveError} /> : null}

          <div className="flex flex-wrap items-center gap-3" data-hail-studio-save-row>
            <button
              type="button"
              className="ca-focusable rounded-md bg-[color:var(--ca-brand-600)] px-5 py-2.5 text-ca-sm font-medium text-[color:var(--ca-on-brand)] disabled:opacity-50"
              disabled={!dirty || savePending || saveBlocked}
              onClick={onSave}
              data-hail-studio-save
            >
              {savePending ? "Saving…" : "Save Hail"}
            </button>
            {dirty && !savePending ? (
              <p className="text-ca-2xs text-[color:var(--ca-text-muted)]" role="status">
                Unsaved changes
              </p>
            ) : null}
            {saveBlocked ? (
              <p className="text-ca-2xs text-[color:var(--ca-status-warning-fg)]">Fix route validation before saving.</p>
            ) : null}
          </div>
        </div>
      </div>
    </Region>
  );
}
