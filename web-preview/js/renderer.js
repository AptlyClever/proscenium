import {
  advanceLifecycle,
  resetLifecycle,
} from "./animation-profile.js";

const PARTICLE_SEED = 42;

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

/** Presence field scales composed in effect-config (tier × preset × placement). */
function resolveFieldEnvelope(params) {
  return {
    effect: params.effectFieldScale != null ? params.effectFieldScale : 1,
    beam: params.beamFieldScale != null ? params.beamFieldScale : 1,
    travel: params.particleTravelScale != null ? params.particleTravelScale : 1,
    glow: params.glowRadiusScale != null ? params.glowRadiusScale : 1,
  };
}

/** Draw-time beam envelope — params already carry grammar/preset/placement beam muls. */
function rendererBeamEnvelope(beamScale) {
  return 1 + Math.max(0, beamScale - 1) * 0.58;
}

/** Draw-time particle travel — extends drift without increasing count. */
function rendererTravelEnvelope(travelScale) {
  return 1 + Math.max(0, travelScale - 1) * 0.72;
}

export function glyphMarkup(glyphId, contract) {
  if (glyphId === "hail-sniffer") {
    return (
      '<svg class="hail-glyph-svg" viewBox="0 0 96 96" aria-hidden="true">' +
      '<path fill="currentColor" d="M48,14 C58,14 66,22 66,34 C66,46 58,54 48,54 C38,54 30,46 30,34 C30,22 38,14 48,14 Z"/>' +
      '<path fill="currentColor" d="M36,56 C36,68 42,78 48,82 C54,78 60,68 60,56 L56,56 C56,64 52,70 48,72 C44,70 40,64 40,56 Z"/>' +
      "</svg>"
    );
  }
  const emoji = contract.glyphs.emojiFallback[glyphId] || contract.glyphs.emojiFallback.default;
  return '<span class="hail-glyph-emoji" aria-hidden="true">' + emoji + "</span>";
}

/**
 * Parameterized hail effect — beam shapes + lifecycle-aware particles.
 */
export function drawHailEffect(ctx, width, height, phase, roles, effectParams, frame, opts) {
  const beamIntensity = frame && frame.beamIntensity != null ? frame.beamIntensity : 1;
  const presence = Math.max(0, Math.min(1, beamIntensity * effectParams.effectIntensity));
  if (presence <= 0.01) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  const beamScale = frame && frame.beamScale != null ? frame.beamScale : 1;
  const entering = frame && frame.phase === "enter";
  const beamWidthMul = entering
    ? 0.76 + beamScale * 0.24
    : 0.88 + beamScale * 0.12;
  const field = resolveFieldEnvelope(effectParams);
  const beamEnv = rendererBeamEnvelope(field.beam);
  const scaledParams = Object.assign({}, effectParams, {
    beamHeight: effectParams.beamHeight * beamScale * beamEnv,
    beamWidth: effectParams.beamWidth * beamWidthMul * Math.sqrt(beamEnv),
    _field: field,
    _travelEnv: rendererTravelEnvelope(field.travel),
  });

  const groupBgOn = opts && opts.groupBackgroundEnabled;
  const centerX = width / 2;
  const podCenterY = height * (0.32 + scaledParams.beamHeight * 0.08);
  const rand = mulberry32(PARTICLE_SEED);
  const glowMul = scaledParams.glowIntensity / 100;
  const beamOp = scaledParams.beamOpacity * presence;

  ctx.clearRect(0, 0, width, height);
  ctx.filter = scaledParams.beamBlur > 0 ? "blur(" + scaledParams.beamBlur + "px)" : "none";

  if (groupBgOn) {
    ctx.fillStyle = hexWithAlpha(roles.primary, 0.04 * presence);
    ctx.fillRect(0, 0, width, height);
  }

  drawEventField(
    ctx,
    width,
    height,
    centerX,
    podCenterY,
    roles,
    field,
    presence,
    glowMul,
  );

  if (scaledParams.beamEnabled && scaledParams.beamShape !== "none") {
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
    );
  }

  drawParticles(
    ctx,
    width,
    height,
    centerX,
    podCenterY,
    phase,
    roles,
    scaledParams,
    presence,
    rand,
    (frame && frame.particleMode) || "drift",
    frame && frame.phaseProgress != null ? frame.phaseProgress : 0,
    frame && frame.phase,
    frame && frame.particleStageT != null ? frame.particleStageT : null,
  );

  ctx.filter = "none";
  applyPodEdgeMask(ctx, width, height, presence, scaledParams, podCenterY);
}

