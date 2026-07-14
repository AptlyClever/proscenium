/**
 * Paint Box layout regions — port of LCARD computeHailLayoutRegions + resolvePaintBoxRect.
 * Authoritative geometry for registry-honest preview comes from derive-preview render_payload.
 */
import type { CSSProperties } from "react";
import contract from "../../../config/hails/hail-render-contract.v002-beta.json";
import { resolvePaintboxTierMeta } from "./hailDisplayClass";
import { AUTHORING_PREVIEW_VIEWPORT } from "./hailAuthoringPreviewLayout";
import type { AuthoringPreviewScaleMode } from "./hailAuthoringIntent";
import {
  authoringPaintboxCenterAnchorStyle,
  paintboxPlacementAnchorStyle,
} from "./hailAuthoringPaintboxChrome";
import { AUTHORING_DELIVERY_ENVELOPE_SCALE, authoringTierEnvelopePct } from "./hailAuthoringTierEnvelope";
import type { EffectFieldRegion } from "./hailEffectFieldLayout";
import { computeEffectFieldRegion } from "./hailEffectFieldLayout";
import type { HailVisualFields } from "./hailVisualContract";

export const REFERENCE_VIEWPORT = { width: 1920, height: 1080 } as const;

export type HailLayoutRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type HailGlyphFocusRegion = HailLayoutRect & {
  center_x: number;
  center_y: number;
};

export type HailGlyphArtRegion = HailLayoutRect & {
  center_x: number;
  center_y: number;
};

export type HailLayoutRegions = {
  paint_box: HailLayoutRect;
  safe_zone: HailLayoutRect;
  glyph_focus: HailGlyphFocusRegion;
  glyph_art?: HailGlyphArtRegion;
  effect_field?: EffectFieldRegion;
  transporter_beam_envelope: HailLayoutRect & {
    center_x: number;
    center_y: number;
    top: number;
    bottom: number;
  };
  message_band: HailLayoutRect;
  message_weight?: number;
  transporter_beam_height_multiplier?: number;
  safe_zone_inset_fraction?: number;
  glyph_focus_fraction?: number;
};

export type PaintBoxScreenRect = HailLayoutRect & {
  placement_id?: string;
  paint_box_tier?: string;
};

export type HailPackageLayoutPayload = {
  reference_viewport?: { width: number; height: number };
  paint_box_screen?: PaintBoxScreenRect;
  layout_regions?: HailLayoutRegions;
};

function clamp(value: unknown, lo: number, hi: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(lo, Math.min(hi, value));
}

type RenderContract = {
  previewVisual?: {
    paintBox?: {
      tiers?: Record<string, Record<string, number | string>>;
      displayClassPresets?: Record<string, { tiers?: Record<string, Record<string, number | string>> }>;
    };
  };
  placement?: {
    edgeInsets?: Record<string, number>;
    minPercent?: number;
    maxPercent?: number;
  };
};

function resolvePaintboxTierMetaFromContract(
  _contractDoc: RenderContract,
  tierId: string,
  options?: { displayClass?: string | null; priorityLevel?: string | null },
) {
  return resolvePaintboxTierMeta(tierId, options);
}

function edgePadding(
  placementId: string,
  screenW: number,
  screenH: number,
  insets: Record<string, number>,
) {
  const horizontal = screenW * (insets.horizontalFraction ?? 0);
  const top = screenH * (insets.topFraction ?? 0);
  const bottom = screenH * (insets.bottomFraction ?? 0);
  const extraTop = screenH * (insets.upperCenterExtraTopFraction ?? 0);

  switch (placementId) {
    case "top_right":
      return { top, end: horizontal, bottom: 0, start: 0 };
    case "top_left":
      return { top, start: horizontal, bottom: 0, end: 0 };
    case "bottom_right":
      return { bottom, end: horizontal, top: 0, start: 0 };
    case "bottom_left":
      return { bottom, start: horizontal, top: 0, end: 0 };
    case "upper_center":
      return { top: top + extraTop, start: 0, end: 0, bottom: 0 };
    case "lower_center":
      return { bottom, start: 0, end: 0, top: 0 };
    case "center_soft":
      return {
        top: screenH * (insets.centerSoftVerticalFraction ?? 0),
        bottom: screenH * (insets.centerSoftVerticalFraction ?? 0),
        start: 0,
        end: 0,
      };
    default:
      return { top, start: 0, end: 0, bottom: 0 };
  }
}

