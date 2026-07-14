import type { RegistryPreviewModuleRender, RegistryPreviewPlan } from "./hailRegistryPreviewTypes";

export type { RegistryPreviewModuleRender } from "./hailRegistryPreviewTypes";

export type RegistryPreviewEffectModule = {
  id: string;
  render: (plan: RegistryPreviewPlan, tuning: Record<string, unknown>) => RegistryPreviewModuleRender;
};

function anchorMs(plan: RegistryPreviewPlan, anchor: string, fallback = 0): number {
  const fraction = plan.identity.choreographyAnchors[anchor] ?? fallback;
  return Math.round(plan.entranceMs * fraction);
}

function glyphResolveTiming(
  plan: RegistryPreviewPlan,
  resolveStartFallback: number,
  lockInFallback: number,
  stableReadyFallback?: number,
): { delayMs: number; durationMs: number } {
  const resolveStart = plan.identity.choreographyAnchors.glyphResolveStart ?? resolveStartFallback;
  const lockIn = plan.identity.choreographyAnchors.glyphLockIn ?? lockInFallback;
  const stableReady = plan.identity.choreographyAnchors.stableReady ?? stableReadyFallback ?? lockIn;
  const delayMs = Math.round(plan.entranceMs * resolveStart);
  const durationMs = Math.max(
    120,
    Math.round(plan.entranceMs * Math.max(0.08, stableReady - resolveStart)),
  );
  return { delayMs, durationMs };
}

function baseModuleRender(
  plan: RegistryPreviewPlan,
  partial: Omit<RegistryPreviewModuleRender, "glyphResolveDelayMs" | "glyphResolveDurationMs"> & {
    resolveStartFallback?: number;
    lockInFallback?: number;
  },
): RegistryPreviewModuleRender {
  const { resolveStartFallback = 0.05, lockInFallback = 0.75, ...rest } = partial;
  const { delayMs, durationMs } = glyphResolveTiming(plan, resolveStartFallback, lockInFallback);
  return {
    ...rest,
    glyphResolveDelayMs: delayMs,
    glyphResolveDurationMs: durationMs,
    cssVars: {
      ...rest.cssVars,
      "--hail-registry-glyph-resolve-delay-ms": `${delayMs}ms`,
      "--hail-registry-glyph-resolve-ms": `${durationMs}ms`,
    },
  };
}

