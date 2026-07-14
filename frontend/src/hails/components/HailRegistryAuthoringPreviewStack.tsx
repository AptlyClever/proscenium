import { useEffect, useMemo, useState } from "react";
import type { ComposerGlyphSpec, EffectRegistryEntry, GlyphCatalogEntry } from "../../api";
import type { DeliveryRoute } from "../hailDeliveryRoutes";
import { resolvePreviewSizing } from "../hailPreviewSizing";
import type { HailVisualFields } from "../hailVisualContract";
import type { AuthoringPreviewScaleMode, HailAuthoringIntent } from "../hailAuthoringIntent";
import type { AuthoringGlyphDeliveryView } from "../hailAuthoritativeGlyphRender";
import { authoringPreviewMessage, authoringPreviewScaleModeForSurface } from "../hailAuthoringIntent";
import {
  hailAuthoringPreviewDimensions,
  hailAuthoringPreviewLoadoutGridClass,
} from "../hailAuthoringPreviewLayout";
import { HailAuthoringPreviewControls } from "./HailAuthoringPreviewControls";
import { HailPaintboxPreview } from "./HailPaintboxPreview";
import { HailPreviewSizingBadge } from "./HailPreviewSizingBadge";
import { HailSimulationControls } from "./HailSimulationControls";
import type { RegistrySimulationState } from "../hailRegistryPreviewRenderer";

export type HailRegistryAuthoringPreviewSurface = "studio" | "forge" | "new";

export type HailRegistryAuthoringPreviewStackProps = {
  surface: HailRegistryAuthoringPreviewSurface;
  shortText: string;
  glyphId: string;
  glyphLabel: string;
  visual: HailVisualFields;
  registryEntry: EffectRegistryEntry | null;
  effectsPreviewEnabled: boolean;
  onEffectsPreviewEnabledChange?: (enabled: boolean) => void;
  animationEnabled?: boolean;
  transitionStyle?: string;
  customGlyph?: ComposerGlyphSpec | null;
  customGlyphs?: ComposerGlyphSpec[];
  glyphCatalog?: GlyphCatalogEntry[];
  archived?: boolean;
  enabled?: boolean;
  authoringIntent?: HailAuthoringIntent;
  glyphPreviewEnabled?: boolean;
  onGlyphPreviewEnabledChange?: (enabled: boolean) => void;
  messagePreviewEnabled?: boolean;
  onMessagePreviewEnabledChange?: (visible: boolean) => void;
  shellPreviewEnabled?: boolean;
  onShellPreviewEnabledChange?: (visible: boolean) => void;
  glyphFamilyLabel?: string | null;
  onReEncode?: () => void;
  actionBusy?: boolean;
  previewRoomId?: string | null;
  deliveryRoutes?: DeliveryRoute[];
};

/**
 * Canonical registry-faithful preview stack for Hails edit and Hail Forge authoring workspaces.
 * Fixed viewport on top; standard chip strip below (chip set per authoring intent).
 */