export function resolvePaintBoxRect(input: {
  placementId: string;
  placementMode: string;
  sizeTier: string;
  xPercent?: number | null;
  yPercent?: number | null;
  contract?: RenderContract;
  screenW?: number;
  screenH?: number;
  displayClass?: string | null;
  priorityLevel?: string | null;
}): PaintBoxScreenRect {
  const contractDoc = input.contract ?? (contract as RenderContract);
  const screenW = input.screenW ?? REFERENCE_VIEWPORT.width;
  const screenH = input.screenH ?? REFERENCE_VIEWPORT.height;
  const tierMeta = resolvePaintboxTierMetaFromContract(contractDoc, input.sizeTier, {
    displayClass: input.displayClass,
    priorityLevel: input.priorityLevel,
  });
  const boxW = screenW * (tierMeta.widthFraction ?? 0.34);
  const boxH = screenH * (tierMeta.heightFraction ?? 0.42);
  const placement = contractDoc.placement ?? {};
  const insets = placement.edgeInsets ?? {};

  if (input.placementMode === "custom" && input.xPercent != null && input.yPercent != null) {
    const minPct = placement.minPercent ?? 5;
    const maxPct = placement.maxPercent ?? 95;
    const x = Math.max(minPct, Math.min(maxPct, Number(input.xPercent))) / 100;
    const y = Math.max(minPct, Math.min(maxPct, Number(input.yPercent))) / 100;
    return {
      left: screenW * x - boxW / 2,
      top: screenH * y - boxH / 2,
      width: boxW,
      height: boxH,
      placement_id: "custom",
      paint_box_tier: input.sizeTier,
    };
  }

  const placementId = input.placementId || "upper_center";
  const pad = edgePadding(placementId, screenW, screenH, insets);
  let left = pad.start;
  let top = pad.top;

  if (placementId === "top_right" || placementId === "bottom_right") {
    left = screenW - pad.end - boxW;
  } else if (
    placementId === "upper_center" ||
    placementId === "lower_center" ||
    placementId === "center_soft"
  ) {
    left = (screenW - boxW) / 2;
  }

  if (placementId === "bottom_right" || placementId === "bottom_left" || placementId === "lower_center") {
    top = screenH - pad.bottom - boxH;
  } else if (placementId === "center_soft") {
    top = (screenH - boxH) / 2;
  }

  return {
    left,
    top,
    width: boxW,
    height: boxH,
    placement_id: placementId,
    paint_box_tier: input.sizeTier,
  };
}

/** Paint-box-local pixel regions (mirrors LCARD effect-config.js). */
export function computeHailLayoutRegions(
  boxWidth: number,
  boxHeight: number,
  paintBoxMeta?: Record<string, number | string | undefined> | null,
  options?: {
    effectId?: string;
    effectFootprintProfile?: string;
    footprintScale?: number;
  },
): HailLayoutRegions {
  const meta = paintBoxMeta ?? {};
  const insetFrac = clamp(meta.safeZoneInsetFraction, 0.06, 0.2, 0.11);
  const glyphFrac = clamp(meta.glyphFocusFraction, 0.45, 0.8, 0.64);
  const beamMul = clamp(meta.transporterBeamHeightMultiplier, 1.1, 2.2, 1.5);
  const messageWeight = clamp(meta.messageWeight, 0.2, 0.5, 0.36);
  const profile = String(
    options?.effectFootprintProfile ?? meta.effectFootprintProfile ?? "standard",
  ).trim().toLowerCase();

  const insetX = boxWidth * insetFrac;
  const insetY = boxHeight * insetFrac;
  const safeZone = {
    left: insetX,
    top: insetY,
    width: Math.max(1, boxWidth - insetX * 2),
    height: Math.max(1, boxHeight - insetY * 2),
  };

  const glyphH = safeZone.height * glyphFrac;
  const glyphWidthFrac = clamp(meta.glyphWidthFractionOfPaintBox, 0.35, 0.65, 0.48);
  const glyphW = Math.min(
    safeZone.width,
    Math.max(glyphH * 1.05, boxWidth * glyphWidthFrac),
  );
  const centerX = safeZone.left + safeZone.width / 2;
  const centerY = safeZone.top + safeZone.height / 2;
  const glyphTop = centerY - glyphH / 2;
  const glyphFocus = {
    left: safeZone.left + (safeZone.width - glyphW) / 2,
    top: glyphTop,
    width: glyphW,
    height: glyphH,
    center_x: centerX,
    center_y: centerY,
  };

  const effectField = computeEffectFieldRegion({
    safeZone,
    glyphVisualSizePx: Math.max(glyphW, glyphH),
    effectId: options?.effectId ?? "transporter",
    effectFootprintProfile: profile,
    footprintScale: options?.footprintScale,
  });
  const transporterBeamEnvelope = {
    left: effectField.left,
    top: effectField.top,
    width: effectField.width,
    height: effectField.height,
    center_x: effectField.center_x,
    center_y: effectField.center_y,
    bottom: effectField.bottom,
  };

  const messageBandHeight = Math.max(1, boxHeight * messageWeight * 0.35);
  const messageBand = {
    left: glyphFocus.left,
    top: glyphFocus.top + glyphFocus.height,
    width: glyphW,
    height: messageBandHeight,
  };

  return {
    paint_box: { left: 0, top: 0, width: boxWidth, height: boxHeight },
    safe_zone: safeZone,
    glyph_focus: glyphFocus,
    effect_field: effectField,
    transporter_beam_envelope: transporterBeamEnvelope,
    message_band: messageBand,
    message_weight: messageWeight,
    transporter_beam_height_multiplier: beamMul,
    safe_zone_inset_fraction: insetFrac,
    glyph_focus_fraction: glyphFrac,
  };
}

