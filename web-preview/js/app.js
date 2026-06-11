import {
  BEAM_SHAPE_LABELS,
  PRESET_LABELS,
  getEffectPreset,
  mergeEffectParams,
  previewVisualPayload,
  resolvePaletteRoles,
  scaleLayoutFractions,
  scaledTypography,
} from "./effect-config.js";
import { validateMessage } from "./message.js";
import { resolveGroupRect } from "./placement.js";
import { createOverlayAnimator, glyphMarkup, hexWithAlpha } from "./renderer.js";

const PLACEMENT_LABELS = {
  center_soft: "Center",
  top_right: "Top right",
  bottom_right: "Bottom right",
  top_left: "Top left",
  bottom_left: "Bottom left",
  upper_center: "Upper ctr",
  lower_center: "Lower ctr",
};

const PALETTE_LABELS = {
  axiom_dark_cyan: "Axiom",
  transporter_white: "White",
  cute_purple: "Purple",
};

const state = {
  contract: null,
  stopAnimation: null,
  hideTimer: null,
  exitTimer: null,
  customBackgroundUrl: null,
  placementMode: "preset",
  placementPreset: "top_right",
  paletteId: "axiom_dark_cyan",
  screenPreset: "1920x1080",
  useLifecycle: false,
  lifecycleDurationMs: 0,
  effectPreset: "transporter_soft",
  effectParams: null,
  effectTouched: false,
  hailScalePercent: 100,
  groupBgEnabled: false,
  groupBgShape: "rounded_rect",
  groupBgSizePercent: 100,
  groupBgOpacityPercent: 24,
  groupBgUsePaletteColor: true,
  groupBgCustomColor: "#0A3528",
};

const els = {};

function cacheElements() {
  Object.assign(els, {
    placementGrid: document.getElementById("placement-grid"),
    placementModeBtns: document.querySelectorAll("[data-placement-mode]"),
    customPlacement: document.getElementById("custom-placement"),
    xPercent: document.getElementById("x-percent"),
    yPercent: document.getElementById("y-percent"),
    palettePills: document.getElementById("palette-pills"),
    effectPresetPills: document.getElementById("effect-preset-pills"),
    beamEnabledBtns: document.querySelectorAll("[data-beam-enabled]"),
    beamShapePills: document.getElementById("beam-shape-pills"),
    hailScalePresetBtns: document.querySelectorAll("[data-hail-scale-preset]"),
    hailScale: document.getElementById("hail-scale"),
    hailScaleLabel: document.getElementById("hail-scale-label"),
    beamWidth: document.getElementById("beam-width"),
    beamWidthLabel: document.getElementById("beam-width-label"),
    beamHeight: document.getElementById("beam-height"),
    beamHeightLabel: document.getElementById("beam-height-label"),
    beamOpacity: document.getElementById("beam-opacity"),
    beamOpacityLabel: document.getElementById("beam-opacity-label"),
    particleDensity: document.getElementById("particle-density"),
    particleDensityLabel: document.getElementById("particle-density-label"),
    particleSpread: document.getElementById("particle-spread"),
    particleSpreadLabel: document.getElementById("particle-spread-label"),
    particleSpeed: document.getElementById("particle-speed"),
    particleSpeedLabel: document.getElementById("particle-speed-label"),
    glowIntensity: document.getElementById("glow-intensity"),
    glowIntensityLabel: document.getElementById("glow-intensity-label"),
    glyph: document.getElementById("glyph-id"),
    message: document.getElementById("message"),
    duration: document.getElementById("duration-ms"),
    screenBtns: document.querySelectorAll("[data-screen]"),
    customScreen: document.getElementById("custom-screen"),
    screenWidth: document.getElementById("screen-width"),
    screenHeight: document.getElementById("screen-height"),
    backgroundMode: document.getElementById("background-mode"),
    backgroundFileWrap: document.getElementById("background-file-wrap"),
    backgroundFile: document.getElementById("background-file"),
    previewBtn: document.getElementById("preview-btn"),
    hideBtn: document.getElementById("hide-btn"),
    payloadOut: document.getElementById("payload-out"),
    copyPayloadBtn: document.getElementById("copy-payload-btn"),
    copyFeedback: document.getElementById("copy-feedback"),
    messageError: document.getElementById("message-error"),
    stageShell: document.getElementById("stage-shell"),
    stageScaler: document.getElementById("stage-scaler"),
    stage: document.getElementById("tv-stage"),
    stageBackground: document.getElementById("stage-background"),
    overlayGroup: document.getElementById("overlay-group"),
    overlayGroupBg: document.getElementById("overlay-group-bg"),
    groupBgBtns: document.querySelectorAll("[data-group-bg]"),
    groupBgControls: document.getElementById("group-bg-controls"),
    groupBgShape: document.getElementById("group-bg-shape"),
    groupBgSize: document.getElementById("group-bg-size"),
    groupBgSizeLabel: document.getElementById("group-bg-size-label"),
    groupBgOpacity: document.getElementById("group-bg-opacity"),
    groupBgOpacityLabel: document.getElementById("group-bg-opacity-label"),
    groupBgPaletteColor: document.getElementById("group-bg-palette-color"),
    groupBgColorWrap: document.getElementById("group-bg-color-wrap"),
    groupBgColor: document.getElementById("group-bg-color"),
    overlayCanvas: document.getElementById("overlay-canvas"),
    overlayGlyph: document.getElementById("overlay-glyph"),
    overlayMessage: document.getElementById("overlay-message"),
    scaleLabel: document.getElementById("scale-label"),
  });
}

