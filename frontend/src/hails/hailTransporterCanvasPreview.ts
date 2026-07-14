/**
 * LCARD-aligned transporter canvas draw path (Phase G).
 * Ports filament column + scanfall from hail-overlay-poc/web-preview/js/renderer.js.
 */

import { resolveTransporterCanvasBeamFrame } from "./hailTransporterAuthoringLifecycle";
import type { TransporterChoreographyAnchors } from "./hailTransporterAuthoringLifecycle";
import { HAIL_PACKAGE_ANCHOR } from "./hailAuthoringPackage";
import { resolveTransporterVfxLayers } from "./hailTransporterVfxLayers";

export type TransporterPaletteRoles = {
  primary: string;
  accent: string;
  glow: string;
  particle: string;
};

export type TransporterVariationProfile = "voyaging" | "generation-next" | "spoon" | string;

export type TransporterCanvasOptions = {
  phaseProgress: number;
  lifecyclePhase: "entrance" | "stable" | "exit" | "gap" | "static";
  dematerializing?: boolean;
  variationProfile: TransporterVariationProfile;
  paletteId: string;
  beamIntensity: number;
  beamScale: number;
  sizeTier: string;
  choreographyAnchors?: TransporterChoreographyAnchors;
  /** Beam origin as fraction of canvas (package-aligned; default package center). */
  beamAnchorX?: number;
  beamAnchorY?: number;
};

const PARTICLE_SEED = 42;

const PALETTE_ROLES: Record<string, TransporterPaletteRoles> = {
  transporter_white: {
    primary: "#8aa8b8",
    accent: "#c8dce8",
    glow: "#c8dce8",
    particle: "#e8ecee",
  },
  transporter_generation_next: {
    primary: "#4a8cc8",
    accent: "#d8ecff",
    glow: "#6aaee8",
    particle: "#b8d8f8",
  },
  transporter_spoon: {
    primary: "#b8923a",
    accent: "#f5e6b8",
    glow: "#d4a84a",
    particle: "#f0d890",
  },
  axiom_dark_cyan: {
    primary: "#32b5a0",
    accent: "#7ee8d8",
    glow: "#5fd4c4",
    particle: "#a8f0e8",
  },
  cute_purple: {
    primary: "#9b5a8c",
    accent: "#c878a8",
    glow: "#c878a8",
    particle: "#e8b8d8",
  },
};

const PROFILE_BEAM: Record<string, { widthFrac: number; heightFrac: number }> = {
  voyaging: { widthFrac: 0.2, heightFrac: 0.58 },
  "generation-next": { widthFrac: 0.34, heightFrac: 0.72 },
  spoon: { widthFrac: 0.28, heightFrac: 0.66 },
};

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return `rgba(200, 220, 232, ${alpha})`;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function particleBudget(sizeTier: string): number {
  const tier = sizeTier.toLowerCase();
  if (tier === "small" || tier === "s") {
    return 18;
  }
  if (tier === "large" || tier === "l") {
    return 36;
  }
  return 28;
}

function resolveRoles(paletteId: string): TransporterPaletteRoles {
  return PALETTE_ROLES[paletteId] ?? PALETTE_ROLES.transporter_white;
}

function resolveBeamBounds(
  width: number,
  height: number,
  profile: TransporterVariationProfile,
  beamScale: number,
  anchorX: number = HAIL_PACKAGE_ANCHOR.x,
  anchorY: number = HAIL_PACKAGE_ANCHOR.y,
) {
  const base = PROFILE_BEAM[profile] ?? PROFILE_BEAM.voyaging;
  const bw = width * Math.min(0.42, base.widthFrac * beamScale);
  const bh = height * Math.min(0.88, base.heightFrac * (0.92 + beamScale * 0.16));
  const cx = width * anchorX;
  const cy = height * anchorY;
  return {
    cx,
    cy,
    bw,
    bh,
    top: cy - bh * 0.5,
    bottom: cy + bh * 0.5,
  };
}

function drawSoftFilamentColumn(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  bottom: number,
  baseWidth: number,
  roles: TransporterPaletteRoles,
  beamOp: number,
  glowMul: number,
  shimmer: number,
) {
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

type BeamBounds = ReturnType<typeof resolveBeamBounds>;

function drawBeamColumn(
  ctx: CanvasRenderingContext2D,
  beam: BeamBounds,
  roles: TransporterPaletteRoles,
  beamOp: number,
  glowMul: number,
  shimmer: number,
) {
  const rx = beam.bw * 0.38;
  const ry = beam.bh * 0.36;
  ctx.save();
  ctx.translate(beam.cx, beam.cy);
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
    beam.cx,
    beam.top,
    beam.bottom,
    beam.bw * 0.34,
    roles,
    beamOp * 0.72,
    glowMul,
    shimmer,
  );
}

