import { computeHailLayoutRegions, resolvePaintBox } from "./effect-config.js";

export function edgePadding(placementId, screenW, screenH, insets) {
  const horizontal = screenW * insets.horizontalFraction;
  const top = screenH * insets.topFraction;
  const bottom = screenH * insets.bottomFraction;
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
      return { top: top + screenH * insets.upperCenterExtraTopFraction, start: 0, end: 0, bottom: 0 };
    case "lower_center":
      return { bottom, start: 0, end: 0, top: 0 };
    case "center_soft":
      return {
        top: screenH * insets.centerSoftVerticalFraction,
        bottom: screenH * insets.centerSoftVerticalFraction,
        start: 0,
        end: 0,
      };
    default:
      return { top, start: 0, end: 0, bottom: 0 };
  }
}

export function applySafeOffsetPadding(pad, screenW, screenH, safeOffsetFraction) {
  const s = safeOffsetFraction || {};
  return {
    top: pad.top + screenH * (s.top || 0),
    bottom: pad.bottom + screenH * (s.bottom || 0),
    start: pad.start + screenW * (s.start || 0),
    end: pad.end + screenW * (s.end || 0),
  };
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return (min + max) / 2;
  }
  return Math.min(max, Math.max(min, value));
}

function resolveTierLayoutOpts(payload, contract, layoutOpts) {
  const opts = layoutOpts || {};
  const previewVisual = payload.preview_visual || {};
  return {
    tierId:
      opts.tierId ||
      previewVisual.hail_scale_tier ||
      contract.previewDefaults.hail_scale_tier ||
      "medium",
    manualPercent:
      opts.manualPercent != null
        ? opts.manualPercent
        : previewVisual.hail_scale_manual_percent != null
          ? previewVisual.hail_scale_manual_percent
          : 100,
    safeOffsetFraction: opts.safeOffsetFraction || null,
  };
}

/** Normalize a positioned rect into unified Paint Box bounds (content fills the box). */
function toPaintBoxBounds(rect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    placementId: rect.placementId,
    contentLeft: 0,
    contentTop: 0,
    contentWidth: rect.width,
    contentHeight: rect.height,
  };
}

/**
 * Paint Box rect — placement-anchored maximum Hail drawing area from contract tiers.
 * No screen-level effect-field expansion; one box for content and effects.
 */
export function resolvePaintBoxRect(payload, screenW, screenH, contract, layoutOpts) {
  const tierLayout = resolveTierLayoutOpts(payload, contract, layoutOpts);
  const paintBox = resolvePaintBox(contract, tierLayout.tierId, tierLayout.manualPercent);
  const boxW = screenW * paintBox.widthFraction;
  const boxH = screenH * paintBox.heightFraction;
  const mode = payload.placement_mode || contract.placement.modePreset;

  if (mode === contract.placement.modeCustom) {
    const min = contract.placement.minPercent;
    const max = contract.placement.maxPercent;
    const x = clamp(Number(payload.x_percent), min, max) / 100;
    const y = clamp(Number(payload.y_percent), min, max) / 100;
    return {
      left: screenW * x - boxW / 2,
      top: screenH * y - boxH / 2,
      width: boxW,
      height: boxH,
      placementId: "custom",
      paintBoxTier: paintBox.tierId,
    };
  }

  const placementId = payload.placement_id || contract.previewDefaults.placement_id;
  let pad = edgePadding(placementId, screenW, screenH, contract.placement.edgeInsets);
  if (tierLayout.safeOffsetFraction) {
    pad = applySafeOffsetPadding(pad, screenW, screenH, tierLayout.safeOffsetFraction);
  }
  let left = pad.start;
  let top = pad.top;

  switch (placementId) {
    case "top_right":
    case "bottom_right":
      left = screenW - pad.end - boxW;
      break;
    case "upper_center":
    case "lower_center":
    case "center_soft":
      left = (screenW - boxW) / 2;
      break;
    default:
      break;
  }

  switch (placementId) {
    case "bottom_right":
    case "bottom_left":
    case "lower_center":
      top = screenH - pad.bottom - boxH;
      break;
    case "center_soft":
      top = (screenH - boxH) / 2;
      break;
    default:
      break;
  }

  return {
    left,
    top,
    width: boxW,
    height: boxH,
    placementId: placementId,
    paintBoxTier: paintBox.tierId,
  };
}

/** @deprecated Use resolvePaintBoxRect — legacy alias for content footprint. */
export function resolveContentRect(payload, screenW, screenH, contract, layoutOpts) {
  return toPaintBoxBounds(resolvePaintBoxRect(payload, screenW, screenH, contract, layoutOpts));
}

/**
 * Composition bounds — Paint Box (hard max), Safe Effect Zone (normal effects),
 * Glyph Focus Region (primary anchor). placementPresence ignored for bounds.
 */
export function resolveCompositionBounds(
  payload,
  screenW,
  screenH,
  contract,
  layoutOpts,
  _placementPresence,
) {
  const tierLayout = resolveTierLayoutOpts(payload, contract, layoutOpts);
  const paintBox = toPaintBoxBounds(
    resolvePaintBoxRect(payload, screenW, screenH, contract, layoutOpts),
  );
  const paintBoxMeta = resolvePaintBox(
    contract,
    tierLayout.tierId,
    tierLayout.manualPercent,
  );
  const layoutRegions = computeHailLayoutRegions(
    paintBox.width,
    paintBox.height,
    paintBoxMeta,
  );
  return {
    content: paintBox,
    paintBox: paintBox,
    safeZone: layoutRegions.safeZone,
    glyphFocus: layoutRegions.glyphFocus,
    layoutRegions: layoutRegions,
    effect: layoutRegions.safeZone,
  };
}