async function init() {
  cacheElements();
  const res = await fetch("/shared/hail-render-contract.json");
  state.contract = await res.json();
  buildPlacementGrid();
  buildPalettePills();
  buildEffectPresetPills();
  buildBeamShapePills();
  populateGlyphSelect();
  bindEvents();
  applyDefaults();
  requestAnimationFrame(function () {
    resizeStage();
    updatePayloadPreview();
  });
}

function buildPlacementGrid() {
  els.placementGrid.innerHTML = state.contract.placement.presetIds
    .map(function (id) {
      const label = PLACEMENT_LABELS[id] || id;
      return (
        '<button type="button" data-placement-preset="' + id + '">' +
        '<span class="preset-short">' + label + "</span>" +
        '<span class="preset-id">' + id + "</span>" +
        "</button>"
      );
    })
    .join("");
}

function buildPalettePills() {
  els.palettePills.innerHTML = Object.keys(state.contract.palettes)
    .map(function (id) {
      return (
        '<button type="button" data-palette="' + id + '">' +
        (PALETTE_LABELS[id] || id) +
        "</button>"
      );
    })
    .join("");
}

function buildEffectPresetPills() {
  const ids = state.contract.previewVisual.effectPresetIds || [];
  els.effectPresetPills.innerHTML = ids
    .map(function (id) {
      return (
        '<button type="button" data-effect-preset="' + id + '">' +
        (PRESET_LABELS[id] || id) +
        "</button>"
      );
    })
    .join("");
}

function buildBeamShapePills() {
  const shapes = state.contract.previewVisual.beamShapes || [];
  els.beamShapePills.innerHTML = shapes
    .map(function (id) {
      return (
        '<button type="button" data-beam-shape="' + id + '">' +
        (BEAM_SHAPE_LABELS[id] || id) +
        "</button>"
      );
    })
    .join("");
}

function populateGlyphSelect() {
  els.glyph.innerHTML = state.contract.glyphs.allowlist
    .map(function (id) {
      return '<option value="' + id + '">' + id + "</option>";
    })
    .join("");
}

function applyDefaults() {
  const d = state.contract.previewDefaults;
  const pv = state.contract.previewVisual;
  state.placementMode = d.placement_mode;
  state.placementPreset = d.placement_id;
  state.paletteId = d.palette_id;
  state.screenPreset = "1920x1080";
  state.effectPreset = pv.defaultEffectPreset || "transporter_soft";
  state.hailScalePercent = pv.defaultHailScalePercent || 100;
  state.effectParams = getEffectPreset(state.contract, state.effectPreset);
  state.effectTouched = false;
  els.glyph.value = d.glyph_id;
  els.message.value = d.message;
  els.duration.value = String(d.duration_ms);
  els.xPercent.value = "72";
  els.yPercent.value = "18";
  els.hailScale.min = String((pv.hailScale && pv.hailScale.min) || 50);
  els.hailScale.max = String((pv.hailScale && pv.hailScale.max) || 150);
  applyGroupBgDefaults();
  syncAllUi();
}

