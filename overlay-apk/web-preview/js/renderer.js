import {
  advanceLifecycle,
  resetLifecycle,
} from "./animation-profile.js";
import { resolveLifecycleFieldEnvelope } from "./effect-config.js";

const PARTICLE_SEED = 42;
const PARTICLE_BUDGET_HARD_CAP = 60;

/** Size-aware particle budgets — canon caps from Axiom Hails contract. */
const PARTICLE_BUDGET_BY_SIZE = {
  small: { stableMax: 4, heavyMin: 12, heavyMax: 20 },
  medium: { stableMax: 8, heavyMin: 20, heavyMax: 36 },
  large: { stableMax: 12, heavyMin: 28, heavyMax: 48 },
};

/** Paint-box-local field envelope — no viewport expansion from transport_event_scale. */
const PAINT_BOX_FIELD_CAPS = {
  effect: 1.12,
  beam: 1.18,
  travel: 1.08,
  glow: 1.1,
};

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

/** Clamp lifecycle field scales so draw path never expands beyond Paint Box. */
function clampPaintBoxField(field) {
  return {
    effect: Math.min(field.effect, PAINT_BOX_FIELD_CAPS.effect),
    beam: Math.min(field.beam, PAINT_BOX_FIELD_CAPS.beam),
    travel: Math.min(field.travel, PAINT_BOX_FIELD_CAPS.travel),
    glow: Math.min(field.glow, PAINT_BOX_FIELD_CAPS.glow),
  };
}

function normalizeBudgetSize(size) {
  const s = String(size || "medium").toLowerCase();
  if (s === "s" || s === "small") {
    return "small";
  }
  if (s === "l" || s === "large") {
    return "large";
  }
  return "medium";
}

function normalizeEffectId(effect) {
  const id = String(effect || "transporter").toLowerCase();
  if (id === "none" || id.includes("none")) {
    return "none";
  }
  if (id.includes("pop")) {
    return "pop";
  }
  if (id.includes("burst")) {
    return "burst";
  }
  if (id.includes("transporter")) {
    return "transporter";
  }
  return "transporter";
}

function isZeroWorkLifecyclePhase(phase) {
  return phase === "hidden" || phase === "cleared";
}

/** Resolve hail size + effect id for budget — opts/params from L2/L3 when present. */
function resolveBudgetContext(effectParams, opts) {
  const size =
    (opts && opts.hailSizeTier) ||
    (effectParams && effectParams._budgetSize) ||
    (effectParams && effectParams._grammar && effectParams._grammar.tierId) ||
    "medium";
  const effect =
    (opts && opts.effectId) ||
    (effectParams && effectParams._effectId) ||
    (effectParams && effectParams._effectPreset) ||
    "transporter";
  return { size: normalizeBudgetSize(size), effect: normalizeEffectId(effect) };
}

/**
 * Size + effect + lifecycle phase particle budget.
 * Hard cap 60; stable residual glyph-local; heavy entrance/exit size-aware.
 */
export function particleCountForBudget(size, phase, effect, mode, params) {
  if (isZeroWorkLifecyclePhase(phase)) {
    return 0;
  }
  const tier = PARTICLE_BUDGET_BY_SIZE[normalizeBudgetSize(size)] || PARTICLE_BUDGET_BY_SIZE.medium;
  const effectId = normalizeEffectId(effect);
  const stable = isStableLifecyclePhase(phase);

  if (effectId === "none") {
    return 0;
  }

  const heavy =
    isTransportLifecyclePhase(phase) &&
    !stable &&
    phase !== "hold";

  let maxCount;
  if (stable) {
    maxCount = tier.stableMax;
  } else if (heavy) {
    maxCount = tier.heavyMax;
  } else {
    maxCount = Math.round((tier.heavyMin + tier.heavyMax) * 0.5);
  }

  if (effectId === "pop") {
    maxCount = stable ? 0 : Math.min(6, maxCount);
  } else if (effectId === "burst") {
    maxCount = stable ? Math.min(4, tier.stableMax) : maxCount;
  } else if (effectId === "transporter" && stable) {
    maxCount = 0;
  }

  const density = ((params && params.particleDensity) || 45) / 100;
  let count = Math.round(2 + density * (heavy ? 11 : stable ? 3 : 7));
  if (mode === "spark_burst") {
    count = Math.min(6, Math.round(count * 0.55));
  }
  if (mode === "radial_burst") {
    count = Math.round(count * 0.85);
  }
  if (mode === "none") {
    return 0;
  }

  const minCount = stable ? 0 : heavy ? Math.min(tier.heavyMin, maxCount) : 2;
  return Math.min(
    PARTICLE_BUDGET_HARD_CAP,
    maxCount,
    Math.max(minCount, count),
  );
}

/** Base transport field scales from effect-config (tier × preset × placement). */
function resolveFieldEnvelope(params) {
  return {
    effect: params.transportEventScale != null
      ? params.transportEventScale
      : params.effectFieldScale != null
        ? params.effectFieldScale
        : 1,
    beam: params.beamFieldScale != null ? params.beamFieldScale : 1,
    travel: params.particleTravelScale != null ? params.particleTravelScale : 1,
    glow: params.glowRadiusScale != null ? params.glowRadiusScale : 1,
  };
}

