import {
  getAnimationProfile,
  isEntrancePhase,
  isExitPhase,
  LIFECYCLE_PHASES,
  requestLifecycleExit,
} from "./animation-profile.js";
import {
  BEAM_SHAPE_LABELS,
  NAMED_EFFECT_IDS,
  NAMED_EFFECT_LABELS,
  formatPresetPresenceReadout,
  formatWorkbenchDiagnostics,
  getEffectPreset,
  resolveEffectImpactFloor,
  resolveGlyphVisualSize,
  mergeEffectParams,
  namedEffectFromPresetId,
  namedEffectHint,
  previewVisualPayload,
  resolveContentHierarchy,
  resolveNamedEffectPresetId,
  resolvePaletteRoles,
  resolvePlacementPresence,
  resolvePresetPresence,
  resolvePreviewTiming,
  resolveScaleGrammar,
  resolveScaledEffectParams,
  scaledTypography,
} from "./effect-config.js";
import { getNamedEffect } from "./named-effects.js";
import { validateMessage } from "./message.js";
import { resolveCompositionBounds } from "./placement.js";
import {
  createOverlayAnimator,
  glyphMarkup,
  hexWithAlpha,
  isStableLifecyclePhase,
  resetLifecycle,
} from "./renderer.js";
import {
  formatContractSourceDiagnostics,
  formatVisualHarnessEndpointReadout,
  loadAxiomRenderPayload,
  loadHailRenderContract,
} from "./contract-loader.js";

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
  customBackgroundUrl: null,
  placementMode: "preset",
  placementPreset: "top_right",
  paletteId: "axiom_dark_cyan",
  screenPreset: "1920x1080",
  useLifecycle: false,
  holdDurationMs: null,
  lifecycleRef: { phase: "hidden", stableStart: null, exitStart: null },
  pendingLifecycleReset: false,
  effectPreset: "transporter_soft",
  namedEffectId: "transporter",
  effectParams: null,
  scaledEffectParams: null,
  presetPresence: null,
  placementPresence: null,
  effectTouched: false,
  showPaintBox: false,
  hailScaleTier: "medium",
  hailScaleManualPercent: 100,
  groupBgEnabled: false,
  groupBgShape: "rounded_rect",
  groupBgSizePercent: 100,
  groupBgOpacityPercent: 24,
  groupBgUsePaletteColor: true,
  groupBgCustomColor: "#0A3528",
  previewTimingPreset: "5s",
  previewHold: false,
  previewCustomDurationMs: 5000,
  reviewSlowMotion: false,
  reviewFreezeAtStable: false,
  reviewAutoTimedExit: true,
  contractSource: null,
  contractMetadata: null,
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
    namedEffectPills: document.getElementById("named-effect-pills"),
    showPaintBox: document.getElementById("show-paint-box"),
    paintBoxOutline: document.getElementById("paint-box-outline"),
    safeZoneOutline: document.getElementById("safe-zone-outline"),
    glyphFocusOutline: document.getElementById("glyph-focus-outline"),
    beamEnabledBtns: document.querySelectorAll("[data-beam-enabled]"),
    beamShapePills: document.getElementById("beam-shape-pills"),
    hailScaleTierBtns: document.querySelectorAll("[data-hail-scale-tier]"),
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
    previewDurationBtns: document.querySelectorAll("[data-preview-duration]"),
    previewHoldBtns: document.querySelectorAll("[data-preview-hold]"),
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
    overlayEffectField: document.getElementById("overlay-effect-field"),
    overlayContentModule: document.getElementById("overlay-content-module"),
    overlayCanvas: document.getElementById("overlay-canvas"),
    overlayGlyph: document.getElementById("overlay-glyph"),
    overlayMessage: document.getElementById("overlay-message"),
    scaleLabel: document.getElementById("scale-label"),
    presenceReadout: document.getElementById("presence-readout"),
    replayEntranceBtn: document.getElementById("replay-entrance-btn"),
    replayExitBtn: document.getElementById("replay-exit-btn"),
    reviewSlowMotionBtn: document.getElementById("review-slow-motion-btn"),
    contractSourceReadout: document.getElementById("contract-source-readout"),
    endpointContextReadout: document.getElementById("endpoint-context-readout"),
    axiomHailId: document.getElementById("axiom-hail-id"),
    loadAxiomHailBtn: document.getElementById("load-axiom-hail-btn"),
  });
}