function applyGroupBgDefaults() {
  const gb = state.contract.previewVisual.groupBackground;
  if (!gb) {
    return;
  }
  state.groupBgEnabled = gb.defaultEnabled === true;
  state.groupBgShape = gb.defaultShape || "rounded_rect";
  state.groupBgSizePercent = gb.defaultSizePercent != null ? gb.defaultSizePercent : 100;
  state.groupBgOpacityPercent =
    gb.defaultOpacityPercent != null ? gb.defaultOpacityPercent : 24;
  els.groupBgSize.min = String(gb.sizePercentMin || 50);
  els.groupBgSize.max = String(gb.sizePercentMax || 140);
}

function applyPresetToState(presetId) {
  state.effectPreset = presetId;
  state.effectParams = getEffectPreset(state.contract, presetId);
  state.effectTouched = false;
  syncEffectUiFromState();
}

function readEffectParamsFromControls() {
  state.effectParams = mergeEffectParams(state.effectParams, {
    beamEnabled: state.effectParams.beamEnabled,
    beamShape: state.effectParams.beamShape,
    beamWidth: clampInt(els.beamWidth.value, 5, 55, 20) / 100,
    beamHeight: clampInt(els.beamHeight.value, 10, 90, 52) / 100,
    beamOpacity: clampInt(els.beamOpacity.value, 0, 100, 82) / 100,
    particleDensity: clampInt(els.particleDensity.value, 0, 100, 42),
    particleSpread: clampInt(els.particleSpread.value, 0, 100, 36),
    particleSpeed: clampInt(els.particleSpeed.value, 0, 100, 40),
    glowIntensity: clampInt(els.glowIntensity.value, 0, 100, 48),
  });
}

function syncEffectUiFromState() {
  const p = state.effectParams;
  els.beamEnabledBtns.forEach(function (btn) {
    const on = btn.dataset.beamEnabled === "on";
    btn.classList.toggle("active", on === p.beamEnabled);
  });
  els.beamShapePills.querySelectorAll("[data-beam-shape]").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.beamShape === p.beamShape);
  });
  els.beamWidth.value = String(Math.round(p.beamWidth * 100));
  els.beamHeight.value = String(Math.round(p.beamHeight * 100));
  els.beamOpacity.value = String(Math.round(p.beamOpacity * 100));
  els.particleDensity.value = String(p.particleDensity);
  els.particleSpread.value = String(p.particleSpread);
  els.particleSpeed.value = String(p.particleSpeed);
  els.glowIntensity.value = String(p.glowIntensity);
  els.beamWidthLabel.textContent = Math.round(p.beamWidth * 100) + "%";
  els.beamHeightLabel.textContent = Math.round(p.beamHeight * 100) + "%";
  els.beamOpacityLabel.textContent = Math.round(p.beamOpacity * 100) + "%";
  els.particleDensityLabel.textContent = String(p.particleDensity);
  els.particleSpreadLabel.textContent = String(p.particleSpread);
  els.particleSpeedLabel.textContent = String(p.particleSpeed);
  els.glowIntensityLabel.textContent = String(p.glowIntensity);
  els.effectPresetPills.querySelectorAll("[data-effect-preset]").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.effectPreset === state.effectPreset);
  });
}

function syncHailScaleUi() {
  els.hailScale.value = String(state.hailScalePercent);
  els.hailScaleLabel.textContent = state.hailScalePercent + "%";
  const presets = state.contract.previewVisual.hailScale.presets;
  els.hailScalePresetBtns.forEach(function (btn) {
    const val = presets[btn.dataset.hailScalePreset];
    btn.classList.toggle("active", val === state.hailScalePercent);
  });
}

