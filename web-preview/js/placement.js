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

export function resolveGroupRect(payload, screenW, screenH, contract) {
  const layout = contract.placement.layoutFractions;
  const groupW = screenW * layout.groupWidth;
  const groupH = screenH * layout.groupHeight;
  const mode = payload.placement_mode || contract.placement.modePreset;

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
    };
  }

  const placementId = payload.placement_id || contract.previewDefaults.placement_id;
  const pad = edgePadding(placementId, screenW, screenH, contract.placement.edgeInsets);
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

  return { left, top, width: groupW, height: groupH };
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return (min + max) / 2;
  }
  return Math.min(max, Math.max(min, value));
}