/** Lane 5 + L2 — transport envelope; beam-in seed uses tighter field via fieldMul. */
function resolveDrawFieldEnvelope(params, lifecyclePhase, frame) {
  const fieldScales = params._fieldScales || {
    transportEventScale: params.transportEventScale != null
      ? params.transportEventScale
      : params.effectFieldScale,
    stableEffectFieldScale: params.stableEffectFieldScale,
    beamFieldScale: params.beamFieldScale,
    particleTravelScale: params.particleTravelScale,
    glowRadiusScale: params.glowRadiusScale,
    stableGlowRadiusScale: params.stableGlowRadiusScale,
  };
  const base = resolveLifecycleFieldEnvelope(fieldScales, lifecyclePhase);
  const fieldMul = frame && frame.fieldMul != null ? frame.fieldMul : 1;
  if (lifecyclePhase === "beam_in_seed") {
    return clampPaintBoxField({
      effect: base.effect * fieldMul * 0.75,
      beam: base.beam * fieldMul,
      travel: base.travel * 0.85,
      glow: base.glow * fieldMul,
    });
  }
  if (lifecyclePhase === "materializing_object") {
    return clampPaintBoxField({
      effect: base.effect * fieldMul,
      beam: base.beam * fieldMul,
      travel: base.travel,
      glow: base.glow * fieldMul,
    });
  }
  return clampPaintBoxField(base);
}

/** Draw-time beam envelope — params already carry grammar/preset/placement beam muls. */
function rendererBeamEnvelope(beamScale) {
  return 1 + Math.max(0, beamScale - 1) * 0.42;
}

function resolveDrawLayout(width, height, opts, effectParams) {
  return (opts && opts.layoutRegions) || (effectParams && effectParams._layoutRegions) || null;
}

function resolveGlyphAnchor(layout, width, height, effectParams) {
  if (layout && layout.glyphFocus) {
    return {
      cx: layout.glyphFocus.centerX,
      cy: layout.glyphFocus.centerY,
    };
  }
  return {
    cx: width / 2,
    cy: height * (0.32 + effectParams.beamHeight * 0.08),
  };
}

/** Transporter beam derives from glyph focus envelope, capped to Safe Effect Zone. */
function resolveBeamBounds(layout, width, height, params, glowReach) {
  if (layout && layout.transporterBeamEnvelope) {
    const env = layout.transporterBeamEnvelope;
    const widthMul = 0.82 + (params.beamWidth / 0.2) * 0.12;
    const bw = env.width * widthMul * Math.sqrt(glowReach || 1);
    const bh = env.height;
    return {
      cx: env.centerX,
      cy: env.centerY,
      bw: bw,
      bh: bh,
      top: env.centerY - bh * 0.5,
      bottom: env.centerY + bh * 0.5,
    };
  }
  const bh = height * params.beamHeight;
  const cy = height * (0.32 + params.beamHeight * 0.08);
  return {
    cx: width / 2,
    cy: cy,
    bw: width * params.beamWidth * Math.sqrt(glowReach || 1),
    bh: bh,
    top: cy - bh * 0.55,
    bottom: cy + bh * 0.35,
  };
}

function safeZoneEdgeAlpha(x, y, layout) {
  if (!layout || !layout.safeZone) {
    return 1;
  }
  const sz = layout.safeZone;
  const fade = Math.min(sz.width, sz.height) * 0.1;
  const dx = Math.min(x - sz.left, sz.left + sz.width - x);
  const dy = Math.min(y - sz.top, sz.top + sz.height - y);
  const edge = Math.min(dx, dy);
  if (edge >= fade) {
    return 1;
  }
  return Math.max(0, edge / fade);
}

/** Draw-time particle travel — extends drift without increasing count. */
function rendererTravelEnvelope(travelScale) {
  return 1 + Math.max(0, travelScale - 1) * 0.72;
}

/** Stable object phase — hold (legacy) or explicit stable_object from lifecycle model. */
function isStableLifecyclePhase(phase) {
  return phase === "hold" || phase === "stable_object";
}

/** Transport/materialization phases — beam and field effects remain active. */
function isTransportLifecyclePhase(phase) {
  return (
    phase === "enter" ||
    phase === "beam_in_seed" ||
    phase === "materializing_object" ||
    phase === "exit" ||
    phase === "beam_out_seed" ||
    phase === "dematerializing_object"
  );
}