function syncEndpointContextReadout() {
  if (!els.endpointContextReadout) {
    return;
  }
  els.endpointContextReadout.textContent = formatVisualHarnessEndpointReadout();
}

async function init() {
  try {
    cacheElements();
    syncEndpointContextReadout();
    const loaded = await loadHailRenderContract({
      proxyContractUrl: "/api/hails/render-contract",
      mirrorUrl: "/shared/hail-render-contract.json",
    });
    if (!loaded.contract || loaded.source === "error") {
      throw new Error(loaded.error || "contract load failed");
    }
    state.contract = loaded.contract;
    state.contractSource = loaded.source;
    state.contractMetadata = loaded.metadata;
    syncContractSourceReadout();
    buildPlacementGrid();
    buildPalettePills();
    buildNamedEffectPills();
    buildBeamShapePills();
    populateGlyphSelect();
    bindEvents();
    applyDefaults();
    requestAnimationFrame(function () {
      resizeStage();
      updatePayloadPreview();
    });
  } catch (err) {
    console.error("Hails preview init failed:", err);
    if (els.payloadOut) {
      els.payloadOut.textContent = JSON.stringify(
        {
          error: "init_failed",
          message: err && err.message ? err.message : String(err),
        },
        null,
        2,
      );
    }
  }
}

function syncContractSourceReadout() {
  if (!els.contractSourceReadout || !state.contractMetadata) {
    return;
  }
  els.contractSourceReadout.textContent = formatContractSourceDiagnostics(state.contractMetadata);
  els.contractSourceReadout.dataset.source = state.contractSource || "";
  els.contractSourceReadout.classList.toggle(
    "contract-source--fallback",
    state.contractSource === "local-mirror-fallback",
  );
  els.contractSourceReadout.classList.toggle(
    "contract-source--axiom",
    state.contractSource === "axiom-api",
  );
}

async function loadAxiomHailIntoWorkbench() {
  if (!els.axiomHailId) {
    return;
  }
  const hailId = (els.axiomHailId.value || "").trim();
  if (!hailId) {
    return;
  }
  try {
    const payload = await loadAxiomRenderPayload(hailId, {
      proxyPayloadBase: "/api/hails",
    });
    if (payload.message) {
      els.message.value = payload.message;
    }
    if (payload.glyph_id && els.glyph.querySelector('option[value="' + payload.glyph_id + '"]')) {
      els.glyph.value = payload.glyph_id;
    }
    if (payload.effect_id) {
      applyNamedEffectToState(payload.effect_id);
      buildNamedEffectPills();
      syncEffectUiFromState();
    }
    if (payload.palette_id) {
      state.paletteId = payload.palette_id;
      buildPalettePills();
    }
    if (payload.size_tier) {
      state.hailScaleTier = payload.size_tier;
      document.querySelectorAll("[data-hail-scale-tier]").forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-hail-scale-tier") === payload.size_tier);
      });
    }
    if (payload.duration_ms != null) {
      state.previewCustomDurationMs = Number(payload.duration_ms);
      state.previewTimingPreset = "custom";
      els.duration.value = String(payload.duration_ms);
      document.querySelectorAll("[data-preview-duration]").forEach(function (btn) {
        btn.classList.remove("active");
      });
    }
    refreshScaledEffectParams();
    updatePayloadPreview();
  } catch (err) {
    console.error("Axiom hail payload load failed:", err);
    if (els.contractSourceReadout) {
      els.contractSourceReadout.textContent +=
        " · payload error: " + (err && err.message ? err.message : String(err));
    }
  }
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