export function resolveHailPackageLayout(input: {
  placementId: string;
  placementMode: string;
  sizeTier: string;
  xPercent?: number | null;
  yPercent?: number | null;
  effectId?: string;
  effectFootprintProfile?: string;
  footprintScale?: number;
  displayClass?: string | null;
  priorityLevel?: string | null;
}) {
  const contractDoc = contract as RenderContract;
  const paintBoxScreen = resolvePaintBoxRect({ ...input, contract: contractDoc });
  const tierMeta = resolvePaintboxTierMetaFromContract(contractDoc, input.sizeTier, {
    displayClass: input.displayClass,
    priorityLevel: input.priorityLevel,
  });
  const layoutRegions = computeHailLayoutRegions(
    paintBoxScreen.width,
    paintBoxScreen.height,
    tierMeta,
    {
      effectId: input.effectId ?? "transporter",
      effectFootprintProfile: input.effectFootprintProfile,
      footprintScale: input.footprintScale,
    },
  );
  return {
    reference_viewport: { ...REFERENCE_VIEWPORT },
    paint_box_screen: paintBoxScreen,
    layout_regions: layoutRegions,
  };
}

export function extractPackageLayoutFromPayload(
  payload: HailPackageLayoutPayload | null | undefined,
): {
  viewport: { width: number; height: number };
  paintBox: PaintBoxScreenRect;
  regions: HailLayoutRegions;
} | null {
  if (!payload?.paint_box_screen || !payload.layout_regions) {
    return null;
  }
  const viewport = payload.reference_viewport ?? REFERENCE_VIEWPORT;
  return {
    viewport,
    paintBox: payload.paint_box_screen,
    regions: payload.layout_regions,
  };
}

export type AuthoringPackageLayout = NonNullable<ReturnType<typeof extractPackageLayoutFromPayload>>;

/**
 * Locked authoring viewport (18×16rem) — tier-sized package with local layout_regions.
 * Design and delivery share one geometry; design legibility is CSS zoom on the package only (PV6).
 */
export function authoringPreviewPackageLayout(input: {
  scaleMode: AuthoringPreviewScaleMode;
  sizeTier: string;
  centeredCluster: boolean;
  effectId?: string;
  effectFootprintProfile?: string;
  footprintScale?: number;
  displayClass?: string | null;
  priorityLevel?: string | null;
}): AuthoringPackageLayout {
  const contractDoc = contract as RenderContract;
  const tierMeta = resolvePaintboxTierMetaFromContract(contractDoc, input.sizeTier, {
    displayClass: input.displayClass,
    priorityLevel: input.priorityLevel,
  });
  const viewport = AUTHORING_PREVIEW_VIEWPORT;
  const deliveryEnvelopeScale = AUTHORING_DELIVERY_ENVELOPE_SCALE;

  const paintBoxWidth = Math.min(
    viewport.width,
    viewport.width * (tierMeta.widthFraction ?? 0.34) * deliveryEnvelopeScale,
  );
  const paintBoxHeight = Math.min(
    viewport.height,
    viewport.height * (tierMeta.heightFraction ?? 0.42) * deliveryEnvelopeScale,
  );

  const layoutRegions = computeHailLayoutRegions(
    paintBoxWidth,
    paintBoxHeight,
    {
      ...tierMeta,
      glyphFocusFraction: 0.68,
    },
    {
      effectId: input.effectId ?? "transporter",
      effectFootprintProfile: input.effectFootprintProfile,
      footprintScale: input.footprintScale,
    },
  );

  return {
    viewport: { ...viewport },
    paintBox: {
      left: 0,
      top: 0,
      width: paintBoxWidth,
      height: paintBoxHeight,
      placement_id: input.centeredCluster ? "center" : undefined,
      paint_box_tier: input.sizeTier,
    },
    regions: layoutRegions,
  };
}