export function glyphMarkup(glyphId, contract) {
  if (glyphId === "default") {
    return (
      '<svg class="hail-glyph-svg" viewBox="0 0 96 96" aria-hidden="true">' +
      '<path fill="currentColor" d="M48,14 C58,14 66,22 66,34 C66,46 58,54 48,54 C38,54 30,46 30,34 C30,22 38,14 48,14 Z"/>' +
      '<path fill="currentColor" d="M36,56 C36,68 42,78 48,82 C54,78 60,68 60,56 L56,56 C56,64 52,70 48,72 C44,70 40,64 40,56 Z"/>' +
      "</svg>"
    );
  }
  if (glyphId === "default") {
    return (
      '<svg class="hail-glyph-svg" viewBox="0 0 96 96" aria-hidden="true">' +
      '<ellipse cx="48" cy="42" rx="24" ry="16" fill="none" stroke="currentColor" stroke-width="4.5"/>' +
      '<circle cx="48" cy="42" r="8" fill="currentColor" opacity="0.85"/>' +
      '<circle cx="51" cy="39" r="2.5" fill="currentColor" opacity="0.85"/>' +
      '<path fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M34,66 L42,74 L62,50"/>' +
      "</svg>"
    );
  }
  const emoji = contract.glyphs.emojiFallback[glyphId] || contract.glyphs.emojiFallback.default;
  return '<span class="hail-glyph-emoji" aria-hidden="true">' + emoji + "</span>";
}

