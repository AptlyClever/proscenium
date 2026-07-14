import type { CSSProperties, ReactNode } from "react";
import {
  authoringPackageEffectLayerClass,
  authoringPackageEffectLayerRegionClass,
  authoringPackageGlyphLayerClass,
  authoringPackageGlyphLayerRegionClass,
  authoringPackageRootClass,
} from "../hailAuthoringPackage";
import { HailTransporterCanvasLayer } from "./HailTransporterCanvasLayer";
import type { RegistryPreviewPhase, RegistryPreviewPlan } from "../hailRegistryPreviewTypes";
import {
  regionPercentStyle,
  resolveEffectLayerRegion,
  resolveTransporterBeamAnchor,
  type HailLayoutRegions,
} from "../hailPaintboxLayoutRegions";
import { resolveGlyphArtRegion } from "../hailGlyphArtLayout";
import { authoringNeutralMessageStyle } from "../hailAuthoringColorScope";
import { HailPresentationOverlay } from "./HailPresentationOverlay";
import { breakoutEmergenceStyle, HailPresentationStage, type PresentationTemplatePayload } from "./HailPresentationStage";

type HailPackagePreviewLayersProps = {
  loopKey: number;
  glyphMotionClass: string;
  showEffectLayer: boolean;
  showGlyphLayer: boolean;
  glyphArtwork: ReactNode;
  transporterCanvasPreview: boolean;
  transporterCanvasTuning: {
    variationProfile: string;
    beamIntensity: number;
    beamScale: number;
  } | null;
  registryPreviewPhase: RegistryPreviewPhase;
  registryPlan: RegistryPreviewPlan | null;
  previewPaletteId: string;
  sizeTier: string;
  particleLayer: ReactNode;
  layoutRegions?: HailLayoutRegions | null;
  messageText?: string;
  showMessageLayer?: boolean;
  messageClassName?: string;
  messageEntranceStyle?: string;
  scrimStyle?: CSSProperties;
  messagePlateStyle?: CSSProperties;
  showPresentationLayers?: boolean;
  authoringColorScope?: boolean;
  /** Canonical design view — scale ink for operator judgment (GHAP6); not TV delivery. */
  judgmentInkScale?: boolean;
  presentationTemplate?: PresentationTemplatePayload | null;
};

/**
 * Package-first layer stack — Glyph and Effect share one binding box.
 * Layer chips toggle visibility; package geometry does not move.
 */
