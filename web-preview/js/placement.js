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

/**
 * Asymmetric canvas bleed inset — keeps content anchor fixed while allowing
 * effect field overflow away from screen edges / subtitle zones.
 */
export function canvasOverflowInset(placementId, padX, padY) {
  switch (placementId) {
    case "top_right":
      return { left: padX * 0.65, right: padX * 0.15, top: padY * 0.72, bottom: padY * 0.12 };
    case "top_left":
      return { left: padX * 0.15, right: padX * 0.65, top: padY * 0.72, bottom: padY * 0.12 };
    case "bottom_right":
      return { left: padX * 0.55, right: padX * 0.12, top: padY * 0.88, bottom: padY * 0.06 };
    case "bottom_left":
      return { left: padX * 0.12, right: padX * 0.55, top: padY * 0.88, bottom: padY * 0.06 };
    case "upper_center":
      return { left: padX * 0.88, right: padX * 0.88, top: padY * 0.5, bottom: padY * 0.42 };
    case "center_soft":
      return { left: padX, right: padX, top: padY, bottom: padY };
    case "lower_center":
      return { left: padX * 0.78, right: padX * 0.78, top: padY * 0.92, bottom: padY * 0.04 };
    default:
      return { left: padX * 0.7, right: padX * 0.7, top: padY * 0.65, bottom: padY * 0.35 };
  }
}

/** Preview baseline — minimum symmetric effect-field expansion (Lane 1 geometry). */
export const DEFAULT_EFFECT_FIELD_SCALE = 1.55;

/**
 * Content bounds: glyph + message module footprint (placement-anchored).
 */
export function resolveContentRect(payload, screenW, screenH, contract, layoutOpts) {
  return resolveGroupRect(payload, screenW, screenH, contract, layoutOpts);
}

/**
 * Effect field bounds — larger than content, asymmetric bleed via placement caps (L3).
 * Content anchor stays fixed; field grows outward (especially away from edges).
 */
export function resolveEffectFieldBounds(contentRect, placementId, placementPresence) {
  const presence = placementPresence || {};
  const capMul = presence.effectFieldCapMul != null ? presence.effectFieldCapMul : 1;
  const overflowFromPresence =
    presence.maxOverflowFraction != null ? presence.maxOverflowFraction : 0;
  const baselinePadFraction = (DEFAULT_EFFECT_FIELD_SCALE - 1) / 2;
  const overflow = Math.max(overflowFromPresence, baselinePadFraction) * capMul;

  if (overflow <= 0) {
    return {
      left: contentRect.left,
      top: contentRect.top,
      width: contentRect.width,
      height: contentRect.height,
      contentLeft: 0,
      contentTop: 0,
      contentWidth: contentRect.width,
      contentHeight: contentRect.height,
    };
  }

  const padX = contentRect.width * overflow;
  const padY = contentRect.height * overflow;
  const inset = canvasOverflowInset(placementId, padX, padY);
  const width = contentRect.width + inset.left + inset.right;
  const height = contentRect.height + inset.top + inset.bottom;

  return {
    left: contentRect.left - inset.left,
    top: contentRect.top - inset.top,
    width: width,
    height: height,
    contentLeft: inset.left,
    contentTop: inset.top,
    contentWidth: contentRect.width,
    contentHeight: contentRect.height,
  };
}

export function resolveCompositionBounds(
  payload,
  screenW,
  screenH,
  contract,
  layoutOpts,
  placementPresence,
) {
  const content = resolveContentRect(payload, screenW, screenH, contract, layoutOpts);
  const placementId = content.placementId || payload.placement_id || "top_right";
  const effect = resolveEffectFieldBounds(content, placementId, placementPresence);
  return { content: content, effect: effect };
}

export function resolveGroupRect(payload, screenW, screenH, contract, layoutOpts) {
  const layout = contract.placement.layoutFractions;
  const groupW = screenW * layout.groupWidth;
  const groupH = screenH * layout.groupHeight;
  const mode = payload.placement_mode || contract.placement.modePreset;
  const safeOffsetFraction =
    layoutOpts && layoutOpts.safeOffsetFraction ? layoutOpts.safeOffsetFraction : null;

  if (mode === contract.placement.modeCustom) {
    const min = contract.placement.minPercent;
    const max = contract.placement.maxPercent;
    const x = clamp(Number(payload.x_percent), min, max) / 100;
    const y = clamp(Number(payload.y_percent), min, max) / 100;
    return {
      left: screenW * x - groupW / 2,
      top: screenH * y - groupH / 2,
      width: groupW,
      height: groupH,
      placementId: "custom",
    };
  }

  const placementId = payload.placement_id || contract.previewDefaults.placement_id;
  let pad = edgePadding(placementId, screenW, screenH, contract.placement.edgeInsets);
  if (safeOffsetFraction) {
    pad = applySafeOffsetPadding(pad, screenW, screenH, safeOffsetFraction);
  }
  let left = pad.start;
  let top = pad.top;

  switch (placementId) {
    case "top_right":
    case "bottom_right":
      left = screenW - pad.end - groupW;
      break;
    case "upper_center":
    case "lower_center":
    case "center_soft":
      left = (screenW - groupW) / 2;
      break;
    default:
      break;
  }

  switch (placementId) {
    case "bottom_right":
    case "bottom_left":
    case "lower_center":
      top = screenH - pad.bottom - groupH;
      break;
    case "center_soft":
      top = (screenH - groupH) / 2;
      break;
    default:
      break;
  }

  return { left, top, width: groupW, height: groupH, placementId: placementId };
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return (min + max) / 2;
  }
  return Math.min(max, Math.max(min, value));
}
