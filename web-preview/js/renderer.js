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
 * Parameterized hail effect — beam shapes + particles, bounded inside overlay group.
 */
export function drawHailEffect(ctx, width, height, phase, roles, effectParams, intensity, opts) {
  const presence = Math.max(0, Math.min(1, intensity * effectParams.effectIntensity));
  if (presence <= 0.01) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  const groupBgOn = opts && opts.groupBackgroundEnabled;
  const centerX = width / 2;
  const podCenterY = height * (0.32 + effectParams.beamHeight * 0.08);
  const rand = mulberry32(PARTICLE_SEED);
  const glowMul = effectParams.glowIntensity / 100;
  const beamOp = effectParams.beamOpacity * presence;

  ctx.clearRect(0, 0, width, height);
  ctx.filter = effectParams.beamBlur > 0 ? "blur(" + effectParams.beamBlur + "px)" : "none";

  if (groupBgOn) {
    ctx.fillStyle = hexWithAlpha(roles.primary, 0.04 * presence);
    ctx.fillRect(0, 0, width, height);
  }

  if (effectParams.beamEnabled && effectParams.beamShape !== "none") {
    drawBeamShape(
      ctx,
      width,
      height,
      centerX,
      podCenterY,
      phase,
      roles,
      effectParams,
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
    effectParams,
    presence,
    rand,
  );

  ctx.filter = "none";
  applyPodEdgeMask(ctx, width, height, presence, effectParams);
}

function drawBeamShape(ctx, w, h, cx, cy, phase, roles, params, beamOp, glowMul) {
  const bw = w * params.beamWidth;
  const bh = h * params.beamHeight;
  const top = cy - bh * 0.55;
  const bottom = cy + bh * 0.35;
  const shimmer = Math.sin(phase * Math.PI * 2) * params.shimmerIntensity * 0.12;

  switch (params.beamShape) {
    case "orb": {
      const r = Math.min(bw, bh) * 0.55;
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
      const grad = ctx.createLinearGradient(cx, bottom, cx, top);
      grad.addColorStop(0, hexWithAlpha(roles.primary, 0.22 * beamOp * glowMul));
      grad.addColorStop(0.55, hexWithAlpha(roles.accent, (0.2 + shimmer) * beamOp * glowMul));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - bw * 0.55, bottom);
      ctx.lineTo(cx + bw * 0.55, bottom);
      ctx.lineTo(cx + bw * 0.12, top);
      ctx.lineTo(cx - bw * 0.12, top);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "shimmer": {
      const lineW = Math.max(2, bw * 0.08);
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
      const rx = bw * 0.45;
      const ry = bh * 0.42;
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

function drawParticles(ctx, w, h, cx, cy, phase, roles, params, presence, rand) {
  const count = Math.round(2 + (params.particleDensity / 100) * 14);
  if (count <= 0) {
    return;
  }
  const spread = params.particleSpread / 100;
  const speed = 0.15 + (params.particleSpeed / 100) * 0.65;
  const sizeMul = 0.5 + (params.particleSize / 100) * 1.2;
  const bh = h * params.beamHeight;
  const top = cy - bh * 0.55;
  const bottom = cy + bh * 0.35;
  const bw = w * params.beamWidth;

  for (let i = 0; i < count; i += 1) {
    const travel = ((i / count) + phase * speed) % 1;
    const baseY = bottom - (bottom - top) * travel;
    const wobble = Math.sin((i + phase * 4) * 0.5) * bw * 0.32 * spread;
    const x = cx + wobble;
    const radius = (0.8 + rand() * 1.6) * sizeMul;
    ctx.beginPath();
    ctx.fillStyle = hexWithAlpha(
      roles.particle,
      (0.08 + rand() * 0.14) * presence * (params.glowIntensity / 70),
    );
    ctx.arc(x, baseY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function applyPodEdgeMask(ctx, width, height, presence, params) {
  ctx.globalCompositeOperation = "destination-in";
  const cx = width / 2;
  const cy = height * 0.38;
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

export function createOverlayAnimator(canvas, roles, effectParams, contract, onFrame, opts) {
  let frameId = 0;
  let start = 0;
  const beamMs = contract.animation.beamPhaseMs;
  const glyphMs = contract.animation.glyphAlphaMs;
  const enterMs = contract.animation.enterMs || 480;
  const exitMs = contract.animation.exitMs || 360;
  const durationMs = opts && opts.durationMs ? opts.durationMs : 0;
  const useLifecycle = Boolean(opts && opts.useLifecycle);
  const groupBackgroundEnabled = Boolean(opts && opts.groupBackgroundEnabled);

  function lifecycleIntensity(elapsed) {
    if (!useLifecycle) {
      return 1;
    }
    if (elapsed < enterMs) {
      return easeOutCubic(elapsed / enterMs);
    }
    if (durationMs > 0 && elapsed > durationMs - exitMs) {
      const t = Math.max(0, durationMs - elapsed) / exitMs;
      return easeInCubic(t);
    }
    return 1;
  }

  function tick(ts) {
    if (!start) {
      start = ts;
    }
    const elapsed = ts - start;
    const phase = (elapsed % beamMs) / beamMs;
    const glyphPhase = (elapsed % glyphMs) / glyphMs;
    const shimmer = 0.9 + Math.sin(glyphPhase * Math.PI * 2) * 0.07 * effectParams.shimmerIntensity;
    let intensity = lifecycleIntensity(elapsed);
    if (useLifecycle && intensity >= 0.99 && elapsed > enterMs) {
      const breath = 1 + Math.sin((elapsed / 2800) * Math.PI * 2) * 0.035 * effectParams.shimmerIntensity;
      intensity *= breath;
    }
    const glyphAlpha = (0.91 + shimmer * 0.09) * Math.min(1, intensity);

    drawHailEffect(
      canvas.getContext("2d"),
      canvas.width,
      canvas.height,
      phase,
      roles,
      effectParams,
      intensity,
      { groupBackgroundEnabled },
    );
    onFrame({ glyphAlpha, intensity });
    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);
  return function stop() {
    cancelAnimationFrame(frameId);
  };
}

export { hexWithAlpha };