export function HailRegistryAuthoringPreviewStack({
  surface,
  shortText,
  glyphId,
  glyphLabel,
  visual,
  registryEntry,
  effectsPreviewEnabled,
  onEffectsPreviewEnabledChange,
  animationEnabled = true,
  transitionStyle = "fade",
  customGlyph = null,
  customGlyphs,
  glyphCatalog,
  archived,
  enabled = true,
  authoringIntent = "compose",
  glyphPreviewEnabled = true,
  onGlyphPreviewEnabledChange,
  messagePreviewEnabled = true,
  onMessagePreviewEnabledChange,
  shellPreviewEnabled = true,
  onShellPreviewEnabledChange,
  onReEncode,
  actionBusy = false,
  previewRoomId = null,
  deliveryRoutes,
}: HailRegistryAuthoringPreviewStackProps) {
  const previewScaleMode: AuthoringPreviewScaleMode = authoringPreviewScaleModeForSurface({
    intent: authoringIntent,
  });
  const previewSizing = useMemo(
    () => resolvePreviewSizing({ previewRoomId, deliveryRoutes }),
    [deliveryRoutes, previewRoomId],
  );
  const previewMessage = authoringPreviewMessage({
    intent: authoringIntent,
    draftLabel: shortText,
  });
  const previewDims = hailAuthoringPreviewDimensions();
  const [simulation, setSimulation] = useState<RegistrySimulationState | null>(null);
  const [glyphDeliveryView, setGlyphDeliveryView] = useState<AuthoringGlyphDeliveryView>("canonical");
  const [glyphDeliveryLabel, setGlyphDeliveryLabel] = useState<string | null>(null);
  const customGlyphSelected = glyphId.startsWith("custom-");
  const showSimulationControls = authoringIntent === "compose" && surface === "studio" && effectsPreviewEnabled;

  useEffect(() => {
    setGlyphDeliveryView("canonical");
    setGlyphDeliveryLabel(null);
  }, [glyphId]);

  const previewRegionProps =
    surface === "studio"
      ? { "data-hail-studio-preview": true as const }
      : surface === "new"
        ? { "data-hails-new-preview": true as const }
        : { "data-hail-forge-preview": true as const };

  const showChips =
    Boolean(onEffectsPreviewEnabledChange) ||
    Boolean(onGlyphPreviewEnabledChange) ||
    Boolean(onMessagePreviewEnabledChange) ||
    Boolean(onShellPreviewEnabledChange) ||
    Boolean(onReEncode);

  return (
    <div
      className="relative flex w-full min-w-0 shrink-0 flex-col gap-2"
      data-hail-registry-authoring-preview-stack
      data-hail-authoring-surface={surface}
      data-hail-registry-authoring-preview-surface={surface}
      data-hail-authoring-intent={authoringIntent}
      data-hail-authoring-scale-mode={previewScaleMode}
      {...previewRegionProps}
    >
      <div
        className="relative shrink-0"
        data-hail-authoring-preview-viewport
        style={{
          width: previewDims.width,
          height: previewDims.height,
          minWidth: previewDims.width,
          minHeight: previewDims.height,
        }}
      >
        {authoringIntent === "compose" ? (
          <div className="absolute inset-x-0 top-0 z-[2] flex flex-col items-center gap-1 px-2 pt-1.5">
            <HailPreviewSizingBadge sizing={previewSizing} />
            {glyphDeliveryLabel ? (
              <span
                className="rounded-full border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)]/90 px-2 py-0.5 text-ca-2xs text-[color:var(--ca-text-muted)]"
                data-hail-glyph-delivery-honesty
              >
                {glyphDeliveryLabel}
              </span>
            ) : null}
          </div>
        ) : glyphDeliveryLabel ? (
          <div className="absolute inset-x-0 top-0 z-[2] flex justify-center px-2 pt-1.5">
            <span
              className="rounded-full border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)]/90 px-2 py-0.5 text-ca-2xs text-[color:var(--ca-text-muted)]"
              data-hail-glyph-delivery-honesty
            >
              {glyphDeliveryLabel}
            </span>
          </div>
        ) : null}
        <HailPaintboxPreview
          shortText={previewMessage}
          glyphId={glyphId}
          glyphLabel={glyphLabel}
          visual={visual}
          customGlyph={customGlyph}
          customGlyphs={customGlyphs}
          glyphCatalog={glyphCatalog}
          animationEnabled={animationEnabled}
          transitionStyle={transitionStyle}
          variant="studio"
          archived={archived}
          enabled={enabled}
          heroPreview
          fillLoadoutRow
          registryHonestPreview
          registryEntry={registryEntry}
          effectsPreviewEnabled={effectsPreviewEnabled}
          googleTvParity
          authoringIntent={authoringIntent}
          authoringScaleMode={previewScaleMode}
          glyphDeliveryView={glyphDeliveryView}
          glyphPreviewEnabled={glyphPreviewEnabled}
          messagePreviewEnabled={messagePreviewEnabled}
          shellPreviewEnabled={shellPreviewEnabled}
          previewRoomId={previewRoomId}
          deliveryRoutes={deliveryRoutes}
          onSimulationChange={showSimulationControls ? setSimulation : undefined}
          onGlyphDeliveryLabelChange={setGlyphDeliveryLabel}
        />
      </div>
      {showChips ? (
        <div className="flex min-w-0 flex-col gap-1.5" data-hail-authoring-preview-chips-row>
          <HailAuthoringPreviewControls
            surface={surface === "new" ? "studio" : surface === "forge" ? "forge" : "studio"}
            intent={authoringIntent}
            effectsEnabled={effectsPreviewEnabled}
            onEffectsEnabledChange={onEffectsPreviewEnabledChange}
            glyphVisible={glyphPreviewEnabled}
            onGlyphVisibleChange={onGlyphPreviewEnabledChange}
            messageVisible={messagePreviewEnabled}
            onMessageVisibleChange={onMessagePreviewEnabledChange}
            shellVisible={shellPreviewEnabled}
            onShellVisibleChange={onShellPreviewEnabledChange}
            glyphDeliveryView={glyphDeliveryView}
            onGlyphDeliveryViewChange={customGlyphSelected ? setGlyphDeliveryView : undefined}
            customGlyphSelected={customGlyphSelected}
            onReEncode={onReEncode}
            actionBusy={actionBusy}
            recipeLabel={null}
          />
          {showSimulationControls && simulation ? (
            <HailSimulationControls simulation={simulation} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { hailAuthoringPreviewLoadoutGridClass as hailAuthoringPreviewLoadoutGridClassForIntent };