function buildNamedEffectPills() {
  els.namedEffectPills.innerHTML = NAMED_EFFECT_IDS.map(function (id) {
    const title = namedEffectHint(id, state.contract) || NAMED_EFFECT_LABELS[id] || id;
    return (
      '<button type="button" data-named-effect="' + id + '" title="' +
      escapeAttr(title) +
      '">' +
      (NAMED_EFFECT_LABELS[id] || id) +
      "</button>"
    );
  }).join("");
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
  const defaultNamed =
    (pv.defaultNamedEffectId && NAMED_EFFECT_IDS.indexOf(pv.defaultNamedEffectId) >= 0
      ? pv.defaultNamedEffectId
      : null) ||
    (pv.defaultNamedEffect && NAMED_EFFECT_IDS.indexOf(pv.defaultNamedEffect) >= 0
      ? pv.defaultNamedEffect
      : null);
  state.namedEffectId =
    defaultNamed || namedEffectFromPresetId(state.effectPreset, state.contract);
  state.effectPreset = resolveNamedEffectPresetId(state.namedEffectId);
  state.hailScaleTier = pv.defaultHailScaleTier || d.hail_scale_tier || "medium";
  state.hailScaleManualPercent =
    (pv.scaleGrammar && pv.scaleGrammar.manualPercent && pv.scaleGrammar.manualPercent.default) || 100;
  state.effectParams = getEffectPreset(state.contract, state.effectPreset);
  state.effectTouched = false;
  els.glyph.value = d.glyph_id;
  els.message.value = d.message;
  const pt = pv.previewTiming || {};
  state.previewTimingPreset = pt.defaultPreset || "5s";
  state.previewHold = pt.defaultHold === true;
  state.previewCustomDurationMs = d.duration_ms || 5000;
  els.duration.value = String(state.previewCustomDurationMs);
  els.xPercent.value = "72";
  els.yPercent.value = "18";
  els.hailScale.min = String(
    (pv.scaleGrammar && pv.scaleGrammar.manualPercent && pv.scaleGrammar.manualPercent.min) || 50,
  );
  els.hailScale.max = String(
    (pv.scaleGrammar && pv.scaleGrammar.manualPercent && pv.scaleGrammar.manualPercent.max) || 150,
  );
  refreshScaledEffectParams();
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

function applyNamedEffectToState(namedEffectId) {
  state.namedEffectId = namedEffectId;
  state.effectPreset = resolveNamedEffectPresetId(namedEffectId);
  state.effectParams = getEffectPreset(state.contract, state.effectPreset);
  state.effectTouched = false;
  refreshScaledEffectParams();
  syncEffectUiFromState();
}

function applyPresetToState(presetId) {
  state.effectPreset = presetId;
  state.namedEffectId = namedEffectFromPresetId(presetId, state.contract);
  state.effectParams = getEffectPreset(state.contract, presetId);
  state.effectTouched = false;
  refreshScaledEffectParams();
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
  if (els.namedEffectPills) {
    els.namedEffectPills.querySelectorAll("[data-named-effect]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.namedEffect === state.namedEffectId);
    });
  }
}

function currentScaleGrammar() {
  return resolveScaleGrammar(
    state.contract,
    state.hailScaleTier,
    state.hailScaleManualPercent,
  );
}

function currentPlacementId() {
  if (state.placementMode === state.contract.placement.modeCustom) {
    return "custom";
  }
  return state.placementPreset;
}

function refreshScaledEffectParams() {
  const resolved = resolveScaledEffectParams(
    state.contract,
    state.effectParams,
    state.hailScaleTier,
    state.hailScaleManualPercent,
    state.effectPreset,
    currentPlacementId(),
  );
  state.scaledEffectParams = resolved.scaled;
  state.presetPresence = resolved.presetPresence;
  state.placementPresence = resolved.placementPresence;
  syncPresenceReadout();
}

function syncPresenceReadout(layoutRegions, glyphVisualPx, animProfile) {
  if (!els.presenceReadout) {
    return;
  }
  const presence =
    state.presetPresence || resolvePresetPresence(state.contract, state.effectPreset);
  const effectHint = formatPresetPresenceReadout(
    presence,
    state.namedEffectId,
    state.contract,
  );
  const diagnostics = formatWorkbenchDiagnostics(
    state,
    state.contract,
    layoutRegions || null,
    glyphVisualPx,
    animProfile || null,
  );
  els.presenceReadout.textContent = effectHint + "\n" + diagnostics;
}

