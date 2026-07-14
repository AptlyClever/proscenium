import { useMemo, useRef, useEffect, type CSSProperties, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { deriveHailPreview, type EffectRegistryEntry } from "../../api";
import { displayPlacementId, displaySizeTier, visualPresentationSummary } from "../hailComposerLabels";
import { effectPreviewPaletteIdForVisual, glyphPaletteIdForVisual } from "../hailEffectVariations";
import {
  authoringGlyphPaletteIdFromLoadout,
  authoringNeutralStageChromeVars,
} from "../hailAuthoringColorScope";
import { humanPreviewFetchStatus, humanValidationStatus } from "../hailOperatorCopy";
import { resolvePaintboxPreviewEffect } from "../hailPaintboxPreviewEffects";
import { resolveRegistryHonestPreview } from "../hailEffectRegistryPreview";
import {
  resolveAuthoringPreviewLoopTiming,
  useRegistrySimulation,
  type RegistryPreviewPlan,
  type RegistrySimulationState,
} from "../hailRegistryPreviewRenderer";
import { resolveMessageSidekickPreviewStyle } from "../hailMessageSidekick";
import { resolveTransporterCanvasTuning } from "../hailRegistryPreviewModules";
import { messagePlateStyle, packageScrimStyle, AUTHORING_NEUTRAL_GRID_PRESENTATION } from "../hailPalettePresentation";
import {
  resolveEffectivePalettePresentation,
} from "../hailPresentationRegistry";
import { HailPackagePreviewLayers } from "./HailPackagePreviewLayers";
import type { PresentationTemplatePayload } from "./HailPresentationStage";
import type { HailEffectPreset } from "../hailEffectsGallery";
import { HailConsumerGlyph } from "../hailConsumerGlyph";
import {
  customGlyphsOverlayRecord,
  type AuthoringGlyphDeliveryView,
  glyphDeliveryHonestyLabel,
  resolvePaintboxGlyphRender,
} from "../hailAuthoritativeGlyphRender";
import { isGoogleTvEffectDeliverable } from "../hailConsumerRender";
import type { GlyphRenderPayload } from "../hailConsumerRender";
import {
  PAINTBOX_TIERS,
  type ComposerGlyphSpec,
} from "../hailGlyphComposer";
import type { DeliveryRoute } from "../hailDeliveryRoutes";
import { resolvePreviewSizing } from "../hailPreviewSizing";
import { visualFieldsToRecord, type HailVisualFields } from "../hailVisualContract";
import type { GlyphCatalogEntry } from "../hailGlyphRegistry";
import { packageAccentWashFromVisual } from "../hailPackageAccentWash";
import { hailAuthoringGlyphScaleForPreview } from "../hailAuthoringPreviewLayout";
import {
  authoringPreviewPackageAnchorStyle,
  authoringPreviewPackageLayout,
  extractPackageLayoutFromPayload,
  packageLayoutForAuthoringPreview,
  paintBoxScreenPercentStyle,
  resolveHailPackageLayout,
} from "../hailPaintboxLayoutRegions";
import type { AuthoringPreviewScaleMode, HailAuthoringIntent } from "../hailAuthoringIntent";
import {
  authoringTierEnvelopePct,
} from "../hailAuthoringTierEnvelope";
import {
  authoringPaintboxCenterAnchorStyle,
  authoringPaintboxChromeMode,
  authoringPaintboxClusterClass,
  authoringPaintboxHeroClass,
  authoringPaintboxPackageClusterClass,
  authoringPaintboxPackageHeroClass,
  authoringPaintboxProfileBoxClass,
  authoringPaintboxStageShellClass,
  authoringPaintboxUsesAuthoritativePackageLayout,
  authoringPaintboxUsesCenteredCluster,
  authoringPaintboxUsesPlacementAnchor,
  paintboxPlacementAnchorStyle,
} from "../hailAuthoringPaintboxChrome";

export type HailPaintboxPreviewProps = {
  shortText: string;
  glyphId: string;
  glyphLabel: string;
  glyphStatusNote?: string | null;
  visual: HailVisualFields;
  customGlyph?: ComposerGlyphSpec | null;
  customGlyphs?: ComposerGlyphSpec[];
  glyphCatalog?: GlyphCatalogEntry[];
  animationEnabled?: boolean;
  transitionStyle?: string;
  effectPresetId?: string | null;
  activeEffectPreset?: HailEffectPreset | null;
  presentationStyleLabel?: string | null;
  presentationSummary?: string;
  hasEffectPreset?: boolean;
  variant?: "composer" | "profile" | "new" | "studio";
  size?: "default" | "expanded" | "hero";
  archived?: boolean;
  enabled?: boolean;
  headerActions?: ReactNode;
  proofCaption?: ReactNode;
  /** Compact preview (New Hail modal). */
  tight?: boolean;
  /** Studio edit — large hero glyph, top of loadout band. */
  heroPreview?: boolean;
  /** Stretch preview box to match adjacent loadout column height. */
  fillLoadoutRow?: boolean;
  /** Browse proof — honor registry-honest preview semantics. */
  registryHonestPreview?: boolean;
  registryEntry?: EffectRegistryEntry | null;
  effectsPreviewEnabled?: boolean;
  registryHonestyLabel?: string | null;
  /** Google TV parity — preview matches Arcade / Master Bedroom delivery (default with registry-honest). */
  googleTvParity?: boolean;
  /** Forge / studio preview intent — filters chrome; same consumer payload. */
  authoringIntent?: HailAuthoringIntent;
  /** Glyph Forge scale within fixed paintbox — design (legibility) vs delivery (TV-size / compose). */
  authoringScaleMode?: AuthoringPreviewScaleMode;
  /** Glyph delivery view — canonical hero vs TV overlay projection (step 19 honesty). */
  glyphDeliveryView?: AuthoringGlyphDeliveryView;
  glyphPreviewEnabled?: boolean;
  messagePreviewEnabled?: boolean;
  shellPreviewEnabled?: boolean;
  /** Destination room for WYSIWYG sizing (defaults from delivery routes). */
  previewRoomId?: string | null;
  deliveryRoutes?: DeliveryRoute[];
  onSimulationChange?: (simulation: RegistrySimulationState | null) => void;
  /** Overlay honesty chip in authoring preview stack (parent owns viewport chrome). */
  onGlyphDeliveryLabelChange?: (label: string | null) => void;
};

export function HailPaintboxPreview({
  shortText,
  glyphId,
  glyphLabel,
  glyphStatusNote = null,
  visual,
  customGlyph,
  customGlyphs,
  animationEnabled = true,
  transitionStyle = "fade",
  effectPresetId = null,
  activeEffectPreset = null,
  presentationStyleLabel = null,
  presentationSummary = "",
  hasEffectPreset = false,
  variant = "composer",
  size = "default",
  archived = false,
  enabled = true,
  headerActions,
  proofCaption,
  tight = false,
  heroPreview = false,
  fillLoadoutRow = false,
  registryHonestPreview = false,
  registryEntry = null,
  effectsPreviewEnabled = true,
  registryHonestyLabel = null,
  googleTvParity,
  authoringIntent = "compose",
  authoringScaleMode = "delivery",
  glyphDeliveryView = "canonical",
  glyphPreviewEnabled = true,
  messagePreviewEnabled = true,
  shellPreviewEnabled = true,
  previewRoomId = null,
  deliveryRoutes,
  onSimulationChange,
  onGlyphDeliveryLabelChange,
}: HailPaintboxPreviewProps) {
  const tier = PAINTBOX_TIERS[visual.scale] ?? PAINTBOX_TIERS.medium;
  const tvParity = googleTvParity ?? registryHonestPreview;
  const hasGlyph = Boolean(glyphId) && glyphId !== "custom-pending";
  const isGlyphFocus = authoringIntent === "glyph";
  const isEffectFocus = authoringIntent === "effect";
  const showGlyphLayer = hasGlyph && glyphPreviewEnabled;
  const showMessageLayer = messagePreviewEnabled;
  const showEmptyPlaceholder = !hasGlyph && !isEffectFocus;

  const isProfile = variant === "profile";
  const isNew = variant === "new";
  const isStudio = variant === "studio";
  const isMinimal = isProfile || isNew || isStudio;
  const isCleanStage = isNew || isStudio;

  const previewBody = useMemo(() => {
    const visualRecord = visualFieldsToRecord(visual);
    const roomId = previewRoomId?.trim();
    if (roomId) {
      visualRecord.preview_room_id = roomId;
    }
    const record: {
      name: string;
      message: { short_text: string };
      icon: { kind: string; value: string };
      enabled: boolean;
      visual: Record<string, unknown>;
      delivery_policy?: { routes: DeliveryRoute[] };
    } = {
      name: "Composer preview",
      message: { short_text: shortText || "Preview message" },
      icon: { kind: "glyph", value: hasGlyph ? glyphId : "default" },
      enabled: true,
      visual: visualRecord,
    };
    if (deliveryRoutes?.length) {
      record.delivery_policy = { routes: deliveryRoutes };
    }
    return record;
  }, [deliveryRoutes, glyphId, hasGlyph, previewRoomId, shortText, visual]);

  const derivePreviewRequest = useMemo(() => {
    const request: {
      record: typeof previewBody;
      custom_glyphs?: Record<string, ComposerGlyphSpec>;
    } = { record: previewBody };
    const overlays = customGlyphsOverlayRecord(customGlyphs, customGlyph);
    if (overlays) {
      request.custom_glyphs = overlays;
    }
    return request;
  }, [customGlyph, customGlyphs, previewBody]);

  const previewQueryKey = useMemo(
    () => ["composer-paintbox-preview", derivePreviewRequest] as const,
    [derivePreviewRequest],
  );

  const previewQ = useQuery({
    queryKey: previewQueryKey,
    queryFn: () => deriveHailPreview(derivePreviewRequest),
    staleTime: 0,
    placeholderData: (previousData) => previousData,
  });

  const payload = previewQ.data?.render_payload;
  const presentationTemplate = useMemo((): PresentationTemplatePayload | null => {
    const row = payload?.presentation_template;
    return row && typeof row === "object" ? (row as PresentationTemplatePayload) : null;
  }, [payload?.presentation_template]);
  const previewSizing = useMemo(
    () =>
      resolvePreviewSizing({
        previewRoomId,
        deliveryRoutes,
        visual,
        payloadDisplayClass: payload?.display_class,
      }),
    [deliveryRoutes, previewRoomId, visual, payload?.display_class],
  );
  const layoutDisplayClass = previewSizing.displayClass;
  const layoutPriorityLevel = visual.priorityLevel;
  const glyphRender = useMemo(
    () => resolvePaintboxGlyphRender(payload, glyphId, glyphDeliveryView),
    [glyphDeliveryView, glyphId, payload],
  );
  const glyphDeliveryLabel = useMemo(
    () => glyphDeliveryHonestyLabel(glyphDeliveryView, payload),
    [glyphDeliveryView, payload],
  );
  useEffect(() => {
    onGlyphDeliveryLabelChange?.(glyphDeliveryLabel);
  }, [glyphDeliveryLabel, onGlyphDeliveryLabelChange]);
  const lastGlyphRenderRef = useRef<GlyphRenderPayload | null>(null);
  useEffect(() => {
    if (glyphRender) {
      lastGlyphRenderRef.current = glyphRender;
    }
  }, [glyphRender]);
  const displayGlyphRender = glyphRender ?? lastGlyphRenderRef.current;
  const glyphPending = previewQ.isFetching && !displayGlyphRender && hasGlyph;
  const tvEffectDeliverable = isGoogleTvEffectDeliverable(payload);
  const tvEffectSuppressed = tvParity && Boolean(payload) && !tvEffectDeliverable;
  const effectiveEffectsPreview = effectsPreviewEnabled && !tvEffectSuppressed;

  const previewEffect = useMemo(
    () =>
      registryHonestPreview
        ? resolveRegistryHonestPreview(visual, registryEntry, {
            animationEnabled,
            effectsPreviewEnabled: effectiveEffectsPreview,
            transitionStyle,
          })
        : resolvePaintboxPreviewEffect(
            effectPresetId,
            activeEffectPreset,
            visual,
            animationEnabled,
            transitionStyle,
          ),
    [
      activeEffectPreset,
      animationEnabled,
      effectPresetId,
      effectiveEffectsPreview,
      registryEntry,
      registryHonestPreview,
      transitionStyle,
      visual,
    ],
  );

  const registryPlan: RegistryPreviewPlan | null =
    registryHonestPreview && previewEffect.phasedPreview ? previewEffect.registryPlan ?? null : null;

  const authoringColorScope = registryHonestPreview && isCleanStage;

  const glyphPaletteId = useMemo(
    () =>
      authoringColorScope
        ? authoringGlyphPaletteIdFromLoadout(visual.paletteId)
        : glyphPaletteIdForVisual(visual),
    [authoringColorScope, visual],
  );

  const effectPaletteId = useMemo(
    () => effectPreviewPaletteIdForVisual(visual, registryEntry),
    [registryEntry, visual],
  );

  const packagePalettePresentation = useMemo(
    () =>
      authoringColorScope
        ? AUTHORING_NEUTRAL_GRID_PRESENTATION
        : resolveEffectivePalettePresentation({
            paletteId: effectPaletteId,
            priorityLevel: visual.priorityLevel,
            payloadPresentation:
              (payload?.palette_presentation as Record<string, unknown> | undefined) ?? null,
            accentWash: payload?.palette_presentation
              ? null
              : packageAccentWashFromVisual(visual),
          }),
    [authoringColorScope, effectPaletteId, payload?.palette_presentation, visual],
  );

  const packageScrimPresentationStyle = useMemo(
    () => packageScrimStyle(packagePalettePresentation),
    [packagePalettePresentation],
  );

  const packageMessagePlateStyle = useMemo(
    () =>
      authoringColorScope ? undefined : messagePlateStyle(packagePalettePresentation),
    [authoringColorScope, packagePalettePresentation],
  );

  const effectId = String(payload?.effect_id ?? visual.effectId);
  const friendlySummary = visualPresentationSummary(visual);

  const isRegistryPackageSurface =
    registryHonestPreview && (isCleanStage || isProfile) && !showEmptyPlaceholder;
  const usePlacementAnchor = authoringPaintboxUsesPlacementAnchor({
    isCleanStage,
    registryHonestPreview,
    authoringIntent,
  });
  const useCenteredCluster = authoringPaintboxUsesCenteredCluster({
    isCleanStage,
    registryHonestPreview,
    authoringIntent,
  });
  const isTightClean = isCleanStage && tight && !heroPreview;
  const isHeroClean = isCleanStage && heroPreview;
  const fillRow = isHeroClean && fillLoadoutRow;
  const lockedAuthoringViewport = fillRow;
  const packageLayout = useMemo(() => {
    const layoutOptions = {
      effectId: visual.effectId,
      effectFootprintProfile: visual.effectFootprintProfile,
      footprintScale: Number.isFinite(Number(visual.effectTuning?.footprint_scale))
        ? Number(visual.effectTuning.footprint_scale)
        : undefined,
    };
    if (isRegistryPackageSurface && hasGlyph && lockedAuthoringViewport) {
      return authoringPreviewPackageLayout({
        scaleMode: authoringScaleMode,
        sizeTier: visual.scale,
        centeredCluster: useCenteredCluster,
        displayClass: layoutDisplayClass,
        priorityLevel: layoutPriorityLevel,
        ...layoutOptions,
      });
    }
    const fromPayload = extractPackageLayoutFromPayload(payload);
    const base =
      fromPayload ??
      (isRegistryPackageSurface && hasGlyph
        ? extractPackageLayoutFromPayload(
            resolveHailPackageLayout({
              placementId: visual.placementId,
              placementMode: visual.placementMode,
              sizeTier: visual.scale,
              xPercent: Number(visual.xPercent),
              yPercent: Number(visual.yPercent),
              displayClass: layoutDisplayClass,
              priorityLevel: layoutPriorityLevel,
              ...layoutOptions,
            }),
          )
        : null);
    return packageLayoutForAuthoringPreview({
      layout: base,
      scaleMode: authoringScaleMode,
      centeredCluster: useCenteredCluster,
      sizeTier: visual.scale,
      displayClass: layoutDisplayClass,
      priorityLevel: layoutPriorityLevel,
      ...layoutOptions,
    });
  }, [
    authoringScaleMode,
    hasGlyph,
    isRegistryPackageSurface,
    layoutDisplayClass,
    layoutPriorityLevel,
    lockedAuthoringViewport,
    payload,
    useCenteredCluster,
    visual.effectFootprintProfile,
    visual.effectId,
    visual.effectTuning,
    visual.placementId,
    visual.placementMode,
    visual.scale,
    visual.xPercent,
    visual.yPercent,
  ]);
  const usesAuthoritativePackageLayout = authoringPaintboxUsesAuthoritativePackageLayout({
    isRegistryPackageSurface,
    hasGlyph,
    hasLayoutRegions: Boolean(packageLayout?.regions),
  });
  const showProofSurface = isProfile || isStudio;
  const isExpanded = size === "expanded";
  const isHero = size === "hero";
  const displayMessage = shortText.trim() || (isMinimal ? "Your message" : "Your message");

  const heroMessageClass =
    "max-w-[9.5rem] line-clamp-2 text-center text-ca-2xs leading-snug text-[color:var(--hail-paintbox-message,var(--ca-text-muted))] opacity-90";

  const chromeMode = authoringPaintboxChromeMode({
    isCleanStage,
    authoringIntent,
    shellPreviewEnabled,
  });
  const stageShellClass = isCleanStage ? authoringPaintboxStageShellClass(chromeMode) : "";

  const studioLivePreview = isStudio && registryHonestPreview;
  const profileEffectsOff = (isProfile || studioLivePreview) && !effectiveEffectsPreview;
  const suppressMotion = (isCleanStage && !registryHonestPreview) || profileEffectsOff;

  const motionActive =
    !suppressMotion && animationEnabled && effectId !== "none" && !previewEffect.reducedMotion;
  const simulationStableHoldMs =
    authoringIntent === "compose" && Number(visual.durationMs) >= 1000
      ? Number(visual.durationMs)
      : undefined;
  const simulation = useRegistrySimulation(registryPlan, motionActive, {
    stableHoldMs: simulationStableHoldMs,
  });
  const { phase: registryPreviewPhase, loopGeneration: registryLoopGeneration } = simulation;

  useEffect(() => {
    if (!onSimulationChange) {
      return;
    }
    if (!motionActive || !registryPlan || registryPlan.static) {
      onSimulationChange(null);
      return;
    }
    onSimulationChange(simulation);
  }, [
    motionActive,
    onSimulationChange,
    registryPlan,
    simulation,
    simulation.paused,
    simulation.phase,
    simulation.loopGeneration,
  ]);
  const studioGlyphMotion = studioLivePreview && motionActive && !previewEffect.phasedPreview;
  const useSingleSurface = isCleanStage && (!studioLivePreview || suppressMotion);

  const profileStageFrame =
    "relative mx-auto w-full overflow-hidden rounded-2xl border-2 border-[color:var(--ca-surface-border)] bg-gradient-to-b from-[color:var(--ca-surface-inset)] via-[color:var(--ca-surface-panel)]/40 to-[color:var(--ca-surface-inset)] shadow-[inset_0_2px_24px_rgba(0,0,0,0.18)]";
  const stageClassName = isCleanStage
    ? lockedAuthoringViewport || fillRow
      ? `relative h-full w-full overflow-hidden p-0 ${stageShellClass}`
      : `relative w-fit overflow-hidden p-0 ${stageShellClass}`
    : isProfile
      ? isExpanded
        ? `${profileStageFrame} aspect-[4/3] min-h-[18rem]${proofCaption ? " pb-24" : ""}`
        : isHero
          ? `${profileStageFrame} aspect-[4/3] min-h-[20rem] max-h-[28rem]${proofCaption ? " pb-28" : ""}`
          : `${profileStageFrame} aspect-[16/10] min-h-[16rem]${proofCaption ? " pb-24" : ""}`
      : "relative mx-auto aspect-video w-full max-w-lg overflow-hidden rounded-xl border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)]";

  const sizeMultiplier = isHero ? 1.45 : isExpanded ? 1.2 : 1;
  const legacyTierBoxWidthPct = Math.min(tier.widthFraction * sizeMultiplier * 100, isHero ? 76 : 68);
  const legacyTierBoxHeightPct = Math.min(tier.heightFraction * sizeMultiplier * 100, isHero ? 58 : 52);
  const tierEnvelope = authoringTierEnvelopePct(visual.scale);
  const usesTierEnvelopeBox =
    lockedAuthoringViewport && (usePlacementAnchor || useCenteredCluster);
  const boxWidthPct = usesTierEnvelopeBox
    ? tierEnvelope.widthPct
    : usePlacementAnchor || useCenteredCluster || !isCleanStage
      ? legacyTierBoxWidthPct
      : 100;
  const boxHeightPct = usesTierEnvelopeBox
    ? tierEnvelope.heightPct
    : usePlacementAnchor || useCenteredCluster || !isCleanStage
      ? legacyTierBoxHeightPct
      : 100;
  const anchorStyle = usesAuthoritativePackageLayout
    ? lockedAuthoringViewport
      ? authoringPreviewPackageAnchorStyle({
          scaleMode: authoringScaleMode,
          sizeTier: visual.scale,
          centeredCluster: useCenteredCluster,
          visual,
        })
      : paintBoxScreenPercentStyle(packageLayout!.paintBox, packageLayout!.viewport)
    : useCenteredCluster
      ? authoringPaintboxCenterAnchorStyle()
      : paintboxPlacementAnchorStyle(visual);
  const placementBoxStyle: CSSProperties = usesAuthoritativePackageLayout
    ? anchorStyle
    : {
        ...anchorStyle,
        width: `${boxWidthPct}%`,
        height: `${boxHeightPct}%`,
      };
  const tierGlyphMedallionSize =
    visual.scale === "small" ? "compact" : visual.scale === "large" ? "hero" : "standard";
  const glyphMedallionSize = lockedAuthoringViewport && isGlyphFocus
    ? "focus"
    : lockedAuthoringViewport
      ? "focus"
      : isHeroClean || isTightClean
        ? "hero"
        : isCleanStage
          ? tierGlyphMedallionSize
          : isHero
            ? "standard"
            : "standard";
  const heroFocusSize =
    lockedAuthoringViewport && isGlyphFocus
      ? "focus"
      : lockedAuthoringViewport
        ? "focus"
        : visual.scale === "small"
          ? "standard"
          : "focus";
  const consumerGlyphSize =
    isEffectFocus && !glyphPreviewEnabled
      ? "compact"
      : lockedAuthoringViewport && authoringScaleMode === "delivery"
        ? tierGlyphMedallionSize
        : isGlyphFocus && authoringScaleMode === "design"
          ? heroFocusSize
          : isGlyphFocus && authoringScaleMode === "delivery"
            ? tierGlyphMedallionSize
            : isGlyphFocus
              ? heroFocusSize
              : isHeroClean
                ? heroFocusSize
                : glyphMedallionSize;
  const glyphMotionClass =
    previewEffect.phasedPreview || !motionActive ? "" : previewEffect.glyphClass;
  const registryModuleRender = registryPlan?.moduleRender ?? null;
  const messageSidekickPreview = useMemo(() => {
    const entity = payload?.message_entity as Record<string, unknown> | undefined;
    if (!entity || typeof entity !== "object") {
      return null;
    }
    const { stableMs } = resolveAuthoringPreviewLoopTiming(registryPlan);
    return resolveMessageSidekickPreviewStyle(entity, stableMs);
  }, [payload?.message_entity, registryPlan]);
  const transporterCanvasPreview = Boolean(
    registryHonestPreview &&
      previewEffect.phasedPreview &&
      registryPlan?.effectId === "transporter" &&
      registryModuleRender?.moduleId === "transporter" &&
      motionActive,
  );
  const transporterCanvasTuning = useMemo(() => {
    if (!transporterCanvasPreview || !registryPlan) {
      return null;
    }
    const tuning = {
      ...(registryEntry?.tuning_defaults ?? {}),
      ...(visual.effectTuning ?? {}),
    };
    return resolveTransporterCanvasTuning(registryPlan, tuning);
  }, [
    registryEntry?.tuning_defaults,
    registryPlan,
    transporterCanvasPreview,
    visual.effectTuning,
  ]);
  const judgmentInkScale =
    usesAuthoritativePackageLayout && glyphDeliveryView === "canonical" && authoringScaleMode === "design";
  const registryStageStyle =
    previewEffect.phasedPreview && registryPlan
      ? ({
          "--hail-registry-entrance-ms": `${registryPlan.entranceMs}ms`,
          "--hail-registry-exit-ms": `${registryPlan.exitMs}ms`,
          ...(messageSidekickPreview?.cssVars ?? {}),
          ...(registryModuleRender?.cssVars ?? {}),
        } as CSSProperties)
      : messageSidekickPreview
        ? (messageSidekickPreview.cssVars as CSSProperties)
        : undefined;
  const stageStyle: CSSProperties | undefined =
    lockedAuthoringViewport || registryStageStyle
      ? ({
          ...(registryStageStyle ?? {}),
          ...(lockedAuthoringViewport
            ? {
                ...authoringNeutralStageChromeVars(),
                "--hail-authoring-glyph-scale": String(
                  hailAuthoringGlyphScaleForPreview({
                    sizeTier: visual.scale,
                    intent: authoringIntent,
                    scaleMode: authoringScaleMode,
                  }),
                ),
                ...(judgmentInkScale ? { "--hail-judgment-ink-scale": "1.35" } : {}),
              }
            : {}),
        } as CSSProperties)
      : registryStageStyle || authoringColorScope
        ? ({
            ...(registryStageStyle ?? {}),
            ...(authoringColorScope ? authoringNeutralStageChromeVars() : {}),
          } as CSSProperties)
        : undefined;
  const placementLabel = displayPlacementId(visual.placementId);
  const sizeLabel = displaySizeTier(visual.scale);

  const validation = previewQ.data?.validation;
  const profileStatusLabel =
    humanPreviewFetchStatus(previewQ.isFetching) ?? humanValidationStatus(validation);

  const glyphArtwork = showGlyphLayer ? (
    <HailConsumerGlyph
      glyphRender={displayGlyphRender}
      glyphId={glyphId}
      paletteId={glyphPaletteId}
      pending={glyphPending}
      size={consumerGlyphSize}
      bare={isHeroClean || isGlyphFocus}
      focusGlyph={isHeroClean || isGlyphFocus}
      regionFill={usesAuthoritativePackageLayout}
      previewPhase={registryPreviewPhase}
    />
  ) : null;

  const useHailPackage = isRegistryPackageSurface;
  const showPackageEffectLayer =
    effectiveEffectsPreview && (previewEffect.phasedPreview || visual.effectId !== "none");

  const particleLayer =
    !transporterCanvasPreview &&
    registryModuleRender &&
    registryPreviewPhase === "entrance" &&
    registryModuleRender.particleCount > 0 ? (
      <div className="absolute inset-0" data-hail-registry-particles aria-hidden="true">
        {Array.from({ length: registryModuleRender.particleCount }, (_, index) => (
          <span key={index} className="hail-registry-particle" data-hail-registry-particle-index={index} />
        ))}
      </div>
    ) : null;

  const hailPackageLayers = useHailPackage ? (
    <HailPackagePreviewLayers
      loopKey={registryLoopGeneration}
      glyphMotionClass={glyphMotionClass}
      showEffectLayer={showPackageEffectLayer}
      showGlyphLayer={showGlyphLayer}
      glyphArtwork={glyphArtwork}
      transporterCanvasPreview={transporterCanvasPreview}
      transporterCanvasTuning={transporterCanvasTuning}
      registryPreviewPhase={registryPreviewPhase}
      registryPlan={registryPlan}
      previewPaletteId={effectPaletteId}
      sizeTier={visual.scale}
      particleLayer={particleLayer}
      layoutRegions={packageLayout?.regions ?? null}
      showMessageLayer={showMessageLayer && Boolean(packageLayout?.regions)}
      messageText={displayMessage}
      messageClassName={
        usesAuthoritativePackageLayout
          ? "w-full max-w-full line-clamp-2 text-center text-ca-2xs leading-snug"
          : isHeroClean
            ? "w-full max-w-full line-clamp-2 text-center text-ca-2xs leading-snug text-[color:var(--hail-paintbox-message,var(--ca-text-muted))] opacity-90"
            : isTightClean
              ? "w-full max-w-full line-clamp-2 text-ca-2xs text-[color:var(--hail-paintbox-message,var(--ca-text-muted))] opacity-90"
              : "w-full max-w-full text-ca-xs text-[color:var(--hail-paintbox-message,var(--ca-text-muted))]"
      }
      messageEntranceStyle={messageSidekickPreview?.entranceStyle ?? "fade"}
      scrimStyle={packageScrimPresentationStyle}
      messagePlateStyle={packageMessagePlateStyle}
      showPresentationLayers={usesAuthoritativePackageLayout}
      authoringColorScope={authoringColorScope}
      judgmentInkScale={judgmentInkScale}
      presentationTemplate={presentationTemplate}
    />
  ) : null;

  const legacyGlyphRegion = (
    <div className={`relative ${glyphMotionClass}`} data-hail-paintbox-glyph data-hail-glyph-focus-region>
      {particleLayer}
      {glyphArtwork}
    </div>
  );

  const authoringClusterBody = (
    <>
      <div
        className={
          usesAuthoritativePackageLayout
            ? authoringPaintboxPackageHeroClass()
            : authoringPaintboxHeroClass()
        }
        data-hail-paintbox-hero
        data-hail-package-hero={usesAuthoritativePackageLayout ? "true" : undefined}
      >
        {useHailPackage ? hailPackageLayers : legacyGlyphRegion}
      </div>
      {showMessageLayer &&
      !usesAuthoritativePackageLayout &&
      !isRegistryPackageSurface &&
      !(registryHonestPreview && isCleanStage) ? (
        <p
          data-hail-paintbox-message
          data-hail-registry-message-reveal={registryModuleRender?.messageRevealStyle}
          className={
            isCleanStage
              ? isHeroClean
                ? `${heroMessageClass} shrink-0`
                : `max-w-full shrink-0 text-center leading-snug ${
                    isTightClean
                      ? "line-clamp-2 text-ca-2xs text-[color:var(--hail-paintbox-message,var(--ca-text-muted))] opacity-90"
                      : "text-ca-xs text-[color:var(--hail-paintbox-message,var(--ca-text-muted))]"
                  }`
              : "max-w-[92%] shrink-0 truncate text-center text-ca-sm font-semibold leading-snug text-[color:var(--ca-text-primary)]"
          }
        >
          {displayMessage}
        </p>
      ) : null}
    </>
  );

  return (
    <div
      className={
        isCleanStage
          ? lockedAuthoringViewport
            ? "h-full w-full"
            : fillRow
              ? "h-full w-fit"
              : "w-fit"
          : isMinimal
            ? "space-y-2"
            : "sticky top-0 space-y-3"
      }
      data-hail-paintbox-preview
      data-hail-paintbox-variant={variant}
      data-hail-paintbox-size={size}
      data-hail-paintbox-tight={tight ? "true" : undefined}
      data-hail-paintbox-hero-preview={heroPreview ? "true" : undefined}
      data-hail-paintbox-fill-loadout-row={fillRow ? "true" : undefined}
      data-hail-authoring-intent={authoringIntent}
    >
      {!isMinimal ? (
        <header className="space-y-1">
          <p className="text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-brand-600)]">Step 4</p>
          <h4 className="text-ca-sm font-semibold text-[color:var(--ca-text-primary)]">Paintbox Preview</h4>
          <p className="text-ca-2xs text-[color:var(--ca-text-muted)]">
            Google TV preview — matches Arcade and Master Bedroom delivery.
          </p>
        </header>
      ) : isStudio && headerActions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{headerActions}</div>
      ) : isProfile && !registryHonestPreview ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-ca-2xs" data-hail-paintbox-derived-status>
            {profileStatusLabel ? (
              <span
                className={
                  profileStatusLabel === "Looks good"
                    ? "rounded-full bg-[color:var(--ca-status-success-fg)]/12 px-2 py-0.5 font-medium text-[color:var(--ca-status-success-fg)]"
                    : profileStatusLabel === "Updating preview…"
                      ? "text-[color:var(--ca-text-muted)]"
                      : "rounded-full bg-[color:var(--ca-status-warning-fg)]/12 px-2 py-0.5 font-medium text-[color:var(--ca-status-warning-fg)]"
                }
              >
                {profileStatusLabel}
              </span>
            ) : null}
            {registryHonestyLabel ? (
              <span
                className="rounded-full border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)] px-2 py-0.5 text-[color:var(--ca-text-muted)]"
                data-hail-effect-capability-honesty
              >
                {registryHonestyLabel}
              </span>
            ) : null}
          </div>
          {headerActions}
        </div>
      ) : isProfile && headerActions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{headerActions}</div>
      ) : null}

      {!isMinimal ? (
        <div
          className="space-y-2 rounded-lg border border-[color:var(--ca-surface-border)] bg-[color:var(--ca-surface-inset)]/50 p-3"
          data-hail-paintbox-summary
        >
          <dl className="grid gap-2 text-ca-2xs">
            <div>
              <dt className="text-[color:var(--ca-text-muted)]">Glyph</dt>
              <dd className="font-medium text-[color:var(--ca-text-primary)]">
                {hasGlyph ? glyphLabel : "No Glyph selected"}
              </dd>
              {glyphStatusNote ? (
                <dd className="mt-0.5 text-[color:var(--ca-text-muted)]">{glyphStatusNote}</dd>
              ) : null}
            </div>
            <div>
              <dt className="text-[color:var(--ca-text-muted)]">Presentation style</dt>
              <dd className="font-medium text-[color:var(--ca-text-primary)]">
                {presentationStyleLabel ?? (hasEffectPreset ? "Custom" : "None selected")}
              </dd>
              {presentationSummary ? (
                <dd className="mt-0.5 text-[color:var(--ca-text-muted)]">{presentationSummary}</dd>
              ) : !hasEffectPreset ? (
                <dd className="mt-0.5 text-[color:var(--ca-text-muted)]">Apply an Effect Preset or use Customize.</dd>
              ) : null}
            </div>
            <div>
              <dt className="text-[color:var(--ca-text-muted)]">Look</dt>
              <dd className="text-[color:var(--ca-text-secondary)]">{friendlySummary}</dd>
            </div>
            {hasGlyph ? (
              <div>
                <dt className="text-[color:var(--ca-text-muted)]">Motion</dt>
                <dd className="text-[color:var(--ca-text-secondary)]" data-hail-paintbox-motion-note>
                  {previewEffect.motionNote}
                  {previewEffect.reducedMotion ? (
                    <span className="ml-1 rounded bg-[color:var(--ca-surface-border)] px-1 py-0.5 text-ca-2xs uppercase tracking-wide text-[color:var(--ca-text-muted)]">
                      Reduced motion
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      <div
        className={`${stageClassName} ${hasGlyph && !isCleanStage && !suppressMotion && !previewEffect.phasedPreview ? previewEffect.stageClass : ""} ${archived || !enabled ? "opacity-75" : ""}`}
        style={stageStyle}
        data-hail-paintbox-stage
        data-hail-paintbox-single-surface={useSingleSurface ? "true" : undefined}
        data-hail-paintbox-glyph-motion={studioGlyphMotion ? "true" : undefined}
        data-hail-paintbox-proof-surface={showProofSurface && !isCleanStage ? "true" : undefined}
        data-hail-paintbox-effect={hasGlyph ? previewEffect.dataEffect : "none"}
        data-hail-paintbox-reduced-motion={suppressMotion || previewEffect.reducedMotion ? "true" : "false"}
        data-hail-paintbox-motion-active={motionActive ? "true" : "false"}
        data-hail-paintbox-registry-honest={registryHonestPreview ? "true" : undefined}
        data-hail-paintbox-google-tv-parity={tvParity ? "true" : undefined}
        data-hail-glyph-delivery-view={glyphDeliveryView}
        data-hail-preview-display-class={previewSizing.displayClass}
        data-hail-preview-room-id={previewSizing.roomId ?? undefined}
        data-hail-paintbox-tv-effect-suppressed={tvEffectSuppressed ? "true" : undefined}
        data-hail-paintbox-palette={effectPaletteId}
        data-hail-glyph-palette={glyphPaletteId}
        data-hail-registry-preview={useHailPackage || previewEffect.phasedPreview ? "true" : undefined}
        data-hail-registry-preview-phase={previewEffect.phasedPreview ? registryPreviewPhase : undefined}
        data-hail-registry-effect-id={previewEffect.phasedPreview ? visual.effectId : undefined}
        data-hail-registry-effect-module={
          previewEffect.phasedPreview ? registryModuleRender?.moduleId : undefined
        }
        data-hail-registry-glyph-resolve={
          previewEffect.phasedPreview ? registryPlan?.identity.glyphResolveStyle : undefined
        }
        data-hail-registry-field-style={
          previewEffect.phasedPreview ? registryPlan?.identity.fieldStyle : undefined
        }
        data-hail-registry-particle-style={
          previewEffect.phasedPreview ? registryPlan?.identity.particleStyle : undefined
        }
        data-hail-registry-variation={
          previewEffect.phasedPreview && registryPlan?.previewProfile
            ? registryPlan.previewProfile
            : undefined
        }
        data-hail-registry-stable-residual={
          previewEffect.phasedPreview ? registryPlan?.identity.stableResidual : undefined
        }
        data-hail-registry-canvas-preview={transporterCanvasPreview ? "true" : undefined}
      data-hail-paintbox-chrome={chromeMode}
        data-hail-authoring-scale-mode={lockedAuthoringViewport ? authoringScaleMode : undefined}
        data-hail-authoring-package-preview={
          registryHonestPreview && isCleanStage ? "true" : undefined
        }
    >
        {isProfile ? (
          <>
            <div
              className="pointer-events-none absolute inset-3 rounded-xl border border-dashed border-[color:var(--ca-surface-border)]/70"
              data-hail-paintbox-safe-zone
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2 text-ca-2xs text-[color:var(--ca-text-muted)]">
              <span className="rounded-full bg-[color:var(--ca-surface-panel)]/80 px-2 py-0.5 font-medium uppercase tracking-wide">
                Paint Box
              </span>
              <span className="rounded-full bg-[color:var(--ca-surface-panel)]/80 px-2 py-0.5">
                {sizeLabel} · {placementLabel}
              </span>
            </div>
          </>
        ) : null}
        {isProfile && archived ? (
          <p className="absolute inset-x-0 top-10 z-10 bg-[color:var(--ca-surface)]/90 px-3 py-1 text-center text-ca-2xs text-[color:var(--ca-text-muted)]">
            Archived — not sent to rooms
          </p>
        ) : null}
        {isProfile && !enabled && !archived ? (
          <p className="absolute inset-x-0 top-10 z-10 bg-[color:var(--ca-status-warning-fg)]/10 px-3 py-1 text-center text-ca-2xs text-[color:var(--ca-status-warning-fg)]">
            Off — won't appear until turned back on
          </p>
        ) : null}
        {showEmptyPlaceholder ? (
          isCleanStage ? (
            <div
              className="flex h-full w-full items-center justify-center px-2 py-2 text-center text-ca-2xs text-[color:var(--ca-text-muted)]"
              data-hail-paintbox-box
            >
              Choose an icon to preview your Hail.
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-ca-sm text-[color:var(--ca-text-muted)]">
              Choose an icon to preview your Hail.
            </div>
          )
        ) : usePlacementAnchor || useCenteredCluster ? (
          <div
            className={
              usesAuthoritativePackageLayout
                ? "absolute overflow-visible"
                : `absolute flex h-full w-full min-h-0 flex-col items-stretch justify-center`
            }
            style={placementBoxStyle}
            data-hail-paintbox-anchor={
              usesAuthoritativePackageLayout
                ? packageLayout?.paintBox.placement_id ?? visual.placementId
                : useCenteredCluster
                  ? "center"
                  : visual.placementId
            }
            data-hail-paintbox-placement-id={
              usesAuthoritativePackageLayout
                ? packageLayout?.paintBox.placement_id ?? visual.placementId
                : useCenteredCluster
                  ? "center"
                  : visual.placementId
            }
            data-hail-package-anchor={usesAuthoritativePackageLayout ? "true" : undefined}
          >
            <div
              className={
                usesAuthoritativePackageLayout
                  ? authoringPaintboxPackageClusterClass()
                  : authoringPaintboxClusterClass()
              }
              data-hail-paintbox-cluster
              data-hail-package-cluster={usesAuthoritativePackageLayout ? "true" : undefined}
            >
              {isStudio && archived ? (
                <p className="mb-2 rounded-md bg-[color:var(--ca-surface)]/90 px-2 py-1 text-center text-ca-2xs text-[color:var(--ca-text-muted)]">
                  Archived — not sent to rooms
                </p>
              ) : null}
              {isStudio && !enabled && !archived ? (
                <p className="mb-2 rounded-md bg-[color:var(--ca-status-warning-fg)]/10 px-2 py-1 text-center text-ca-2xs text-[color:var(--ca-status-warning-fg)]">
                  Off — won't appear until turned back on
                </p>
              ) : null}
              {authoringClusterBody}
            </div>
          </div>
        ) : (
          <>
            {isProfile ? (
              <span
                className="pointer-events-none absolute z-[1] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:var(--ca-brand-400)] bg-[color:var(--ca-brand-600)] shadow-[0_0_8px_color-mix(in_srgb,var(--ca-brand-400)_60%,transparent)]"
                style={anchorStyle}
                data-hail-paintbox-placement-anchor
                aria-hidden="true"
              />
            ) : null}
            <div
              className={
                usesAuthoritativePackageLayout
                  ? `relative h-full w-full min-h-0 overflow-visible ${previewEffect.cardClass}`
                  : authoringPaintboxProfileBoxClass(previewEffect.cardClass)
              }
              style={
                usesAuthoritativePackageLayout && packageLayout
                  ? paintBoxScreenPercentStyle(packageLayout.paintBox, packageLayout.viewport)
                  : placementBoxStyle
              }
              data-hail-paintbox-box
              data-hail-safe-effect-zone
              data-hail-package-anchor={usesAuthoritativePackageLayout ? "true" : undefined}
            >
              {isProfile ? (
                <span className="pointer-events-none absolute -top-5 left-0 text-ca-2xs font-medium uppercase tracking-wide text-[color:var(--ca-brand-600)]/80">
                  Effect envelope
                </span>
              ) : null}
              {authoringClusterBody}
            </div>
          </>
        )}
        {isProfile && proofCaption ? (
          <div
            className="absolute inset-x-0 bottom-0 border-t border-[color:var(--ca-surface-border)]/80 bg-[color:var(--ca-surface-panel)]/92 px-4 py-3 backdrop-blur-sm"
            data-hail-paintbox-proof-caption
          >
            {proofCaption}
          </div>
        ) : null}
      </div>
    </div>
  );
}