/** Subtle glyph-local shimmer — small radius only, not full-field drift. */
function drawGlyphLocalResidual(ctx, cx, cy, animPhase, roles, params, intensity) {
  const shimmer = params.shimmerIntensity != null ? params.shimmerIntensity : 0;
  if (shimmer < 0.2 || intensity <= 0.01) {
    return;
  }
  const pulse = 0.5 + Math.sin(animPhase * Math.PI * 2) * 0.5;
  const baseR = Math.min(ctx.canvas.width, ctx.canvas.height);
  const r = baseR * (0.045 + shimmer * 0.028);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(
    0,
    hexWithAlpha(roles.accent, 0.1 * shimmer * intensity * (0.65 + pulse * 0.35)),
  );
  grad.addColorStop(0.5, hexWithAlpha(roles.glow || roles.primary, 0.04 * shimmer * intensity));
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const sparkCount = shimmer > 0.45 ? 3 : shimmer > 0.28 ? 2 : 1;
  for (let i = 0; i < sparkCount; i += 1) {
    const angle = animPhase * Math.PI * 2 + (i / sparkCount) * Math.PI * 2;
    const dist = r * (0.32 + Math.sin(animPhase * 3.2 + i * 1.7) * 0.12);
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist * 0.55;
    const sparkAlpha = 0.07 * shimmer * intensity * (0.55 + pulse * 0.45);
    if (sparkAlpha <= 0.01) {
      continue;
    }
    ctx.beginPath();
    ctx.fillStyle = hexWithAlpha(roles.particle, sparkAlpha);
    ctx.arc(sx, sy, 0.65 + shimmer * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawHailEffect(ctx, width, height, phase, roles, effectParams, frame, opts) {
  const lifecyclePhase = frame && frame.phase;

  if (isZeroWorkLifecyclePhase(lifecyclePhase)) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  const budgetCtx = resolveBudgetContext(effectParams, opts);
  const fieldStyle =
    effectParams._fieldStyle ||
    (opts && opts.fieldStyle) ||
    (budgetCtx.effect === "burst"
      ? "radial_bloom"
      : budgetCtx.effect === "pop"
        ? "micro_flash"
        : budgetCtx.effect === "none"
          ? "none"
          : "vertical_phase");
  const stable = isStableLifecyclePhase(lifecyclePhase);

  const layout = resolveDrawLayout(width, height, opts, effectParams);
  const anchor = resolveGlyphAnchor(layout, width, height, effectParams);

  if (stable) {
    const residual =
      (frame && frame.glyphResidual != null ? frame.glyphResidual : 1) *
      effectParams.shimmerIntensity;
    ctx.clearRect(0, 0, width, height);
    if (residual >= 0.2 && budgetCtx.effect !== "none") {
      beginEffectClip(ctx, width, height, layout);
      drawGlyphLocalResidual(
        ctx,
        anchor.cx,
        anchor.cy,
        phase,
        roles,
        effectParams,
        residual,
      );
      endEffectClip(ctx);
    }
    return;
  }

  const beamIntensity = frame && frame.beamIntensity != null ? frame.beamIntensity : 1;
  const presence = Math.max(0, Math.min(1, beamIntensity * effectParams.effectIntensity));
  const impactFloor =
    effectParams._effectImpactFloor != null
      ? effectParams._effectImpactFloor
      : opts && opts.effectImpactFloor != null
        ? opts.effectImpactFloor
        : 0.85;
  const impactMul = impactFloor > 0 ? 0.58 + impactFloor * 0.48 : 1;
  const effectivePresence = Math.min(1, presence * impactMul);
  if (effectivePresence <= 0.01 || budgetCtx.effect === "none") {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  const beamScale = frame && frame.beamScale != null ? frame.beamScale : 1;
  const beamSeedOnly = lifecyclePhase === "beam_in_seed";
  const materializing = lifecyclePhase === "materializing_object";
  const entering = beamSeedOnly || materializing || lifecyclePhase === "enter";
  const beamOutSeed =
    lifecyclePhase === "beam_out_seed" || frame.exitSubPhase === "beam_out_seed";
  const dematerializing =
    lifecyclePhase === "dematerializing_object" ||
    frame.exitSubPhase === "dematerializing_object";
  const beamWidthMul = entering
    ? (beamSeedOnly ? 0.68 : 0.76) + beamScale * (beamSeedOnly ? 0.2 : 0.24)
    : beamOutSeed
      ? 0.78 + beamScale * 0.22
      : dematerializing
        ? 0.84 + beamScale * 0.16
        : 0.88 + beamScale * 0.12;
  const field = resolveDrawFieldEnvelope(effectParams, lifecyclePhase, frame);
  const beamEnv = rendererBeamEnvelope(field.beam);
  const scaledParams = Object.assign({}, effectParams, {
    beamHeight: effectParams.beamHeight * beamScale * beamEnv,
    beamWidth: effectParams.beamWidth * beamWidthMul * Math.sqrt(beamEnv),
    _field: field,
    _travelEnv: rendererTravelEnvelope(field.travel),
  });

  const groupBgOn = opts && opts.groupBackgroundEnabled;
  const centerX = anchor.cx;
  const podCenterY = anchor.cy;
  const rand = mulberry32(PARTICLE_SEED);
  const glowMul = scaledParams.glowIntensity / 100;
  const beamOp = scaledParams.beamOpacity * effectivePresence * 0.88;

  ctx.clearRect(0, 0, width, height);
  beginEffectClip(ctx, width, height, layout);
  ctx.filter = scaledParams.beamBlur > 0 ? "blur(" + scaledParams.beamBlur + "px)" : "none";

  if (groupBgOn && layout && layout.safeZone) {
    const sz = layout.safeZone;
    ctx.fillStyle = hexWithAlpha(roles.primary, 0.03 * effectivePresence);
    ctx.fillRect(sz.left, sz.top, sz.width, sz.height);
  }

  const drawTransportBeam =
    !stable &&
    budgetCtx.effect !== "none" &&
    (frame.beamActive !== false || effectivePresence > 0.02) &&
    (!materializing || (frame.beamClearT == null || frame.beamClearT < 1));

  if (!stable && drawTransportBeam) {
    if (fieldStyle === "radial_bloom") {
      drawRadialBloom(
        ctx,
        centerX,
        podCenterY,
        roles,
        field,
        effectivePresence,
        glowMul,
        layout,
        impactFloor,
        frame && frame.particleStageT != null
          ? frame.particleStageT
          : frame && frame.phaseProgress != null
            ? frame.phaseProgress
            : 0,
      );
    } else if (fieldStyle === "micro_flash") {
      drawMicroFlash(
        ctx,
        centerX,
        podCenterY,
        roles,
        effectivePresence,
        glowMul,
        layout,
        frame && frame.phaseProgress != null ? frame.phaseProgress : 0,
      );
    } else if (fieldStyle === "vertical_phase") {
      drawEventField(
        ctx,
        width,
        height,
        centerX,
        podCenterY,
        roles,
        field,
        effectivePresence,
        glowMul,
        layout,
        impactFloor,
      );
    }
  }

  const phaseProgressVal = frame && frame.phaseProgress != null ? frame.phaseProgress : 0;

  if (
    drawTransportBeam &&
    fieldStyle === "vertical_phase" &&
    scaledParams.beamEnabled &&
    scaledParams.beamShape !== "none"
  ) {
    drawBeamShape(
      ctx,
      width,
      height,
      centerX,
      podCenterY,
      phase,
      roles,
      scaledParams,
      beamOp,
      glowMul,
      layout,
    );
  }

  if (drawTransportBeam) {
    drawParticles(
      ctx,
      width,
      height,
      centerX,
      podCenterY,
      phase,
      roles,
      scaledParams,
      effectivePresence,
      rand,
      (frame && frame.particleMode) || "drift",
      frame && frame.phaseProgress != null ? frame.phaseProgress : 0,
      lifecyclePhase,
      frame && frame.particleStageT != null ? frame.particleStageT : null,
      frame && frame.exitSubPhase,
      frame && frame.exitDematT != null ? frame.exitDematT : null,
      budgetCtx.size,
      budgetCtx.effect,
      layout,
    );
  }

  ctx.filter = "none";
  endEffectClip(ctx);
}

function beginPaintBoxClip(ctx, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
}

function endPaintBoxClip(ctx) {
  ctx.restore();
}

/** Safe Effect Zone clip with Paint Box as emergency outer guard. */
function beginEffectClip(ctx, w, h, layout) {
  beginPaintBoxClip(ctx, w, h);
  if (layout && layout.safeZone) {
    const sz = layout.safeZone;
    ctx.beginPath();
    ctx.rect(sz.left, sz.top, sz.width, sz.height);
    ctx.clip();
  }
}

function endEffectClip(ctx) {
  endPaintBoxClip(ctx);
}

/** Glyph-local radial bloom — Burst identity (no vertical column). */
function drawRadialBloom(ctx, cx, cy, roles, field, presence, glowMul, layout, impactFloor, stageT) {
  const sz = layout && layout.safeZone ? layout.safeZone : { width: 120, height: 120 };
  const impactBoost = impactFloor > 0 ? 0.72 + impactFloor * 0.32 : 1;
  const boxR = Math.min(sz.width, sz.height) * 0.38;
  const t = stageT != null ? stageT : 0;
  const bloomT = easeOutCubic(Math.min(1, t * 1.15));
  const fadeT = t > 0.72 ? 1 - easeInCubic((t - 0.72) / 0.28) : 1;
  const outerR = boxR * (0.35 + bloomT * 0.42) * impactBoost;
  const innerR = outerR * 0.08;
  const glowColor = roles.glow || roles.accent;

  const coreGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  const coreAlpha =
    Math.min(0.32, 0.1 + bloomT * 0.2) * presence * glowMul * impactBoost * fadeT;
  coreGrad.addColorStop(0, hexWithAlpha(glowColor, coreAlpha * 1.2));
  coreGrad.addColorStop(0.35, hexWithAlpha(roles.accent, coreAlpha * 0.75));
  coreGrad.addColorStop(0.65, hexWithAlpha(roles.primary, coreAlpha * 0.35));
  coreGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fill();

  const ringR = outerR * (0.55 + bloomT * 0.35);
  const ringAlpha = bloomT * (1 - bloomT * 0.4) * 0.22 * presence * glowMul * fadeT;
  ctx.strokeStyle = hexWithAlpha(roles.accent, ringAlpha);
  ctx.lineWidth = Math.max(1, outerR * 0.04);
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();
}

/** Tiny flash ring — Pop identity (glyph-local, no lingering field). */
function drawMicroFlash(ctx, cx, cy, roles, presence, glowMul, layout, phaseProgress) {
  const sz = layout && layout.safeZone ? layout.safeZone : { width: 120, height: 120 };
  const boxR = Math.min(sz.width, sz.height) * 0.22;
  const flashPeak =
    phaseProgress < 0.22
      ? easeOutCubic(phaseProgress / 0.22)
      : 1 - easeInCubic((phaseProgress - 0.22) / 0.78);
  const ringPeak =
    phaseProgress < 0.12
      ? easeOutCubic(phaseProgress / 0.12)
      : phaseProgress < 0.55
        ? 1 - easeInCubic((phaseProgress - 0.12) / 0.43) * 0.35
        : 1 - easeInCubic((phaseProgress - 0.55) / 0.45);

  const coreR = boxR * (0.18 + flashPeak * 0.22);
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  const coreAlpha = flashPeak * 0.38 * presence * glowMul;
  coreGrad.addColorStop(0, hexWithAlpha(roles.accent, coreAlpha * 1.2));
  coreGrad.addColorStop(0.45, hexWithAlpha(roles.glow || roles.accent, coreAlpha * 0.55));
  coreGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  const outerR = boxR * (0.42 + ringPeak * 0.48);
  const grad = ctx.createRadialGradient(cx, cy, coreR * 0.6, cx, cy, outerR);
  const alpha = ringPeak * 0.28 * presence * glowMul;
  grad.addColorStop(0, hexWithAlpha(roles.accent, alpha * 0.85));
  grad.addColorStop(0.55, hexWithAlpha(roles.glow || roles.accent, alpha * 0.4));
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexWithAlpha(roles.accent, ringPeak * 0.42 * presence * glowMul);
  ctx.lineWidth = Math.max(1.2, outerR * 0.055);
  ctx.beginPath();
  ctx.arc(cx, cy, outerR * 0.68, 0, Math.PI * 2);
  ctx.stroke();

  const arcCount = 5;
  const arcSpan = (Math.PI * 2) / arcCount;
  ctx.lineWidth = Math.max(1, outerR * 0.04);
  for (let i = 0; i < arcCount; i += 1) {
    const a0 = i * arcSpan + phaseProgress * 0.4;
    const a1 = a0 + arcSpan * 0.42;
    ctx.strokeStyle = hexWithAlpha(
      roles.accent,
      ringPeak * 0.32 * presence * glowMul * (0.85 + (i % 2) * 0.15),
    );
    ctx.beginPath();
    ctx.arc(cx, cy, outerR * (0.78 + (i % 2) * 0.06), a0, a1);
    ctx.stroke();
  }
}

/** Glyph-local anticipation glow — capped to Safe Effect Zone. */
function drawEventField(ctx, w, h, cx, cy, roles, field, presence, glowMul, layout, impactFloor) {
  if (field.effect <= 1.02) {
    return;
  }
  const sz = layout && layout.safeZone ? layout.safeZone : { width: w, height: h };
  const impactBoost = impactFloor > 0 ? 0.72 + impactFloor * 0.32 : 1;
  const boxR = Math.min(sz.width, sz.height) * 0.42;
  const glowColor = roles.glow || roles.accent;
  const outerR =
    boxR *
    (0.5 + (field.effect - 1) * 0.18) *
    Math.min(field.glow, PAINT_BOX_FIELD_CAPS.glow) *
    Math.min(1.08, impactBoost);
  const innerR = outerR * 0.14;
  const fieldGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  const fieldAlpha =
    Math.min(0.2, 0.055 + (field.effect - 1) * 0.048) * presence * glowMul * impactBoost;
  fieldGrad.addColorStop(0, hexWithAlpha(glowColor, fieldAlpha * 1.1));
  fieldGrad.addColorStop(0.35, hexWithAlpha(roles.primary, fieldAlpha * 0.65));
  fieldGrad.addColorStop(0.72, hexWithAlpha(roles.primary, fieldAlpha * 0.22));
  fieldGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fieldGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fill();
}

function drawBeamShape(ctx, w, h, cx, cy, phase, roles, params, beamOp, glowMul, layout) {
  const field = params._field || resolveFieldEnvelope(params);
  const glowReach = field.glow;
  const beam = resolveBeamBounds(layout, w, h, params, glowReach);
  const bw = beam.bw;
  const bh = beam.bh;
  const top = beam.top;
  const bottom = beam.bottom;
  const shimmer = Math.sin(phase * Math.PI * 2) * params.shimmerIntensity * 0.1;

  switch (params.beamShape) {
    case "orb": {
      const r = Math.min(bw, bh) * 0.55 * glowReach;
      const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      radial.addColorStop(0, hexWithAlpha(roles.accent, (0.32 + shimmer) * beamOp * glowMul));
      radial.addColorStop(0.45, hexWithAlpha(roles.primary, 0.18 * beamOp * glowMul));
      radial.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "cone": {
      const coneW = 0.55 + (glowReach - 1) * 0.12;
      const coneTop = 0.12 + (glowReach - 1) * 0.04;
      const grad = ctx.createLinearGradient(cx, bottom, cx, top);
      grad.addColorStop(0, hexWithAlpha(roles.primary, 0.22 * beamOp * glowMul));
      grad.addColorStop(0.55, hexWithAlpha(roles.accent, (0.2 + shimmer) * beamOp * glowMul));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - bw * coneW, bottom);
      ctx.lineTo(cx + bw * coneW, bottom);
      ctx.lineTo(cx + bw * coneTop, top);
      ctx.lineTo(cx - bw * coneTop, top);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "shimmer": {
      const lineW = Math.max(1.5, bw * (0.06 + (glowReach - 1) * 0.02));
      drawSoftFilamentColumn(ctx, cx, top, bottom, lineW, roles, beamOp * 0.78, glowMul, shimmer);
      break;
    }
    case "column":
    default: {
      const rx = bw * (0.38 + (glowReach - 1) * 0.06);
      const ry = bh * (0.36 + (glowReach - 1) * 0.08);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      core.addColorStop(0, hexWithAlpha(roles.accent, (0.18 + shimmer) * beamOp * glowMul));
      core.addColorStop(0.45, hexWithAlpha(roles.primary, 0.09 * beamOp * glowMul));
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawSoftFilamentColumn(
        ctx,
        cx,
        top,
        bottom,
        bw * 0.34,
        roles,
        beamOp * 0.72,
        glowMul,
        shimmer,
      );
      break;
    }
  }
}

/** Soft broken gradient filaments — enveloping field, not a solid column. */
function drawSoftFilamentColumn(ctx, cx, top, bottom, baseWidth, roles, beamOp, glowMul, shimmer) {
  const span = bottom - top;
  if (span <= 1) {
    return;
  }
  const filaments = 4;
  for (let i = 0; i < filaments; i += 1) {
    const offset = (i - (filaments - 1) / 2) * baseWidth * 0.2;
    const lineW = Math.max(1, baseWidth * (0.3 + i * 0.07));
    const grad = ctx.createLinearGradient(cx + offset, bottom, cx + offset, top);
    const peak = (0.17 + shimmer * (i === 1 || i === 2 ? 1 : 0.55)) * beamOp * glowMul;
    grad.addColorStop(0, hexWithAlpha(roles.primary, 0.02 * beamOp));
    grad.addColorStop(0.35, hexWithAlpha(roles.accent, peak * 0.55));
    grad.addColorStop(0.62, hexWithAlpha(roles.accent, peak));
    grad.addColorStop(0.88, hexWithAlpha(roles.primary, peak * 0.25));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx + offset - lineW / 2, top, lineW, span);
  }
}

function drawParticles(
  ctx,
  w,
  h,
  cx,
  cy,
  phase,
  roles,
  params,
  presence,
  rand,
  mode,
  phaseProgress,
  lifecyclePhase,
  particleStageT,
  exitSubPhase,
  exitDematT,
  budgetSize,
  budgetEffect,
  layout,
) {
  const count = particleCountForBudget(
    budgetSize,
    lifecyclePhase,
    budgetEffect,
    mode,
    params,
  );
  if (count <= 0) {
    return;
  }
  const spread = params.particleSpread / 100;
  const speed = 0.12 + (params.particleSpeed / 100) * 0.48;
  const sizeMul = 0.45 + (params.particleSize / 100) * 1.05;
  const glowNorm = params.glowIntensity / 80;
  const travelEnv = Math.min(
    PAINT_BOX_FIELD_CAPS.travel,
    params._travelEnv != null
      ? params._travelEnv
      : rendererTravelEnvelope(
        (params._field || resolveFieldEnvelope(params)).travel,
      ),
  );
  const densityRestraint =
    params.particleDensity > 62 && travelEnv > 1.35 ? 0.82 : 1;
  const beam = resolveBeamBounds(layout, w, h, params, travelEnv);
  const top = beam.top;
  const bottom = beam.bottom;
  const bw = beam.bw * travelEnv;
  const bh = beam.bh;

  for (let i = 0; i < count; i += 1) {
    const seed = rand();
    let x;
    let y;
    let alpha;
    let radius;

    switch (mode) {
      case "materialize": {
        const stageT =
          particleStageT != null ? particleStageT : phaseProgress;
        const gather = easeOutCubic(stageT);
        const angle = (i / count) * Math.PI * 2 + seed * 0.4;
        const dist = (1 - gather) * bw * (0.38 + seed * 0.55) * travelEnv;
        x = cx + Math.cos(angle) * dist;
        y = cy + Math.sin(angle) * dist * 0.5 - bh * 0.06 * (1 - gather);
        alpha =
          stageT <= 0
            ? 0
            : (0.04 + gather * 0.11) * presence * glowNorm * densityRestraint;
        radius = (0.5 + seed * 0.85) * sizeMul * (0.5 + gather * 0.5);
        break;
      }
      case "spark_burst": {
        const burstPeak = 0.32;
        const burstT = phaseProgress < burstPeak
          ? easeOutCubic(phaseProgress / burstPeak)
          : 1 - easeInCubic((phaseProgress - burstPeak) / (1 - burstPeak));
        const angle = (i / count) * Math.PI * 2 + seed * 0.25;
        const dist = burstT * bw * (0.06 + seed * 0.22) * travelEnv;
        x = cx + Math.cos(angle) * dist;
        y = cy + Math.sin(angle) * dist * 0.4;
        alpha = burstT * 0.55 * presence * glowNorm * densityRestraint;
        radius = (0.55 + seed * 1.1) * sizeMul * burstT;
        break;
      }
      case "radial_burst": {
        const stageT =
          particleStageT != null ? particleStageT : phaseProgress;
        const expand = easeOutCubic(Math.min(1, stageT * 1.1));
        const fade = stageT > 0.65 ? 1 - easeInCubic((stageT - 0.65) / 0.35) : 1;
        const angle = (i / count) * Math.PI * 2 + seed * 0.55;
        const dist = expand * boxRFromLayout(layout, w, h) * (0.12 + seed * 0.55);
        x = cx + Math.cos(angle) * dist;
        y = cy + Math.sin(angle) * dist * 0.85;
        alpha = expand * fade * (0.08 + seed * 0.14) * presence * glowNorm;
        radius = (0.6 + seed * 1.4) * sizeMul * expand * fade;
        break;
      }
      case "scanfall": {
        const travel = ((i / count) + phase * speed * 0.95) % 1;
        const baseY = bottom - (bottom - top) * travel;
        const wobble = Math.sin((i + phase * 3.5) * 0.45) * bw * 0.1 * spread * travelEnv;
        x = cx + wobble;
        y = baseY;
        alpha = (0.06 + seed * 0.08) * presence * glowNorm * densityRestraint;
        radius = (0.7 + seed * 1.2) * sizeMul;
        break;
      }
      case "collapse": {
        const collapseT =
          lifecyclePhase === "exit" && exitSubPhase === "dematerializing_object" && exitDematT != null
            ? exitDematT
            : phaseProgress;
        const collapse = easeInCubic(collapseT);
        const travel = ((i / count) + phase * speed * 0.28) % 1;
        const baseY = bottom - (bottom - top) * travel;
        const wobble = Math.sin((i + phase * 3.5) * 0.45) * bw * 0.18 * spread * travelEnv;
        const startX = cx + wobble;
        const startY = baseY;
        const pull = easeInCubic(Math.min(1, collapse * 1.08));
        x = startX + (cx - startX) * pull;
        y = startY + (cy - startY) * pull * 0.6;
        const fade = 1 - easeInCubic(Math.min(1, collapse * 1.15));
        alpha = fade * presence * (0.06 + seed * 0.09) * glowNorm * densityRestraint;
        radius = (0.65 + seed * 1.1) * sizeMul * (1 - pull * 0.75);
        break;
      }
      case "drift":
      default: {
        const travel = ((i / count) + phase * speed * 0.82) % 1;
        const baseY = bottom - (bottom - top) * travel;
        const wobble = Math.sin((i + phase * 3.2) * 0.42) * bw * 0.18 * spread * travelEnv;
        x = cx + wobble;
        y = baseY;
        alpha = (0.06 + seed * 0.1) * presence * glowNorm * densityRestraint;
        radius = (0.7 + seed * 1.3) * sizeMul;
        break;
      }
    }

    alpha *= safeZoneEdgeAlpha(x, y, layout);
    if (alpha <= 0.01 || radius <= 0.05) {
      continue;
    }
    ctx.beginPath();
    ctx.fillStyle = hexWithAlpha(roles.particle, alpha);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const scanStageT =
    particleStageT != null ? particleStageT : phaseProgress / 0.28;
  if (
    lifecyclePhase === "dematerializing_object" &&
    exitDematT != null &&
    exitDematT > 0 &&
    exitDematT < 1 &&
    (mode === "collapse" || mode === "scanfall")
  ) {
    const scanY = top + (bottom - top) * easeInCubic(exitDematT);
    ctx.fillStyle = hexWithAlpha(
      roles.accent,
      0.08 * presence * (1 - exitDematT) * (mode === "scanfall" ? 1 : 0.75),
    );
    ctx.fillRect(cx - bw * 0.04, scanY - 0.5, bw * 0.08, 1.5);
  }
  if (
    isTransportLifecyclePhase(lifecyclePhase) &&
    (lifecyclePhase === "enter" ||
      lifecyclePhase === "beam_in_seed" ||
      lifecyclePhase === "materializing_object") &&
    scanStageT > 0 &&
    scanStageT < 1 &&
    mode === "scanfall"
  ) {
    const scanY = top + (bottom - top) * easeOutCubic(scanStageT);
    ctx.fillStyle = hexWithAlpha(
      roles.accent,
      0.07 * presence * (1 - scanStageT) * (mode === "scanfall" ? 1 : 0.6),
    );
    ctx.fillRect(cx - bw * 0.035, scanY - 0.5, bw * 0.07, 1.5);
  }
}

function boxRFromLayout(layout, w, h) {
  const sz = layout && layout.safeZone ? layout.safeZone : { width: w, height: h };
  return Math.min(sz.width, sz.height) * 0.38;
}

function hexWithAlpha(hex, alpha) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

export function createOverlayAnimator(
  canvas,
  roles,
  effectParams,
  contract,
  lifecycleRef,
  animProfile,
  grammar,
  holdDurationMs,
  onFrame,
  onExitComplete,
  opts,
) {
  let frameId = 0;
  const beamMs = contract.animation.beamPhaseMs;
  const glyphMs = contract.animation.glyphAlphaMs;
  const autoTimedExit = Boolean(opts && opts.autoTimedExit);
  const groupBackgroundEnabled = Boolean(opts && opts.groupBackgroundEnabled);
  const staticFrame = opts && opts.staticFrame;

  if (!lifecycleRef.phase) {
    resetLifecycle(lifecycleRef);
  }

  function tick(ts) {
    let frame;
    let done = false;

    const inExit =
      lifecycleRef.phase === "beam_out_seed" ||
      lifecycleRef.phase === "dematerializing_object" ||
      lifecycleRef.phase === "cleared";
    if (staticFrame && !inExit) {
      frame = staticFrame;
    } else {
      const adv = advanceLifecycle(
        lifecycleRef,
        animProfile,
        grammar,
        ts,
        holdDurationMs,
        autoTimedExit,
        contract,
      );
      frame = adv.frame;
      done = adv.done;
    }

    const phase = ((ts || performance.now()) % beamMs) / beamMs;
    const glyphPhase = ((ts || performance.now()) % glyphMs) / glyphMs;
    const stable = isStableLifecyclePhase(frame.phase);
    const objectLocked = stable || frame.objectLocked === true;
    const shimmer = objectLocked
      ? 1
      : 0.9 + Math.sin(glyphPhase * Math.PI * 2) * 0.07 * effectParams.shimmerIntensity;
    const glyphAlpha = objectLocked ? frame.glyphAlpha : frame.glyphAlpha * shimmer;

    const drawOpts = {
      groupBackgroundEnabled,
      hailSizeTier: opts && opts.hailSizeTier,
      effectId: opts && opts.effectId,
      layoutRegions: opts && opts.layoutRegions,
    };

    if (lifecycleRef.phase !== "hidden" && lifecycleRef.phase !== "cleared") {
      try {
        drawHailEffect(
          canvas.getContext("2d"),
          canvas.width,
          canvas.height,
          phase,
          roles,
          effectParams,
          frame,
          drawOpts,
        );
      } catch (err) {
        console.error("Hails effect draw failed:", err);
      }
    }

    onFrame({
      glyphAlpha,
      glyphScale: frame.glyphScale,
      messageAlpha: frame.messageAlpha,
      intensity: frame.overallIntensity,
      phase: frame.phase,
    });

    if (done) {
      if (onExitComplete) {
        onExitComplete();
      }
      return;
    }
    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);
  return function stop() {
    cancelAnimationFrame(frameId);
  };
}

export { hexWithAlpha, resetLifecycle, isStableLifecyclePhase };
