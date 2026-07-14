import { TRANSPORTER_LIFECYCLE_TIMING } from "./hailRegistryPreviewRenderer";

export type TransporterChoreographyAnchors = {
  glyphResolveStart?: number;
  glyphLockIn?: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - clamp01(t)) ** 3;
}

function applyBeamClear(
  beamScale: number,
  beamIntensity: number,
  beamClearT: number,
): { beamScale: number; beamIntensity: number } {
  if (beamClearT <= 0) {
    return { beamScale, beamIntensity };
  }
  const eased = easeInOutCubic(beamClearT);
  const fade = 1 - eased;
  return {
    beamScale: beamScale * (0.18 + fade * 0.82),
    beamIntensity: beamIntensity * fade * 0.72,
  };
}

/** Canvas beam frame — mirrors Slice 2 APK / LCARD web-preview handoffs. */
export function resolveTransporterCanvasBeamFrame(
  phase: "entrance" | "exit",
  progress: number,
  anchors: TransporterChoreographyAnchors,
  baseIntensity: number,
): { beamIntensity: number; beamScale: number; particlePhase: number } {
  const glyphLockIn = anchors.glyphLockIn ?? 0.9;
  const glyphResolveStart = anchors.glyphResolveStart ?? 0.42;
  const peak = Math.max(0.15, Math.min(1, baseIntensity));

  if (phase === "entrance") {
    const t = clamp01(progress);
    const rise = easeOutCubic(Math.min(1, t / Math.max(0.12, glyphResolveStart)));
    let beamIntensity = peak * (0.28 + rise * 0.62);
    let beamScale = 0.86 + easeInOutCubic(t) * 0.14;

    if (t >= glyphLockIn) {
      const clearT = easeInOutCubic((t - glyphLockIn) / Math.max(0.05, 1 - glyphLockIn));
      ({ beamScale, beamIntensity } = applyBeamClear(beamScale, beamIntensity, clearT));
    }

    return { beamIntensity, beamScale, particlePhase: t };
  }

  const beamOutFrac =
    TRANSPORTER_LIFECYCLE_TIMING.beam_out_seed_ms / TRANSPORTER_LIFECYCLE_TIMING.exit_animation_ms;
  const t = clamp01(progress);

  if (t < beamOutFrac) {
    const seedT = t / Math.max(0.001, beamOutFrac);
    const rise = easeInOutCubic(seedT);
    return {
      beamIntensity: peak * (0.1 + rise * 0.25),
      beamScale: 0.86 + rise * 0.06,
      particlePhase: 1 - seedT * 0.35,
    };
  }

  const dematT = (t - beamOutFrac) / Math.max(0.001, 1 - beamOutFrac);
  const e = easeInOutCubic(dematT);
  let beamIntensity = peak * 0.35;
  let beamScale = 0.92;

  if (dematT < 0.38) {
    const frag = dematT / 0.38;
    const fragEase = easeOutCubic(frag);
    beamIntensity = peak * (0.35 + fragEase * 0.55);
    beamScale = 0.92 + fragEase * 0.18;
  } else {
    const pull = (dematT - 0.38) / 0.62;
    const pullEase = easeInOutCubic(pull);
    beamIntensity = peak * (0.9 - pullEase * 0.9);
    beamScale = 1.1 - pullEase * 0.82;
  }

  return {
    beamIntensity: beamIntensity * (1 - e * 0.15),
    beamScale,
    particlePhase: 1 - dematT,
  };
}