function drawBeamShimmer(
  ctx: CanvasRenderingContext2D,
  beam: BeamBounds,
  roles: TransporterPaletteRoles,
  beamOp: number,
  glowMul: number,
  shimmer: number,
) {
  const lineW = Math.max(1.5, beam.bw * 0.08);
  drawSoftFilamentColumn(
    ctx,
    beam.cx,
    beam.top,
    beam.bottom,
    lineW * 2.2,
    roles,
    beamOp * 0.78,
    glowMul,
    shimmer,
  );
  ctx.filter = "blur(2px)";
  drawSoftFilamentColumn(
    ctx,
    beam.cx,
    beam.top,
    beam.bottom,
    lineW * 3.4,
    roles,
    beamOp * 0.45,
    glowMul * 0.85,
    shimmer * 0.6,
  );
  ctx.filter = "none";
}

function drawScanfallParticles(
  ctx: CanvasRenderingContext2D,
  beam: BeamBounds,
  roles: TransporterPaletteRoles,
  phase: number,
  presence: number,
  sizeTier: string,
  dense: boolean,
) {
  const rand = mulberry32(PARTICLE_SEED);
  const count = dense ? particleBudget(sizeTier) + 8 : particleBudget(sizeTier);
  const spread = dense ? 0.55 : 0.35;
  const speed = dense ? 0.14 : 0.12;
  const glowNorm = 0.9;

  for (let i = 0; i < count; i += 1) {
    rand();
    const seed = rand();
    const travel = ((i / count) + phase * speed * 0.95) % 1;
    const baseY = beam.bottom - (beam.bottom - beam.top) * travel;
    const wobble = Math.sin((i + phase * 3.5) * 0.45) * beam.bw * 0.1 * spread;
    const x = beam.cx + wobble;
    const y = baseY;
    const alpha = (dense ? 0.08 + seed * 0.12 : 0.06 + seed * 0.08) * presence * glowNorm;
    const radius = (dense ? 0.9 + seed * 1.4 : 0.7 + seed * 1.2) * (dense ? 1.15 : 1);
    ctx.fillStyle = hexWithAlpha(roles.particle, alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSparkleRise(
  ctx: CanvasRenderingContext2D,
  beam: BeamBounds,
  roles: TransporterPaletteRoles,
  phase: number,
  presence: number,
  sizeTier: string,
) {
  const rand = mulberry32(PARTICLE_SEED + 7);
  const count = Math.max(12, particleBudget(sizeTier) - 4);
  for (let i = 0; i < count; i += 1) {
    const seed = rand();
    const travel = ((i / count) + phase * 0.08) % 1;
    const rise = easeOutCubic(travel);
    const x = beam.cx + Math.sin(i * 1.7 + phase * 2) * beam.bw * 0.22 * (0.3 + seed);
    const y = beam.bottom - (beam.bottom - beam.top) * rise;
    const alpha = (0.05 + seed * 0.14) * presence * (1 - rise * 0.35);
    const radius = (0.55 + seed * 1.1) * (1.1 - rise * 0.25);
    ctx.fillStyle = hexWithAlpha(roles.accent, alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function drawShowerCurtain(
  ctx: CanvasRenderingContext2D,
  beam: ReturnType<typeof resolveBeamBounds>,
  roles: TransporterPaletteRoles,
  wipeT: number,
  beamOp: number,
) {
  const progress = Math.max(0, Math.min(1, wipeT));
  if (progress <= 0.02) {
    return;
  }
  const front = beam.top + (beam.bottom - beam.top) * progress;
  for (let i = 0; i < 14; i += 1) {
    const seed = (i + 1) * 0.17;
    const x = beam.cx + Math.sin(i * 1.3) * beam.bw * 0.42;
    const alpha = (0.08 + seed * 0.12) * beamOp * progress;
    ctx.strokeStyle = hexWithAlpha(roles.accent, alpha);
    ctx.lineWidth = Math.max(1.5, beam.bw * 0.035);
    ctx.beginPath();
    ctx.moveTo(x, beam.top - beam.bh * 0.05);
    ctx.lineTo(x + Math.sin(i) * 4, front);
    ctx.stroke();
  }
}

function drawScanPulses(
  ctx: CanvasRenderingContext2D,
  beam: ReturnType<typeof resolveBeamBounds>,
  roles: TransporterPaletteRoles,
  phase: number,
  count: number,
  beamOp: number,
) {
  if (count <= 0) {
    return;
  }
  for (let i = 0; i < count; i += 1) {
    const travel = (phase + i * 0.22) % 1;
    const y = beam.bottom - (beam.bottom - beam.top) * travel;
    const pulse = 0.5 + Math.sin((phase + i) * Math.PI * 2) * 0.5;
    const radius = Math.max(6, beam.bw * 0.14 * pulse);
    const grad = ctx.createRadialGradient(beam.cx, y, 0, beam.cx, y, radius);
    grad.addColorStop(0, hexWithAlpha(roles.glow, 0.35 * beamOp * pulse));
    grad.addColorStop(0.55, hexWithAlpha(roles.accent, 0.12 * beamOp));
    grad.addColorStop(1, hexWithAlpha(roles.accent, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(beam.cx, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPowerPellet(
  ctx: CanvasRenderingContext2D,
  beam: ReturnType<typeof resolveBeamBounds>,
  roles: TransporterPaletteRoles,
  strength: number,
  beamOp: number,
) {
  const s = Math.max(0, Math.min(1, strength));
  if (s <= 0.02) {
    return;
  }
  const radius = Math.max(beam.bw * 0.28, 14);
  const grad = ctx.createRadialGradient(beam.cx, beam.cy, 0, beam.cx, beam.cy, radius);
  grad.addColorStop(0, hexWithAlpha(roles.accent, 0.55 * s * beamOp));
  grad.addColorStop(0.45, hexWithAlpha(roles.glow, 0.22 * s * beamOp));
  grad.addColorStop(1, hexWithAlpha(roles.glow, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(beam.cx, beam.cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawSwirlParticles(
  ctx: CanvasRenderingContext2D,
  beam: ReturnType<typeof resolveBeamBounds>,
  roles: TransporterPaletteRoles,
  phase: number,
  presence: number,
  sizeTier: string,
) {
  const rand = mulberry32(PARTICLE_SEED + 19);
  const count = Math.max(10, Math.floor(particleBudget(sizeTier) / 2));
  for (let i = 0; i < count; i += 1) {
    const seed = rand();
    const angle = phase * Math.PI * 2 + i * 0.9;
    const radius = beam.bw * (0.18 + seed * 0.28);
    const y = beam.cy + Math.sin(phase * 3 + i) * beam.bh * 0.12;
    const x = beam.cx + Math.cos(angle) * radius;
    const alpha = (0.14 + seed * 0.2) * presence;
    ctx.fillStyle = hexWithAlpha(roles.particle, alpha);
    ctx.beginPath();
    ctx.arc(x, y, 0.9 + seed * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawTransporterCanvasFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: TransporterCanvasOptions,
): void {
  ctx.clearRect(0, 0, width, height);
  if (width < 8 || height < 8) {
    return;
  }

  const animating =
    options.lifecyclePhase === "entrance" || options.lifecyclePhase === "exit";
  if (!animating) {
    return;
  }

  const roles = resolveRoles(options.paletteId);
  const lifecyclePhase =
    options.lifecyclePhase === "exit" ? "exit" : options.lifecyclePhase === "entrance" ? "entrance" : null;
  if (!lifecyclePhase) {
    return;
  }

  const beamFrame = resolveTransporterCanvasBeamFrame(
    lifecyclePhase,
    options.phaseProgress,
    options.choreographyAnchors ?? {},
    options.beamIntensity,
  );
  const presence = Math.max(0, Math.min(1, options.beamIntensity));
  const glowMul = 0.85 + presence * 0.25;
  const progress = beamFrame.particlePhase;
  const beamOp =
    beamFrame.beamIntensity * Math.min(1, options.phaseProgress * 1.15 + 0.08);
  const shimmer = Math.sin(progress * Math.PI * 2) * 0.1;
  const profile = options.variationProfile || "voyaging";
  const effectiveBeamScale = options.beamScale * beamFrame.beamScale;
  const vfx = resolveTransporterVfxLayers(profile);
  const dematerializing = options.lifecyclePhase === "exit" && options.phaseProgress > 0.3;
  const wipeT = dematerializing ? 1 - progress : Math.min(1, options.phaseProgress * 1.1);
  const glyphLockIn = options.choreographyAnchors?.glyphLockIn ?? 0.9;
  const clearT =
    options.lifecyclePhase === "entrance" && options.phaseProgress >= glyphLockIn
      ? (options.phaseProgress - glyphLockIn) / Math.max(0.05, 1 - glyphLockIn)
      : 0;
  const pelletStrength = dematerializing
    ? Math.max(0, 1 - progress) * 0.65
    : Math.max(0, Math.min(1, progress * (1 - clearT)));

  if (beamOp <= 0.008) {
    return;
  }

  const anchorX = options.beamAnchorX ?? HAIL_PACKAGE_ANCHOR.x;
  const anchorY = options.beamAnchorY ?? HAIL_PACKAGE_ANCHOR.y;
  const beam = resolveBeamBounds(width, height, profile, effectiveBeamScale, anchorX, anchorY);

  if (vfx.showerCurtain) {
    drawShowerCurtain(ctx, beam, roles, wipeT, beamOp);
  }
  if (vfx.scanPulseCount > 0) {
    drawScanPulses(ctx, beam, roles, progress, vfx.scanPulseCount, beamOp);
  }

  if (profile === "generation-next") {
    drawBeamShimmer(ctx, beam, roles, beamOp, glowMul, shimmer);
    drawSparkleRise(ctx, beam, roles, progress, presence, options.sizeTier);
  } else {
    drawBeamColumn(ctx, beam, roles, beamOp, glowMul, shimmer);
    drawScanfallParticles(
      ctx,
      beam,
      roles,
      progress,
      presence,
      options.sizeTier,
      profile === "spoon",
    );
  }

  if (vfx.swirlField) {
    drawSwirlParticles(ctx, beam, roles, progress, presence, options.sizeTier);
  }
  if (vfx.powerPellet) {
    drawPowerPellet(ctx, beam, roles, pelletStrength, beamOp);
  }
}