export function HailPackagePreviewLayers({
  loopKey,
  glyphMotionClass,
  showEffectLayer,
  showGlyphLayer,
  glyphArtwork,
  transporterCanvasPreview,
  transporterCanvasTuning,
  registryPreviewPhase,
  registryPlan,
  previewPaletteId,
  sizeTier,
  particleLayer,
  layoutRegions = null,
  messageText = "",
  showMessageLayer = false,
  messageClassName = "",
  messageEntranceStyle = "fade",
  scrimStyle,
  messagePlateStyle: messagePlateStyleProp,
  showPresentationLayers = true,
  authoringColorScope = false,
  judgmentInkScale = false,
  presentationTemplate = null,
}: HailPackagePreviewLayersProps) {
  const paintBox = layoutRegions?.paint_box;
  const glyphArtStyle =
    layoutRegions && paintBox ? regionPercentStyle(resolveGlyphArtRegion(layoutRegions), paintBox) : undefined;
  const beamEnvelopeStyle =
    layoutRegions && paintBox
      ? regionPercentStyle(resolveEffectLayerRegion(layoutRegions), paintBox)
      : undefined;
  const messageBandStyle =
    layoutRegions && paintBox && showMessageLayer
      ? regionPercentStyle(layoutRegions.message_band, paintBox)
      : undefined;
  const scopedToBeamEnvelope = Boolean(beamEnvelopeStyle);
  const beamAnchor = layoutRegions
    ? resolveTransporterBeamAnchor(layoutRegions, { scopedToBeamEnvelope })
    : undefined;
  const packageStyle =
    layoutRegions && beamAnchor
      ? ({
          "--hail-package-beam-anchor-x": String(beamAnchor.x),
          "--hail-package-beam-anchor-y": String(beamAnchor.y),
        } as CSSProperties)
      : undefined;
  const plateStyle = authoringColorScope
    ? authoringNeutralMessageStyle()
    : messagePlateStyleProp;
  const breakoutProfile = presentationTemplate?.glyph_motion?.profile === "breakout_emerge";
  const emergeActive = breakoutProfile && registryPreviewPhase === "entrance";
  const glyphArtworkStyle = breakoutEmergenceStyle(emergeActive);

  return (
    <div
      key={loopKey}
      className={authoringPackageRootClass()}
      style={packageStyle}
      data-hail-package
      data-hail-glyph-focus-region
      data-hail-paintbox-glyph
      data-hail-package-layout-regions={layoutRegions ? "true" : undefined}
    >
      {showPresentationLayers && layoutRegions ? (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          data-hail-package-scrim
          style={scrimStyle}
          aria-hidden="true"
        />
      ) : null}
      <HailPresentationStage template={presentationTemplate} previewPhase={registryPreviewPhase} />
      {showEffectLayer ? (
        <div
          className={
            beamEnvelopeStyle ? authoringPackageEffectLayerRegionClass() : authoringPackageEffectLayerClass()
          }
          data-hail-effect-layer
          data-hail-effect-envelope
          data-hail-effect-layer-region={beamEnvelopeStyle ? "true" : undefined}
          style={beamEnvelopeStyle}
          aria-hidden="true"
        >
          {transporterCanvasPreview && transporterCanvasTuning ? (
            <HailTransporterCanvasLayer
              active
              phase={registryPreviewPhase}
              loopGeneration={loopKey}
              entranceMs={registryPlan?.entranceMs ?? 1900}
              exitMs={registryPlan?.exitMs ?? 1400}
              variationProfile={transporterCanvasTuning.variationProfile}
              paletteId={previewPaletteId}
              beamIntensity={transporterCanvasTuning.beamIntensity}
              beamScale={transporterCanvasTuning.beamScale}
              sizeTier={sizeTier}
              choreographyAnchors={registryPlan?.identity.choreographyAnchors}
              packageAnchor={Boolean(beamAnchor)}
              beamAnchor={beamAnchor}
            />
          ) : null}
          {particleLayer}
          <HailPresentationOverlay
            overlay={presentationTemplate?.presentation_overlay}
            previewPhase={registryPreviewPhase}
            active={showEffectLayer}
          />
        </div>
      ) : null}
      <div
        className={glyphArtStyle ? authoringPackageGlyphLayerRegionClass() : authoringPackageGlyphLayerClass()}
        data-hail-glyph-layer
        data-hail-glyph-layer-region={glyphArtStyle ? "true" : undefined}
        data-hail-glyph-art-region={layoutRegions?.glyph_art ? "true" : undefined}
        data-hail-glyph-layer-visible={showGlyphLayer ? "true" : "false"}
        style={glyphArtStyle}
        aria-hidden={showGlyphLayer ? undefined : true}
      >
        <div
          className={`flex h-full w-full items-center justify-center ${glyphMotionClass} ${
            emergeActive ? "hail-presentation-breakout-emerge" : ""
          }`.trim()}
          data-hail-glyph-artwork
          data-hail-glyph-region-fill={glyphArtStyle ? "true" : undefined}
          data-hail-glyph-judgment-ink={judgmentInkScale ? "true" : undefined}
          data-hail-glyph-artwork-hidden={showGlyphLayer ? undefined : "true"}
          data-hail-presentation-breakout={breakoutProfile ? "true" : undefined}
          style={glyphArtworkStyle}
        >
          {showGlyphLayer ? glyphArtwork : null}
        </div>
      </div>
      {messageBandStyle && messageText ? (
        <div
          data-hail-message-plate
          className="pointer-events-none absolute z-[2] flex items-center justify-center"
          style={{
            ...messageBandStyle,
            background: "transparent",
            border: "none",
            boxShadow: "none",
          }}
        >
          <p
            data-hail-paintbox-message
            data-hail-message-layer
            data-hail-package-message-band
            data-hail-message-entrance-style={messageEntranceStyle}
            className={`m-0 flex max-w-full items-center justify-center px-2 py-1 text-center ${messageClassName}`.trim()}
            style={showPresentationLayers ? plateStyle : undefined}
          >
            {messageText}
          </p>
        </div>
      ) : null}
    </div>
  );
}