/** Position overlay group to Paint Box; content module fills the same box. */
function layoutCompositionBounds(composition) {
  const box = composition.paintBox || composition.effect;

  els.overlayGroup.style.left = box.left + "px";
  els.overlayGroup.style.top = box.top + "px";
  els.overlayGroup.style.width = box.width + "px";
  els.overlayGroup.style.height = box.height + "px";

  els.overlayContentModule.style.left = "0";
  els.overlayContentModule.style.top = "0";
  els.overlayContentModule.style.width = "100%";
  els.overlayContentModule.style.height = "100%";

  els.overlayCanvas.style.left = "0";
  els.overlayCanvas.style.top = "0";
  els.overlayCanvas.style.width = "100%";
  els.overlayCanvas.style.height = "100%";

  syncLayoutDebugOutlines(composition);

  return {
    width: Math.max(1, Math.floor(box.width)),
    height: Math.max(1, Math.floor(box.height)),
    contentWidth: box.width,
    contentHeight: box.height,
  };
}

function syncLayoutDebugOutlines(composition) {
  const show = state.showPaintBox === true;
  const box = composition.paintBox || composition.content;
  const regions = composition.layoutRegions;
  const outlines = [
    { el: els.paintBoxOutline, rect: box, className: "paint-box-outline" },
    { el: els.safeZoneOutline, rect: regions && regions.safeZone, className: "safe-zone-outline" },
    {
      el: els.glyphFocusOutline,
      rect: regions && regions.glyphFocus,
      className: "glyph-focus-outline",
    },
  ];
  outlines.forEach(function (item) {
    if (!item.el) {
      return;
    }
    item.el.hidden = !show;
    item.el.setAttribute("aria-hidden", show ? "false" : "true");
    if (!show || !item.rect || !box) {
      return;
    }
    const leftPct = (item.rect.left / box.width) * 100;
    const topPct = (item.rect.top / box.height) * 100;
    const widthPct = (item.rect.width / box.width) * 100;
    const heightPct = (item.rect.height / box.height) * 100;
    item.el.style.left = leftPct + "%";
    item.el.style.top = topPct + "%";
    item.el.style.width = widthPct + "%";
    item.el.style.height = heightPct + "%";
  });
}

function syncPaintBoxToggleUi() {
  if (els.showPaintBox) {
    els.showPaintBox.checked = state.showPaintBox === true;
  }
}

function syncHailScaleUi() {
  els.hailScale.value = String(state.hailScaleManualPercent);
  els.hailScaleLabel.textContent = state.hailScaleManualPercent + "%";
  els.hailScaleTierBtns.forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.hailScaleTier === state.hailScaleTier);
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

function syncPreviewTimingUi() {
  els.previewDurationBtns.forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.previewDuration === state.previewTimingPreset);
  });
  els.previewHoldBtns.forEach(function (btn) {
    const on = btn.dataset.previewHold === "on";
    btn.classList.toggle("active", on === state.previewHold);
  });
}