function tuningNumber(tuning: Record<string, unknown>, key: string, fallback: number): number {
  const raw = tuning[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function scaledEntranceMs(plan: RegistryPreviewPlan, multiplier: number): number {
  return Math.max(120, Math.round(plan.entranceMs * multiplier));
}

const noneModule: RegistryPreviewEffectModule = {
  id: "none",
  render(plan, tuning) {
    const fadeSpeed = tuningNumber(tuning, "fade_speed", 1);
    const entranceMs = scaledEntranceMs(plan, 1 / fadeSpeed);
    return baseModuleRender(plan, {
      moduleId: "none",
      particleStyle: "none",
      messageRevealStyle: plan.identity.messageRevealStyle,
      messageRevealDelayMs: anchorMs(plan, "messageRevealStart", 0.2),
      particleCount: 0,
      resolveStartFallback: 0.05,
      lockInFallback: 0.75,
      cssVars: {
        "--hail-registry-entrance-ms": `${entranceMs}ms`,
        "--hail-registry-pop-scale": "1",
        "--hail-registry-flash-opacity": "0",
        "--hail-registry-bloom-scale": "1",
        "--hail-registry-beam-opacity": "0",
      },
    });
  },
};

const POP_PROFILE: Record<
  string,
  { scaleBias: number; flashBias: number; sparkMul: number; resolveStart?: number; lockIn?: number }
> = {
  "soft-tap": { scaleBias: 0, flashBias: 0, sparkMul: 1 },
  "snap-back": { scaleBias: -0.08, flashBias: 0.12, sparkMul: 0.75, resolveStart: 0.03, lockIn: 0.48 },
  "bubble-pop": { scaleBias: 0.15, flashBias: -0.1, sparkMul: 1.35 },
};

const popModule: RegistryPreviewEffectModule = {
  id: "pop",
  render(plan, tuning) {
    const popSize = tuningNumber(tuning, "pop_size", 1);
    const popImpact = tuningNumber(tuning, "pop_impact", 1);
    const sparkDensity = tuningNumber(tuning, "spark_density", 0.35);
    const profile = plan.previewProfile || plan.variationId || "soft-tap";
    const profilePop = POP_PROFILE[profile] ?? POP_PROFILE["soft-tap"];
    const resolveStart = profilePop.resolveStart ?? plan.identity.choreographyAnchors.glyphResolveStart ?? 0.05;
    const lockIn = profilePop.lockIn ?? plan.identity.choreographyAnchors.glyphLockIn ?? 0.55;
    return baseModuleRender(plan, {
      moduleId: "pop",
      particleStyle: plan.identity.particleStyle || "tiny_sparks",
      messageRevealStyle: plan.identity.messageRevealStyle || "quick_follow",
      messageRevealDelayMs: anchorMs(plan, "messageRevealStart", 0.55),
      particleCount: Math.max(0, Math.min(10, Math.round(sparkDensity * 8 * profilePop.sparkMul))),
      resolveStartFallback: resolveStart,
      lockInFallback: lockIn,
      cssVars: {
        "--hail-registry-pop-scale": String(0.85 + (popSize + profilePop.scaleBias) * 0.15),
        "--hail-registry-flash-opacity": String(
          Math.min(1, 0.55 + (popImpact + profilePop.flashBias) * 0.35),
        ),
        "--hail-registry-bloom-scale": "1",
        "--hail-registry-beam-opacity": "0",
      },
    });
  },
};

const BURST_PROFILE: Record<
  string,
  { bloomBias: number; snapBias: number; spreadBonus: number; resolveStart?: number; lockIn?: number }
> = {
  pulse: { bloomBias: 0, snapBias: 0, spreadBonus: 0 },
  "solar-flare": { bloomBias: 0.15, snapBias: 0.08, spreadBonus: -0.5, resolveStart: 0.28, lockIn: 0.64 },
  rippler: { bloomBias: -0.05, snapBias: -0.05, spreadBonus: 1.5, resolveStart: 0.24, lockIn: 0.68 },
};

const burstModule: RegistryPreviewEffectModule = {
  id: "burst",
  render(plan, tuning) {
    const bloomStrength = tuningNumber(tuning, "bloom_strength", 1);
    const snapIntensity = tuningNumber(tuning, "snap_intensity", 1);
    const particleSpread = tuningNumber(tuning, "particle_spread", 1);
    const profile = plan.previewProfile || plan.variationId || "pulse";
    const profileBurst = BURST_PROFILE[profile] ?? BURST_PROFILE.pulse;
    const resolveStart =
      profileBurst.resolveStart ?? plan.identity.choreographyAnchors.glyphResolveStart ?? 0.28;
    const lockIn = profileBurst.lockIn ?? plan.identity.choreographyAnchors.glyphLockIn ?? 0.68;
    return baseModuleRender(plan, {
      moduleId: "burst",
      particleStyle: plan.identity.particleStyle || "radial_burst",
      messageRevealStyle: plan.identity.messageRevealStyle || "post_impact_fade",
      messageRevealDelayMs: anchorMs(plan, "messageRevealStart", 0.7),
      particleCount: Math.max(
        4,
        Math.min(14, Math.round(6 + (particleSpread + profileBurst.spreadBonus) * 4)),
      ),
      resolveStartFallback: resolveStart,
      lockInFallback: lockIn,
      cssVars: {
        "--hail-registry-pop-scale": String(0.9 + (snapIntensity + profileBurst.snapBias) * 0.2),
        "--hail-registry-flash-opacity": "0",
        "--hail-registry-bloom-scale": String(0.85 + (bloomStrength + profileBurst.bloomBias) * 0.35),
        "--hail-registry-beam-opacity": "0",
      },
    });
  },
};

const TRANSPORTER_BEAM_WIDTH_BASE = 0.2;
const TRANSPORTER_BEAM_HEIGHT_BASE = 0.58;

const TRANSPORTER_PROFILE_BEAM: Record<string, { width: number; height: number; opacityBias: number }> = {
  voyaging: { width: TRANSPORTER_BEAM_WIDTH_BASE, height: TRANSPORTER_BEAM_HEIGHT_BASE, opacityBias: 0 },
  "generation-next": { width: 0.34, height: 0.72, opacityBias: -0.08 },
  spoon: { width: 0.28, height: 0.66, opacityBias: 0.12 },
};

const transporterModule: RegistryPreviewEffectModule = {
  id: "transporter",
  render(plan, tuning) {
    const beamIntensity = tuningNumber(tuning, "beam_intensity", 0.78);
    const beamScale = tuningNumber(tuning, "beam_scale", 1);
    const profile = plan.previewProfile || plan.variationId || "voyaging";
    const profileBeam = TRANSPORTER_PROFILE_BEAM[profile] ?? TRANSPORTER_PROFILE_BEAM.voyaging;
    const beamWidthFraction = Math.min(0.42, Math.max(0.08, profileBeam.width * beamScale));
    const beamHeightFraction = Math.min(
      0.88,
      Math.max(0.42, profileBeam.height * (0.92 + beamScale * 0.16)),
    );
    const resolveStart = plan.identity.choreographyAnchors.glyphResolveStart ?? 0.42;
    const lockIn = plan.identity.choreographyAnchors.glyphLockIn ?? 0.9;
    const lockOvershoot = plan.identity.choreographyAnchors.glyphLockInOvershoot ?? 0.04;
    const particleStyle = plan.identity.particleStyle || "scanfall";
    const particleCountBase = particleStyle === "scanfall_dense" ? 9 : particleStyle === "sparkle_rise" ? 7 : 6;
    return baseModuleRender(plan, {
      moduleId: "transporter",
      particleStyle,
      messageRevealStyle: plan.identity.messageRevealStyle || "secondary_scan_fade",
      messageRevealDelayMs: anchorMs(plan, "messageRevealStart", 0.82),
      particleCount: Math.max(4, Math.min(12, Math.round(particleCountBase * beamScale))),
      resolveStartFallback: resolveStart,
      lockInFallback: lockIn,
      cssVars: {
        "--hail-registry-pop-scale": "1",
        "--hail-registry-flash-opacity": "0",
        "--hail-registry-bloom-scale": "1",
        "--hail-registry-glyph-lock-overshoot": String(lockOvershoot),
        "--hail-registry-beam-opacity": String(
          Math.min(1, 0.35 + beamIntensity * 0.55 + profileBeam.opacityBias),
        ),
        "--hail-registry-beam-width-fraction": String(beamWidthFraction),
        "--hail-registry-beam-height-fraction": String(beamHeightFraction),
        "--hail-registry-glyph-breathe-amplitude": "0.06",
        "--hail-registry-glyph-shimmer-intensity": String(
          plan.previewProfile === "generation-next" ? 0.45 : plan.previewProfile === "spoon" ? 0.38 : 0.32,
        ),
      },
    });
  },
};

export const REGISTRY_PREVIEW_MODULES: Record<string, RegistryPreviewEffectModule> = {
  none: noneModule,
  pop: popModule,
  burst: burstModule,
  transporter: transporterModule,
};

export function resolveRegistryPreviewModuleRender(
  plan: RegistryPreviewPlan | null,
  tuning: Record<string, unknown>,
): RegistryPreviewModuleRender | null {
  if (!plan || plan.static) return null;
  const module = REGISTRY_PREVIEW_MODULES[plan.effectId];
  return module ? module.render(plan, tuning) : null;
}

export function resolveTransporterCanvasTuning(
  plan: RegistryPreviewPlan | null,
  tuning: Record<string, unknown>,
): { beamIntensity: number; beamScale: number; variationProfile: string } {
  const profile = plan?.previewProfile || plan?.variationId || "voyaging";
  return {
    beamIntensity: tuningNumber(tuning, "beam_intensity", 0.78),
    beamScale: tuningNumber(tuning, "beam_scale", 1),
    variationProfile: profile,
  };
}