function syncGroupBgUi() {
  els.groupBgBtns.forEach(function (btn) {
    btn.classList.toggle("active", (btn.dataset.groupBg === "on") === state.groupBgEnabled);
  });
  els.groupBgControls.hidden = !state.groupBgEnabled;
  els.groupBgShape.querySelectorAll("[data-bg-shape]").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.bgShape === state.groupBgShape);
  });
  els.groupBgSize.value = String(state.groupBgSizePercent);
  els.groupBgOpacity.value = String(state.groupBgOpacityPercent);
  els.groupBgSizeLabel.textContent = state.groupBgSizePercent + "%";
  els.groupBgOpacityLabel.textContent = state.groupBgOpacityPercent + "%";
  els.groupBgColorWrap.hidden = state.groupBgUsePaletteColor;
}

function syncPlacementModeUi() {
  els.placementModeBtns.forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.placementMode === state.placementMode);
  });
  els.customPlacement.hidden = state.placementMode !== "custom";
  els.placementGrid.style.opacity = state.placementMode === "custom" ? "0.45" : "1";
  els.placementGrid.style.pointerEvents = state.placementMode === "custom" ? "none" : "auto";
}

function syncPlacementPresetUi() {
  els.placementGrid.querySelectorAll("[data-placement-preset]").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.placementPreset === state.placementPreset);
  });
}

function syncPaletteUi() {
  els.palettePills.querySelectorAll("[data-palette]").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.palette === state.paletteId);
  });
}

function syncScreenUi() {
  els.screenBtns.forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.screen === state.screenPreset);
  });
  els.customScreen.hidden = state.screenPreset !== "custom";
}

function syncAllUi() {
  syncPlacementModeUi();
  syncPlacementPresetUi();
  syncPaletteUi();
  syncScreenUi();
  syncEffectUiFromState();
  syncHailScaleUi();
  syncGroupBgUi();
}

function scaledContract() {
  return Object.assign({}, state.contract, {
    placement: Object.assign({}, state.contract.placement, {
      layoutFractions: scaleLayoutFractions(state.contract, state.hailScalePercent),
    }),
  });
}