function syncAllUi() {
  syncPlacementModeUi();
  syncPlacementPresetUi();
  syncPaletteUi();
  syncScreenUi();
  syncEffectUiFromState();
  syncHailScaleUi();
  syncGroupBgUi();
  syncPreviewTimingUi();
  syncPaintBoxToggleUi();
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

  els.namedEffectPills.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-named-effect]");
    if (!btn) return;
    applyNamedEffectToState(btn.dataset.namedEffect);
    if (!els.overlayGroup.hidden) {
      showPreview();
      return;
    }
    onControlChange();
  });

  if (els.showPaintBox) {
    els.showPaintBox.addEventListener("change", function () {
      state.showPaintBox = els.showPaintBox.checked;
      if (!els.overlayGroup.hidden) {
        renderStaticOverlay();
      }
    });
  }

  els.beamEnabledBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.effectTouched = true;
      state.effectParams.beamEnabled = btn.dataset.beamEnabled === "on";
      if (!state.effectParams.beamEnabled) {
        state.effectParams.beamShape = "none";
      } else if (state.effectParams.beamShape === "none") {
        state.effectParams.beamShape = "shimmer";
      }
      refreshScaledEffectParams();
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

  els.hailScaleTierBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.hailScaleTier = btn.dataset.hailScaleTier;
      state.hailScaleManualPercent = 100;
      refreshScaledEffectParams();
      syncHailScaleUi();
      onControlChange();
      resizeStage();
    });
  });

  els.hailScale.addEventListener("input", function () {
    state.hailScaleManualPercent = clampInt(
      els.hailScale.value,
      50,
      150,
      100,
    );
    refreshScaledEffectParams();
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

  els.previewDurationBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.previewTimingPreset = btn.dataset.previewDuration;
      syncPreviewTimingUi();
      onControlChange();
    });
  });

  els.previewHoldBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.previewHold = btn.dataset.previewHold === "on";
      syncPreviewTimingUi();
      onControlChange();
    });
  });

  els.duration.addEventListener("input", function () {
    state.previewTimingPreset = "custom";
    state.previewCustomDurationMs = clampInt(els.duration.value, 1000, 120000, 5000);
    syncPreviewTimingUi();
    onControlChange();
  });
  els.duration.addEventListener("change", function () {
    state.previewTimingPreset = "custom";
    state.previewCustomDurationMs = clampInt(els.duration.value, 1000, 120000, 5000);
    els.duration.value = String(state.previewCustomDurationMs);
    syncPreviewTimingUi();
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
    state.reviewFreezeAtStable = false;
    hideOverlay(false);
  });
  if (els.replayEntranceBtn) {
    els.replayEntranceBtn.addEventListener("click", replayEntrance);
  }
  if (els.replayExitBtn) {
    els.replayExitBtn.addEventListener("click", replayExit);
  }
  if (els.reviewSlowMotionBtn) {
    els.reviewSlowMotionBtn.addEventListener("click", function () {
      state.reviewSlowMotion = !state.reviewSlowMotion;
      els.reviewSlowMotionBtn.classList.toggle("active", state.reviewSlowMotion);
      els.reviewSlowMotionBtn.setAttribute(
        "aria-pressed",
        state.reviewSlowMotion ? "true" : "false",
      );
      if (!els.overlayGroup.hidden) {
        renderStaticOverlay({ skipVisualReset: true });
      }
    });
  }
  if (els.loadAxiomHailBtn) {
    els.loadAxiomHailBtn.addEventListener("click", loadAxiomHailIntoWorkbench);
  }
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
  refreshScaledEffectParams();
  updatePayloadPreview();
  if (!els.overlayGroup.hidden && state.useLifecycle) {
    renderStaticOverlay({ skipVisualReset: true });
    return;
  }
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
  const timing = resolvePreviewTiming(state, state.contract);
  const payload = {
    hail_id: state.contract.previewDefaults.hail_id,
    effect_id: state.namedEffectId,
    glyph_id: els.glyph.value,
    palette_id: state.paletteId,
    message: els.message.value,
    duration_ms: timing.duration_ms_for_payload,
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

function renderStaticOverlay(renderOpts) {
  const ro = renderOpts || {};
  const skipVisualReset = ro.skipVisualReset === true;

  applyBackground();
  readEffectParamsFromControls();
  refreshScaledEffectParams();
  const payload = currentPayload();
  const validation = validateMessage(payload.message, state.contract.message.maxLength);
  if (!validation.ok) {
    hideOverlay(true);
    return;
  }

  const size = screenSize();
  const placementPresence = state.placementPresence || resolvePlacementPresence(
    state.contract,
    currentPlacementId(),
  );
  const composition = resolveCompositionBounds(
    payload,
    size.width,
    size.height,
    state.contract,
    {
      safeOffsetFraction: placementPresence.safeOffsetFraction,
      tierId: state.hailScaleTier,
      manualPercent: state.hailScaleManualPercent,
    },
    placementPresence,
  );
  const palette = state.contract.palettes[payload.palette_id];
  const roles = resolvePaletteRoles(palette, state.contract);
  const grammar = currentScaleGrammar();
  const typography = scaledTypography(state.contract, grammar);
  const hierarchy = resolveContentHierarchy(
    state.contract,
    state.hailScaleTier,
    state.hailScaleManualPercent,
    state.effectPreset,
    state.groupBgEnabled,
  );
  const visual = state.contract.visual || {};
  const glowAlpha = visual.glyphGlowAlpha != null ? visual.glyphGlowAlpha : 0.22;
  const glowStrength = state.scaledEffectParams.glowIntensity / 100;
  const anchorGlowAlpha =
    glowAlpha *
    glowStrength *
    hierarchy.anchorWeight *
    Math.sqrt(hierarchy.glowRadiusScale);

  const layout = layoutCompositionBounds(composition);
  const glyphSize = resolveGlyphVisualSize(
    state.contract,
    state.hailScaleTier,
    state.hailScaleManualPercent,
    layout.contentHeight,
  );
  applyGroupBackground(roles, {
    width: layout.contentWidth,
    height: layout.contentHeight,
  });
  els.overlayGroup.style.setProperty("--anchor-weight", String(hierarchy.anchorWeight));
  els.overlayGroup.style.setProperty(
    "--message-weight",
    String(hierarchy.messageWeight != null ? hierarchy.messageWeight : 0.36),
  );
  els.overlayGroup.style.setProperty(
    "--glyph-focus-weight",
    String(hierarchy.glyphWeight != null ? hierarchy.glyphWeight : hierarchy.glyphFocusWeight || 0.72),
  );
  els.overlayGroup.style.setProperty(
    "--glyph-visual-px",
    String(glyphSize),
  );
  els.overlayGroup.style.setProperty(
    "--anchor-message-gap",
    Math.round(
      size.height * hierarchy.anchorGapFraction * hierarchy.messagePaddingMul,
    ) + "px",
  );
  if (composition.layoutRegions && composition.layoutRegions.glyphFocus && layout.contentHeight) {
    const gf = composition.layoutRegions.glyphFocus;
    const topPct = (gf.top / layout.contentHeight) * 100;
    els.overlayGroup.style.setProperty("--glyph-focus-top", topPct + "%");
  }
  els.overlayGroup.style.setProperty(
    "--overlay-glow",
    hexWithAlpha(roles.glow, anchorGlowAlpha),
  );
  els.overlayGroup.style.setProperty(
    "--overlay-glow-halo",
    hexWithAlpha(roles.glow, anchorGlowAlpha * 0.38),
  );
  if (!skipVisualReset) {
    els.overlayGroup.classList.remove("is-exiting");
    els.overlayGroup.hidden = false;
    els.overlayGroup.style.opacity = "1";
    els.overlayGroup.style.transform = "scale(1)";
  }

  const canvas = els.overlayCanvas;
  canvas.width = layout.width;
  canvas.height = layout.height;

  els.overlayGlyph.style.width = glyphSize + "px";
  els.overlayGlyph.style.height = glyphSize + "px";
  els.overlayGlyph.style.color = roles.accent;
  els.overlayGlyph.innerHTML = glyphMarkup(payload.glyph_id, state.contract);

  const fontSize = size.height * typography.messageFontSizeFractionOfHeight;
  const baseMsgAlpha = roles.messageBackingOpacity != null
    ? roles.messageBackingOpacity
    : typography.messageBackingAlpha;
  const msgAlpha = Math.min(
    0.52,
    baseMsgAlpha * hierarchy.messageBackingEmphasis * (0.72 + hierarchy.messageWeight * 0.14),
  );
  els.overlayMessage.textContent = validation.value;
  els.overlayMessage.style.color = roles.text;
  els.overlayMessage.style.fontSize = fontSize + "px";
  els.overlayMessage.style.fontWeight = String(hierarchy.messageFontWeight);
  els.overlayMessage.style.textShadow = typography.messageShadow;
  els.overlayMessage.style.background = hexWithAlpha(
    roles.messageBacking,
    msgAlpha,
  );
  const padMul = hierarchy.messagePaddingMul || 1;
  els.overlayMessage.style.padding =
    Math.round(4 * padMul) + "px " + Math.round(8 * padMul) + "px";
  els.overlayMessage.style.marginTop = "0";
  els.overlayMessage.classList.toggle("overlay-message--subtle", !state.groupBgEnabled);
  els.overlayMessage.classList.toggle(
    "overlay-message--with-group-bg",
    state.groupBgEnabled,
  );

  if (state.stopAnimation) {
    state.stopAnimation();
    state.stopAnimation = null;
  }

  if (state.pendingLifecycleReset) {
    resetLifecycle(state.lifecycleRef);
    state.pendingLifecycleReset = false;
  }

  const animProfile = getAnimationProfile(state.contract, state.effectPreset);
  const holdDurationMs = state.useLifecycle ? state.holdDurationMs : null;
  const reviewGrammar = Object.assign({}, grammar, {
    reviewTimeScale: state.reviewSlowMotion ? 0.5 : 1,
    freezeAtStable: state.reviewFreezeAtStable,
  });
  const staticFrame = state.useLifecycle
    ? null
    : {
        phase: "stable_object",
        particleMode: "none",
        phaseProgress: 0,
        beamScale: 0,
        beamIntensity: 0,
        objectLocked: true,
        glyphAlpha: 1,
        glyphScale: 1,
        messageAlpha: 1,
        overallIntensity: 1,
        holdPulse: 1,
        glyphResidual: state.scaledEffectParams.shimmerIntensity,
      };

  syncPresenceReadout(composition.layoutRegions, glyphSize, animProfile);

  const namedEffect = getNamedEffect(state.contract, state.namedEffectId);
  const effectParamsWithLayout = Object.assign({}, state.scaledEffectParams, {
    _layoutRegions: composition.layoutRegions,
    _effectImpactFloor: resolveEffectImpactFloor(state.contract, state.namedEffectId),
    _fieldStyle: namedEffect.fieldStyle,
    _particleStyle: namedEffect.particleStyle,
    _glyphResolveStyle: namedEffect.glyphResolveStyle,
    _messageRevealStyle: namedEffect.messageRevealStyle,
  });

  state.stopAnimation = createOverlayAnimator(
    canvas,
    roles,
    effectParamsWithLayout,
    state.contract,
    state.lifecycleRef,
    animProfile,
    reviewGrammar,
    holdDurationMs,
    function (frame) {
      const stable = isStableLifecyclePhase(frame.phase);
      const entering = isEntrancePhase(frame.phase);
      const exiting = isExitPhase(frame.phase);
      const beamOutSeed = frame.phase === LIFECYCLE_PHASES.BEAM_OUT_SEED;
      const objectLocked = stable || beamOutSeed || frame.objectLocked === true;
      const stageGlyph = entering || (exiting && !beamOutSeed);

      els.overlayGroup.classList.toggle("is-stable-object", stable);
      els.overlayGroup.classList.toggle(
        "is-stable-object--minimal",
        stable && state.scaledEffectParams.shimmerIntensity < 0.22,
      );
      els.overlayGroup.classList.toggle("is-exiting", beamOutSeed || exiting);

      const glyphAlpha = objectLocked ? 1 : frame.glyphAlpha;
      const messageAlpha = objectLocked ? 1 : frame.messageAlpha;
      const glyphScale = objectLocked ? 1 : frame.glyphScale;

      els.overlayGlyph.style.opacity = String(glyphAlpha);
      els.overlayMessage.style.opacity = String(messageAlpha);
      els.overlayGlyph.style.transition = stageGlyph ? "none" : "";
      els.overlayMessage.style.transition = stageGlyph ? "none" : "";

      if (stable) {
        els.overlayGlyph.style.transformOrigin = "center center";
        els.overlayGlyph.style.transform = "scale(1)";
        els.overlayGlyph.style.clipPath = "";
        els.overlayGroup.style.setProperty(
          "--glyph-residual-strength",
          String(state.scaledEffectParams.shimmerIntensity),
        );
      } else if (entering) {
        els.overlayGlyph.style.transformOrigin = "center center";
        els.overlayGlyph.style.transform = "scale(" + glyphScale + ")";
        if (
          frame.glyphResolveStyle === "scan_resolve" &&
          frame.glyphClipReveal != null &&
          frame.glyphClipReveal < 1
        ) {
          const revealPct = Math.round(frame.glyphClipReveal * 100);
          els.overlayGlyph.style.clipPath =
            "inset(" + (100 - revealPct) + "% 0 0 0)";
        } else {
          els.overlayGlyph.style.clipPath = "";
        }
      } else if (exiting && !beamOutSeed) {
        els.overlayGlyph.style.transform = "scale(" + glyphScale + ")";
        if (
          frame.glyphClipReveal != null &&
          frame.glyphClipReveal < 1 &&
          (frame.glyphResolveStyle === "scan_resolve" ||
            state.namedEffectId === "transporter")
        ) {
          const revealPct = Math.round(frame.glyphClipReveal * 100);
          els.overlayGlyph.style.clipPath =
            "inset(" + (100 - revealPct) + "% 0 0 0)";
        } else {
          els.overlayGlyph.style.clipPath = "";
        }
      } else {
        els.overlayGlyph.style.transform = "scale(1)";
      }

      if (state.useLifecycle && entering) {
        els.overlayGroup.style.opacity = String(Math.max(0.12, frame.intensity));
      } else {
        els.overlayGroup.style.opacity = "1";
      }
    },
    function () {
      clearOverlayImmediate();
    },
    {
      autoTimedExit:
        state.useLifecycle && state.reviewAutoTimedExit && !state.reviewFreezeAtStable,
      groupBackgroundEnabled: state.groupBgEnabled,
      staticFrame: staticFrame,
      hailSizeTier: state.hailScaleTier,
      effectId: state.namedEffectId,
      layoutRegions: composition.layoutRegions,
      effectImpactFloor: resolveEffectImpactFloor(state.contract, state.namedEffectId),
      fieldStyle: namedEffect.fieldStyle,
      glyphResolveStyle: namedEffect.glyphResolveStyle,
    },
  );
}

function showPreview() {
  const timing = resolvePreviewTiming(state, state.contract);
  state.useLifecycle = true;
  state.holdDurationMs = timing.hold ? null : timing.stable_hold_ms;
  if (!state.reviewFreezeAtStable) {
    state.reviewAutoTimedExit = !timing.hold;
  }
  state.pendingLifecycleReset = true;
  renderStaticOverlay();
}

function replayEntrance() {
  state.reviewFreezeAtStable = true;
  state.reviewAutoTimedExit = false;
  showPreview();
}

function replayExit() {
  state.reviewFreezeAtStable = false;
  state.reviewAutoTimedExit = false;
  state.holdDurationMs = null;
  if (els.overlayGroup.hidden) {
    state.lifecycleRef.reviewSkipToStable = true;
    showPreview();
    requestAnimationFrame(function () {
      requestLifecycleExit(state.lifecycleRef);
    });
    return;
  }
  state.lifecycleRef.phase = LIFECYCLE_PHASES.STABLE;
  state.lifecycleRef.stableStart = performance.now();
  requestLifecycleExit(state.lifecycleRef);
  if (!state.stopAnimation) {
    renderStaticOverlay({ skipVisualReset: true });
  }
}

function hideOverlay(instant) {
  if (instant) {
    clearOverlayImmediate();
    return;
  }
  if (els.overlayGroup.hidden || isExitPhase(state.lifecycleRef.phase)) {
    return;
  }
  const wasStatic = !state.useLifecycle;
  state.useLifecycle = true;
  state.holdDurationMs = null;
  requestLifecycleExit(state.lifecycleRef);
  if (wasStatic) {
    renderStaticOverlay({ skipVisualReset: true });
  }
}

function clearOverlayImmediate() {
  if (state.stopAnimation) {
    state.stopAnimation();
    state.stopAnimation = null;
  }
  const canvas = els.overlayCanvas;
  if (canvas && canvas.width > 0 && canvas.height > 0) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  els.overlayGroup.hidden = true;
  els.overlayGroup.classList.remove(
    "is-exiting",
    "is-stable-object",
    "is-stable-object--minimal",
  );
  els.overlayGroup.style.opacity = "1";
  els.overlayGlyph.style.transform = "scale(1)";
  els.overlayGlyph.style.opacity = "1";
  els.overlayGlyph.style.clipPath = "";
  els.overlayMessage.style.opacity = "1";
  state.useLifecycle = false;
  state.holdDurationMs = null;
  state.lifecycleRef.phase = "hidden";
  state.lifecycleRef.stableStart = null;
  state.lifecycleRef.exitStart = null;
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

init();