/** Anchor box for the package on the locked authoring viewport — tier envelope + placement. */
export function authoringPreviewPackageAnchorStyle(input: {
  scaleMode: AuthoringPreviewScaleMode;
  sizeTier: string;
  centeredCluster: boolean;
  visual: HailVisualFields;
}): CSSProperties {
  const envelope = authoringTierEnvelopePct(input.sizeTier);
  const deliveryScale = AUTHORING_DELIVERY_ENVELOPE_SCALE;
  const placement = input.centeredCluster
    ? authoringPaintboxCenterAnchorStyle()
    : paintboxPlacementAnchorStyle(input.visual);

  return {
    ...placement,
    width: `${Math.min(envelope.widthPct * deliveryScale, 100)}%`,
    height: `${Math.min(envelope.heightPct * deliveryScale, 100)}%`,
  };
}

/** @deprecated Use authoringPreviewPackageLayout on locked authoring surfaces. */
export function packageLayoutForAuthoringPreview(input: {
  layout: AuthoringPackageLayout | null;
  scaleMode: "design" | "delivery";
  centeredCluster: boolean;
  sizeTier: string;
  effectId?: string;
  effectFootprintProfile?: string;
  footprintScale?: number;
  displayClass?: string | null;
  priorityLevel?: string | null;
}): AuthoringPackageLayout | null {
  if (!input.layout) {
    return null;
  }
  return authoringPreviewPackageLayout({
    scaleMode: input.scaleMode,
    sizeTier: input.sizeTier,
    centeredCluster: input.centeredCluster,
    effectId: input.effectId,
    effectFootprintProfile: input.effectFootprintProfile,
    footprintScale: input.footprintScale,
    displayClass: input.displayClass,
    priorityLevel: input.priorityLevel,
  });
}

export function paintBoxScreenPercentStyle(
  paintBox: PaintBoxScreenRect,
  viewport: { width: number; height: number } = REFERENCE_VIEWPORT,
): CSSProperties {
  return {
    left: `${(paintBox.left / viewport.width) * 100}%`,
    top: `${(paintBox.top / viewport.height) * 100}%`,
    width: `${(paintBox.width / viewport.width) * 100}%`,
    height: `${(paintBox.height / viewport.height) * 100}%`,
  };
}

export function regionPercentStyle(region: HailLayoutRect, box: HailLayoutRect): CSSProperties {
  return {
    left: `${(region.left / box.width) * 100}%`,
    top: `${(region.top / box.height) * 100}%`,
    width: `${(region.width / box.width) * 100}%`,
    height: `${(region.height / box.height) * 100}%`,
  };
}

export function glyphFocusBeamAnchor(
  regions: HailLayoutRegions,
): { x: number; y: number } {
  const box = regions.paint_box;
  const focus = regions.glyph_focus;
  return {
    x: focus.center_x / box.width,
    y: focus.center_y / box.height,
  };
}

export function resolveEffectLayerRegion(regions: HailLayoutRegions): HailLayoutRect & {
  center_x?: number;
  center_y?: number;
  top?: number;
  bottom?: number;
} {
  return regions.effect_field ?? regions.transporter_beam_envelope;
}

/** Beam origin normalized to the effect field center (package coordinates). */
export function transporterBeamEnvelopeAnchor(regions: HailLayoutRegions): { x: number; y: number } {
  const box = regions.paint_box;
  const beam = resolveEffectLayerRegion(regions);
  const centerX = beam.center_x ?? beam.left + beam.width / 2;
  const centerY = beam.center_y ?? (beam.top ?? 0) + beam.height / 2;
  return {
    x: centerX / box.width,
    y: centerY / box.height,
  };
}

/**
 * Single anchor contract for transporter canvas — effect-field-local when the canvas
 * host is layout_regions.effect_field (or legacy transporter_beam_envelope); package-local otherwise.
 */
export function resolveTransporterBeamAnchor(
  regions: HailLayoutRegions,
  input: { scopedToBeamEnvelope: boolean },
): { x: number; y: number } {
  if (input.scopedToBeamEnvelope) {
    return { x: 0.5, y: 0.5 };
  }
  return transporterBeamEnvelopeAnchor(regions);
}