function bindEvents() {
  els.placementModeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.placementMode = btn.dataset.placementMode;
      syncPlacementModeUi();
      onControlChange();
    });
  });

  els.placementGrid.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-placement-preset]");
    if (!btn) return;
    state.placementPreset = btn.dataset.placementPreset;
    state.placementMode = "preset";
    syncPlacementModeUi();
    syncPlacementPresetUi();
    onControlChange();
  });

  els.palettePills.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-palette]");
    if (!btn) return;
    state.paletteId = btn.dataset.palette;
    syncPaletteUi();
    onControlChange();
  });

  els.effectPresetPills.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-effect-preset]");
    if (!btn) return;
    applyPresetToState(btn.dataset.effectPreset);
    onControlChange();
  });

  els.beamEnabledBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.effectTouched = true;
      state.effectParams.beamEnabled = btn.dataset.beamEnabled === "on";
      if (!state.effectParams.beamEnabled) {
        state.effectParams.beamShape = "none";
      } else if (state.effectParams.beamShape === "none") {
        state.effectParams.beamShape = "column";
      }
      syncEffectUiFromState();
      onControlChange();
    });
  });

  els.beamShapePills.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-beam-shape]");
    if (!btn) return;
    state.effectTouched = true;
    state.effectParams.beamShape = btn.dataset.beamShape;
    state.effectParams.beamEnabled = btn.dataset.beamShape !== "none";
    syncEffectUiFromState();
    onControlChange();
  });

  [
    els.beamWidth,
    els.beamHeight,
    els.beamOpacity,
    els.particleDensity,
    els.particleSpread,
    els.particleSpeed,
    els.glowIntensity,
  ].forEach(function (el) {
    el.addEventListener("input", function () {
      state.effectTouched = true;
      readEffectParamsFromControls();
      syncEffectUiFromState();
      onControlChange();
    });
  });

  els.hailScalePresetBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const presets = state.contract.previewVisual.hailScale.presets;
      state.hailScalePercent = presets[btn.dataset.hailScalePreset] || 100;
      syncHailScaleUi();
      onControlChange();
      resizeStage();
    });
  });

  els.hailScale.addEventListener("input", function () {
    state.hailScalePercent = clampInt(
      els.hailScale.value,
      50,
      150,
      100,
    );
    syncHailScaleUi();
    onControlChange();
    resizeStage();
  });

  els.groupBgBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.groupBgEnabled = btn.dataset.groupBg === "on";
      syncGroupBgUi();
      onControlChange();
    });
  });

  els.groupBgShape.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-bg-shape]");
    if (!btn) return;
    state.groupBgShape = btn.dataset.bgShape;
    syncGroupBgUi();
    onControlChange();
  });

  els.groupBgSize.addEventListener("input", function () {
    state.groupBgSizePercent = clampInt(els.groupBgSize.value, 50, 140, 100);
    syncGroupBgUi();
    onControlChange();
  });

  els.groupBgOpacity.addEventListener("input", function () {
    state.groupBgOpacityPercent = clampInt(els.groupBgOpacity.value, 0, 100, 24);
    syncGroupBgUi();
    onControlChange();
  });

  els.groupBgPaletteColor.addEventListener("change", function () {
    state.groupBgUsePaletteColor = els.groupBgPaletteColor.checked;
    syncGroupBgUi();
    onControlChange();
  });

  els.groupBgColor.addEventListener("input", function () {
    state.groupBgCustomColor = els.groupBgColor.value;
    onControlChange();
  });

  els.screenBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.screenPreset = btn.dataset.screen;
      syncScreenUi();
      resizeStage();
    });
  });

  [
    els.xPercent,
    els.yPercent,
    els.glyph,
    els.message,
    els.duration,
    els.screenWidth,
    els.screenHeight,
    els.backgroundMode,
  ].forEach(function (el) {
    el.addEventListener("input", onControlChange);
    el.addEventListener("change", onControlChange);
  });

  els.backgroundMode.addEventListener("change", toggleBackgroundFile);
  els.backgroundFile.addEventListener("change", onBackgroundFile);
  els.previewBtn.addEventListener("click", showPreview);
  els.hideBtn.addEventListener("click", function () {
    hideOverlay(false);
  });
  els.copyPayloadBtn.addEventListener("click", copyPayload);
  window.addEventListener("resize", resizeStage);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(function () {
      resizeStage();
    }).observe(els.stageShell);
  }
}

function toggleBackgroundFile() {
  const imageMode = els.backgroundMode.value === "image";
  els.backgroundFileWrap.hidden = !imageMode;
  if (!imageMode) {
    els.backgroundFile.value = "";
    if (state.customBackgroundUrl) {
      URL.revokeObjectURL(state.customBackgroundUrl);
      state.customBackgroundUrl = null;
    }
    applyBackground();
  }
}

function onControlChange() {
  updatePayloadPreview();
  if (!els.overlayGroup.hidden) {
    state.useLifecycle = false;
    renderStaticOverlay();
  }
}

function onBackgroundFile(event) {
  const file = event.target.files && event.target.files[0];
  if (state.customBackgroundUrl) {
    URL.revokeObjectURL(state.customBackgroundUrl);
    state.customBackgroundUrl = null;
  }
  if (!file) {
    applyBackground();
    return;
  }
  state.customBackgroundUrl = URL.createObjectURL(file);
  applyBackground();
  onControlChange();
}

function screenSize() {
  if (state.screenPreset === "custom") {
    return {
      width: clampInt(els.screenWidth.value, 640, 7680, 1920),
      height: clampInt(els.screenHeight.value, 360, 4320, 1080),
    };
  }
  if (state.screenPreset === "3840x2160") {
    return { width: 3840, height: 2160 };
  }
  return { width: 1920, height: 1080 };
}