/** Soft anticipation / event field — extends beyond content module. */
function drawEventField(ctx, w, h, cx, cy, roles, field, presence, glowMul) {
  if (field.effect <= 1.02) {
    return;
  }
  const glowColor = roles.glow || roles.accent;
  const outerR = Math.max(w, h) * (0.2 + field.effect * 0.14) * field.glow;
  const innerR = outerR * 0.12;
  const fieldGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  const fieldAlpha = Math.min(0.14, 0.05 + (field.effect - 1) * 0.04) * presence * glowMul;
  fieldGrad.addColorStop(0, hexWithAlpha(glowColor, fieldAlpha * 1.1));
  fieldGrad.addColorStop(0.35, hexWithAlpha(roles.primary, fieldAlpha * 0.65));
  fieldGrad.addColorStop(0.72, hexWithAlpha(roles.primary, fieldAlpha * 0.22));
  fieldGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fieldGrad;
  ctx.fillRect(0, 0, w, h);
}

function drawBeamShape(ctx, w, h, cx, cy, phase, roles, params, beamOp, glowMul) {
  const field = params._field || resolveFieldEnvelope(params);
  const glowReach = field.glow;
  const bw = w * params.beamWidth;
  const bh = h * params.beamHeight;
  const top = cy - bh * 0.55;
  const bottom = cy + bh * 0.35;
  const shimmer = Math.sin(phase * Math.PI * 2) * params.shimmerIntensity * 0.12;

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
      const lineW = Math.max(2, bw * (0.08 + (glowReach - 1) * 0.025));
      const grad = ctx.createLinearGradient(cx, bottom, cx, top);
      grad.addColorStop(0, hexWithAlpha(roles.primary, 0.05 * beamOp));
      grad.addColorStop(0.5, hexWithAlpha(roles.accent, (0.35 + shimmer) * beamOp * glowMul));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(cx - lineW / 2, top, lineW, bottom - top);
      break;
    }
    case "column":
    default: {
      const rx = bw * (0.45 + (glowReach - 1) * 0.08);
      const ry = bh * (0.42 + (glowReach - 1) * 0.1);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      core.addColorStop(0, hexWithAlpha(roles.accent, (0.28 + shimmer) * beamOp * glowMul));
      core.addColorStop(0.42, hexWithAlpha(roles.primary, 0.16 * beamOp * glowMul));
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const grad = ctx.createLinearGradient(cx, bottom, cx, top);
      grad.addColorStop(0, hexWithAlpha(roles.primary, 0.06 * beamOp));
      grad.addColorStop(0.55, hexWithAlpha(roles.accent, (0.22 + shimmer) * beamOp));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(cx - bw * 0.22, top, bw * 0.44, bottom - top);
      break;
    }
  }
}