function resizeStage() {
  const size = screenSize();
  els.stage.style.width = size.width + "px";
  els.stage.style.height = size.height + "px";
  const shellRect = els.stageShell.getBoundingClientRect();
  const scale = Math.min(
    (shellRect.width - 24) / size.width,
    (shellRect.height - 24) / size.height,
    1,
  );
  els.stageScaler.style.width = Math.floor(size.width * scale) + "px";
  els.stageScaler.style.height = Math.floor(size.height * scale) + "px";
  els.stage.style.transform = "scale(" + scale + ")";
  els.scaleLabel.textContent =
    size.width + "×" + size.height + " @ " + Math.round(scale * 100) + "%";
  if (!els.overlayGroup.hidden) {
    renderStaticOverlay();
  }
}

function currentPayload() {
  const payload = {
    hail_id: state.contract.previewDefaults.hail_id,
    effect_id: state.contract.previewDefaults.effect_id,
    glyph_id: els.glyph.value,
    palette_id: state.paletteId,
    message: els.message.value,
    duration_ms: clampInt(els.duration.value, 1000, 30000, 5500),
    placement_mode: state.placementMode,
  };
  if (state.placementMode === "custom") {
    payload.x_percent = clampInt(els.xPercent.value, 5, 95, 72);
    payload.y_percent = clampInt(els.yPercent.value, 5, 95, 18);
  } else {
    payload.placement_id = state.placementPreset;
  }
  payload.preview_visual = previewVisualPayload(state, state.contract);
  return payload;
}

function applyGroupBackground(roles, rect) {
  els.overlayGroup.classList.toggle("overlay-group--bg-off", !state.groupBgEnabled);
  els.overlayGroup.style.background = "transparent";
  if (!state.groupBgEnabled) {
    els.overlayGroupBg.hidden = true;
    return;
  }
  const color = state.groupBgUsePaletteColor ? roles.primary : state.groupBgCustomColor;
  const opacity = state.groupBgOpacityPercent / 100;
  const sizePct = state.groupBgSizePercent / 100;
  els.overlayGroupBg.hidden = false;
  els.overlayGroupBg.className = "overlay-group-bg shape-" + state.groupBgShape;
  els.overlayGroupBg.style.width = Math.round(rect.width * sizePct) + "px";
  els.overlayGroupBg.style.height = Math.round(rect.height * sizePct) + "px";
  els.overlayGroupBg.style.background = hexWithAlpha(color, opacity);
  if (state.groupBgShape === "circle_orb") {
    const orbSize = Math.min(rect.width, rect.height) * sizePct;
    els.overlayGroupBg.style.width = Math.round(orbSize) + "px";
    els.overlayGroupBg.style.height = Math.round(orbSize) + "px";
  }
}

function updatePayloadPreview() {
  const validation = validateMessage(
    els.message.value,
    state.contract.message.maxLength,
  );
  if (!validation.ok) {
    els.messageError.textContent = validation.error;
    els.previewBtn.disabled = true;
  } else {
    els.messageError.textContent = "";
    els.previewBtn.disabled = false;
  }
  els.payloadOut.textContent = JSON.stringify(currentPayload(), null, 2);
}

async function copyPayload() {
  try {
    await navigator.clipboard.writeText(els.payloadOut.textContent);
    els.copyFeedback.textContent = "Copied";
  } catch (_err) {
    els.copyFeedback.textContent = "Copy failed";
  }
  setTimeout(function () {
    els.copyFeedback.textContent = "";
  }, 2000);
}

function applyBackground() {
  const mode = els.backgroundMode.value;
  els.stageBackground.className = "stage-background mode-" + mode;
  if (state.customBackgroundUrl && mode === "image") {
    els.stageBackground.style.backgroundImage = 'url("' + state.customBackgroundUrl + '")';
  } else {
    els.stageBackground.style.backgroundImage = "";
  }
}

function renderStaticOverlay() {
  applyBackground();
  readEffectParamsFromControls();
  const payload = currentPayload();
  const validation = validateMessage(payload.message, state.contract.message.maxLength);
  if (!validation.ok) {
    hideOverlay(true);
    return;
  }

  const size = screenSize();
  const contractForLayout = scaledContract();
  const rect = resolveGroupRect(payload, size.width, size.height, contractForLayout);
  const palette = state.contract.palettes[payload.palette_id];
  const roles = resolvePaletteRoles(palette, state.contract);
  const typography = scaledTypography(state.contract, state.hailScalePercent);
  const visual = state.contract.visual || {};
  const glowAlpha = visual.glyphGlowAlpha != null ? visual.glyphGlowAlpha : 0.26;
  const glowStrength = state.effectParams.glowIntensity / 100;

  els.overlayGroup.style.left = rect.left + "px";
  els.overlayGroup.style.top = rect.top + "px";
  els.overlayGroup.style.width = rect.width + "px";
  els.overlayGroup.style.height = rect.height + "px";
  applyGroupBackground(roles, rect);
  els.overlayGroup.style.setProperty(
    "--overlay-glow",
    hexWithAlpha(roles.glow, glowAlpha * glowStrength),
  );
  els.overlayGroup.classList.remove("is-exiting");
  els.overlayGroup.hidden = false;
  els.overlayGroup.style.opacity = "1";
  els.overlayGroup.style.transform = "scale(1)";

  const canvas = els.overlayCanvas;
  canvas.width = Math.max(1, Math.floor(rect.width));
  canvas.height = Math.max(1, Math.floor(rect.height));

  const glyphSize = size.height * typography.glyphSizeFractionOfHeight;
  els.overlayGlyph.style.width = glyphSize + "px";
  els.overlayGlyph.style.height = glyphSize + "px";
  els.overlayGlyph.style.color = roles.accent;
  els.overlayGlyph.innerHTML = glyphMarkup(payload.glyph_id, state.contract);

  const fontSize = size.height * typography.messageFontSizeFractionOfHeight;
  const msgAlpha = roles.messageBackingOpacity != null
    ? roles.messageBackingOpacity
    : typography.messageBackingAlpha;
  els.overlayMessage.textContent = validation.value;
  els.overlayMessage.style.color = roles.text;
  els.overlayMessage.style.fontSize = fontSize + "px";
  els.overlayMessage.style.textShadow = typography.messageShadow;
  els.overlayMessage.style.background = hexWithAlpha(roles.messageBacking, msgAlpha);

  if (state.stopAnimation) {
    state.stopAnimation();
    state.stopAnimation = null;
  }
  state.stopAnimation = createOverlayAnimator(
    canvas,
    roles,
    state.effectParams,
    state.contract,
    function (frame) {
      els.overlayGlyph.style.opacity = String(frame.glyphAlpha);
      if (state.useLifecycle) {
        els.overlayGroup.style.opacity = String(Math.max(0.08, frame.intensity));
      }
    },
    {
      durationMs: state.useLifecycle ? state.lifecycleDurationMs : 0,
      useLifecycle: state.useLifecycle,
      groupBackgroundEnabled: state.groupBgEnabled,
    },
  );
}

function showPreview() {
  const payload = currentPayload();
  state.useLifecycle = true;
  state.lifecycleDurationMs = payload.duration_ms;
  renderStaticOverlay();
  if (state.hideTimer) clearTimeout(state.hideTimer);
  if (state.exitTimer) {
    clearTimeout(state.exitTimer);
    state.exitTimer = null;
  }
  state.hideTimer = setTimeout(function () {
    hideOverlay(false);
  }, payload.duration_ms);
}

function hideOverlay(instant) {
  if (instant) {
    clearOverlayImmediate();
    return;
  }
  const exitMs = state.contract.animation.exitMs || 360;
  els.overlayGroup.classList.add("is-exiting");
  if (state.stopAnimation) {
    state.stopAnimation();
    state.stopAnimation = null;
  }
  if (state.hideTimer) {
    clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }
  state.useLifecycle = false;
  if (state.exitTimer) clearTimeout(state.exitTimer);
  state.exitTimer = setTimeout(clearOverlayImmediate, exitMs);
}

function clearOverlayImmediate() {
  els.overlayGroup.hidden = true;
  els.overlayGroup.classList.remove("is-exiting");
  if (state.stopAnimation) {
    state.stopAnimation();
    state.stopAnimation = null;
  }
  if (state.hideTimer) {
    clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }
  if (state.exitTimer) {
    clearTimeout(state.exitTimer);
    state.exitTimer = null;
  }
  state.useLifecycle = false;
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

init();