function particleCountForMode(mode, params) {
  const density = params.particleDensity / 100;
  let count = Math.round(2 + density * 11);
  if (mode === "spark_burst") {
    count = Math.round(count * 0.65);
  }
  return Math.min(13, Math.max(2, count));
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
) {
  const count = particleCountForMode(mode, params);
  if (count <= 0) {
    return;
  }
  const spread = params.particleSpread / 100;
  const speed = 0.12 + (params.particleSpeed / 100) * 0.48;
  const sizeMul = 0.45 + (params.particleSize / 100) * 1.05;
  const glowNorm = params.glowIntensity / 80;
  const travelEnv = params._travelEnv != null
    ? params._travelEnv
    : rendererTravelEnvelope(
      (params._field || resolveFieldEnvelope(params)).travel,
    );
  const densityRestraint =
    params.particleDensity > 62 && travelEnv > 1.35 ? 0.82 : 1;
  const bh = h * params.beamHeight;
  const beamSpan = (bh * 0.55 + bh * 0.35) * travelEnv;
  const top = cy - beamSpan * 0.61;
  const bottom = cy + beamSpan * 0.39;
  const bw = w * params.beamWidth * Math.sqrt(travelEnv);

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
        const collapse = easeInCubic(phaseProgress);
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
    lifecyclePhase === "enter" &&
    scanStageT > 0 &&
    scanStageT < 1 &&
    (mode === "scanfall" || mode === "materialize")
  ) {
    const scanY = top + (bottom - top) * easeOutCubic(scanStageT);
    ctx.fillStyle = hexWithAlpha(
      roles.accent,
      0.07 * presence * (1 - scanStageT) * (mode === "scanfall" ? 1 : 0.6),
    );
    ctx.fillRect(cx - bw * 0.035, scanY - 0.5, bw * 0.07, 1.5);
  }
}

function applyPodEdgeMask(ctx, width, height, presence, params, podCenterY) {
  const field = params._field || resolveFieldEnvelope(params);
  const envelope = Math.max(field.effect, field.beam);
  if (envelope <= 1.05) {
    applyTightPodEdgeMask(ctx, width, height, presence, params, podCenterY);
    return;
  }
  ctx.globalCompositeOperation = "destination-in";
  const cx = width / 2;
  const cy = podCenterY != null ? podCenterY : height * 0.38;
  const spreadBase = 0.36 + (params.particleSpread / 100) * 0.14;
  const spread = spreadBase * (0.78 + envelope * 0.38);
  const rx = width * Math.min(0.96, spread);
  const ry = height * (0.34 + params.beamHeight * 0.14) * (0.8 + envelope * 0.28);
  const innerStop = envelope > 1.6 ? 0.08 : 0.15;
  const midStop = envelope > 1.6 ? 0.9 : 0.82;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const mask = ctx.createRadialGradient(0, 0, innerStop, 0, 0, 1);
  mask.addColorStop(0, "rgba(0,0,0," + (0.98 * presence) + ")");
  mask.addColorStop(midStop, "rgba(0,0,0," + (0.92 * presence) + ")");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = mask;
  ctx.fillRect(-1.35, -1.35, 2.7, 2.7);
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
}

function applyTightPodEdgeMask(ctx, width, height, presence, params, podCenterY) {
  ctx.globalCompositeOperation = "destination-in";
  const cx = width / 2;
  const cy = podCenterY != null ? podCenterY : height * 0.38;
  const spread = 0.38 + (params.particleSpread / 100) * 0.12;
  const rx = width * spread;
  const ry = height * (0.36 + params.beamHeight * 0.12);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const mask = ctx.createRadialGradient(0, 0, 0.15, 0, 0, 1);
  mask.addColorStop(0, "rgba(0,0,0," + (0.98 * presence) + ")");
  mask.addColorStop(0.82, "rgba(0,0,0," + (0.95 * presence) + ")");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = mask;
  ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
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

    if (staticFrame && lifecycleRef.phase !== "exit") {
      frame = staticFrame;
    } else {
      const adv = advanceLifecycle(
        lifecycleRef,
        animProfile,
        grammar,
        ts,
        holdDurationMs,
        autoTimedExit,
      );
      frame = adv.frame;
      done = adv.done;
    }

    const phase = ((ts || performance.now()) % beamMs) / beamMs;
    const glyphPhase = ((ts || performance.now()) % glyphMs) / glyphMs;
    const shimmer = 0.9 + Math.sin(glyphPhase * Math.PI * 2) * 0.07 * effectParams.shimmerIntensity;
    const glyphAlpha = frame.glyphAlpha * shimmer;

    drawHailEffect(
      canvas.getContext("2d"),
      canvas.width,
      canvas.height,
      phase,
      roles,
      effectParams,
      frame,
      { groupBackgroundEnabled },
    );

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

export { hexWithAlpha, resetLifecycle };
