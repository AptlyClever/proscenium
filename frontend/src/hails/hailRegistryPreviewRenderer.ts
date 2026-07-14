import { useEffect, useState, useRef } from "react";
import type { EffectRegistryEntry, EffectRegistryPreviewIdentity, EffectRegistryVariation } from "../api";
import type { HailVisualFields } from "./hailVisualContract";
import { resolveRegistryPreviewModuleRender } from "./hailRegistryPreviewModules";
import type {
  RegistryPreviewModuleRender,
  RegistryPreviewIdentity,
  RegistryPreviewPhase,
  RegistryPreviewPlan,
} from "./hailRegistryPreviewTypes";

export type {
  RegistryPreviewPhase,
  RegistryPreviewIdentity,
  RegistryPreviewPlan,
} from "./hailRegistryPreviewTypes";

export type RegistryPreviewLoopState = {
  phase: RegistryPreviewPhase;
  loopGeneration: number;
};

export type SimulationHoldFrame = "ingress" | "suspend" | "egress";

export type RegistrySimulationState = RegistryPreviewLoopState & {
  paused: boolean;
  pause: () => void;
  resume: () => void;
  holdFrame: (frame: SimulationHoldFrame) => void;
};

const HOLD_FRAME_PHASE: Record<SimulationHoldFrame, RegistryPreviewPhase> = {
  ingress: "entrance",
  suspend: "stable",
  egress: "exit",
};

export type AuthoringPreviewLoopTiming = {
  /** Readable stable frame after entrance completes (authoring slice, not TV stable_hold_ms). */
  stableMs: number;
  /** Pause before the next entrance replay. */
  gapMs: number;
};

/** Transporter lifecycle canon — matches hail-render-contract + VFX definitions v001. */
export const TRANSPORTER_LIFECYCLE_TIMING = {
  entrance_animation_ms: 1900,
  exit_animation_ms: 1400,
  beam_in_seed_ms: 800,
  beam_out_seed_ms: 420,
} as const;

/**
 * Default authoring preview loop pacing (5s stable + 5s gap).
 * Transporter uses shorter replay so entrance → stable → exit is visible in Forge/Hails.
 */
export const DEFAULT_AUTHORING_PREVIEW_LOOP_TIMING: AuthoringPreviewLoopTiming = {
  stableMs: 5000,
  gapMs: 5000,
};

export const TRANSPORTER_AUTHORING_PREVIEW_LOOP_TIMING: AuthoringPreviewLoopTiming = {
  stableMs: 3200,
  gapMs: 900,
};

export function resolveAuthoringPreviewLoopTiming(
  plan?: RegistryPreviewPlan | null,
): AuthoringPreviewLoopTiming {
  if (plan?.effectId === "transporter" && !plan.static) {
    return TRANSPORTER_AUTHORING_PREVIEW_LOOP_TIMING;
  }
  return DEFAULT_AUTHORING_PREVIEW_LOOP_TIMING;
}

function mergeEffectTuning(
  visual: HailVisualFields,
  registryEntry: EffectRegistryEntry | null | undefined,
): Record<string, unknown> {
  return { ...(registryEntry?.tuning_defaults ?? {}), ...(visual.effectTuning ?? {}) };
}

function entranceMsFromModule(
  baseEntranceMs: number,
  moduleRender: RegistryPreviewModuleRender | null,
): number {
  const override = moduleRender?.cssVars["--hail-registry-entrance-ms"];
  if (!override) return baseEntranceMs;
  const parsed = Number.parseInt(override, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : baseEntranceMs;
}

const FALLBACK_IDENTITY: Record<string, RegistryPreviewIdentity> = {
  none: {
    glyphResolveStyle: "fade",
    fieldStyle: "none",
    particleStyle: "none",
    messageRevealStyle: "fade",
    choreographyAnchors: {
      effectStart: 0,
      glyphResolveStart: 0.05,
      glyphImpactPeak: 0.6,
      glyphLockIn: 0.75,
      messageRevealStart: 0.2,
      stableReady: 0.85,
    },
    lifecycleTiming: { entrance_animation_ms: 250, exit_animation_ms: 200 },
    stableResidual: "none",
  },
  pop: {
    glyphResolveStyle: "overshoot_pop",
    fieldStyle: "micro_flash",
    particleStyle: "tiny_sparks",
    messageRevealStyle: "quick_follow",
    choreographyAnchors: {
      effectStart: 0,
      glyphResolveStart: 0.05,
      glyphImpactPeak: 0.35,
      glyphLockIn: 0.55,
      messageRevealStart: 0.55,
      stableReady: 0.7,
    },
    lifecycleTiming: { entrance_animation_ms: 400, exit_animation_ms: 300 },
    stableResidual: "none",
  },
  burst: {
    glyphResolveStyle: "center_snap",
    fieldStyle: "radial_bloom",
    particleStyle: "radial_burst",
    messageRevealStyle: "post_impact_fade",
    choreographyAnchors: {
      effectStart: 0,
      glyphResolveStart: 0.28,
      glyphImpactPeak: 0.52,
      glyphLockIn: 0.68,
      messageRevealStart: 0.7,
      stableReady: 0.88,
    },
    lifecycleTiming: { entrance_animation_ms: 780, exit_animation_ms: 560 },
    stableResidual: "optional_glyph_local",
  },
  transporter: {
    glyphResolveStyle: "scan_resolve",
    fieldStyle: "vertical_phase",
    particleStyle: "scanfall",
    messageRevealStyle: "secondary_scan_fade",
    choreographyAnchors: {
      effectStart: 0,
      glyphResolveStart: 0.42,
      glyphImpactPeak: 0.74,
      glyphLockIn: 0.9,
      messageRevealStart: 0.82,
      stableReady: 0.95,
    },
    lifecycleTiming: { entrance_animation_ms: 1900, exit_animation_ms: 1400 },
    stableResidual: "optional_glyph_local",
  },
};

function normalizePreviewIdentity(
  effectId: string,
  raw: EffectRegistryPreviewIdentity | undefined,
): RegistryPreviewIdentity {
  const fallback = FALLBACK_IDENTITY[effectId] ?? FALLBACK_IDENTITY.none;
  const timing = raw?.lifecycleTiming ?? {};
  return {
    glyphResolveStyle: raw?.glyphResolveStyle ?? fallback.glyphResolveStyle,
    fieldStyle: raw?.fieldStyle ?? fallback.fieldStyle,
    particleStyle: raw?.particleStyle ?? fallback.particleStyle,
    messageRevealStyle: raw?.messageRevealStyle ?? fallback.messageRevealStyle,
    choreographyAnchors: raw?.choreographyAnchors ?? fallback.choreographyAnchors,
    lifecycleTiming: {
      entrance_animation_ms:
        timing.entrance_animation_ms ?? fallback.lifecycleTiming.entrance_animation_ms,
      exit_animation_ms: timing.exit_animation_ms ?? fallback.lifecycleTiming.exit_animation_ms,
    },
    stableResidual: raw?.stableResidual ?? fallback.stableResidual,
  };
}

function resolveVariationContext(
  registryEntry: EffectRegistryEntry | null | undefined,
  visual: HailVisualFields,
): { variationId: string; variation: EffectRegistryVariation | null; previewProfile: string } {
  if (!registryEntry?.variations?.length) {
    return { variationId: "", variation: null, previewProfile: "" };
  }
  const variationId =
    visual.effectVariationId?.trim() ||
    registryEntry.default_variation_id ||
    registryEntry.variations.find((row) => row.default)?.id ||
    registryEntry.variations[0]?.id ||
    "";
  const variation = registryEntry.variations.find((row) => row.id === variationId) ?? null;
  const previewProfile = variation?.preview?.profile || variationId;
  return { variationId, variation, previewProfile };
}

export const TRANSPORTER_VARIATION_CHOREOGRAPHY: Record<string, Record<string, number>> = {
  voyaging: {
    effectStart: 0.05,
    glyphResolveStart: 0.42,
    glyphImpactPeak: 0.74,
    glyphLockIn: 0.9,
    glyphLockInOvershoot: 0.04,
    messageRevealStart: 0.82,
    stableReady: 0.95,
  },
  "generation-next": {
    effectStart: 0.05,
    glyphResolveStart: 0.38,
    glyphImpactPeak: 0.7,
    glyphLockIn: 0.88,
    glyphLockInOvershoot: 0.04,
    messageRevealStart: 0.8,
    stableReady: 0.94,
  },
  spoon: {
    effectStart: 0.05,
    glyphResolveStart: 0.4,
    glyphImpactPeak: 0.68,
    glyphLockIn: 0.86,
    glyphLockInOvershoot: 0.04,
    messageRevealStart: 0.78,
    stableReady: 0.92,
  },
};

function mergeChoreographyAnchors(
  base: Record<string, number>,
  override?: Record<string, number>,
): Record<string, number> {
  return { ...base, ...(override ?? {}) };
}

function previewIdentityForVisual(
  registryEntry: EffectRegistryEntry | null | undefined,
  variation: EffectRegistryVariation | null,
  effectId: string,
): EffectRegistryPreviewIdentity | undefined {
  const base =
    variation?.preview_identity && Object.keys(variation.preview_identity).length > 0
      ? variation.preview_identity
      : registryEntry?.preview_identity;
  if (!base) {
    return undefined;
  }
  if (effectId !== "transporter" || !variation?.id) {
    return base;
  }
  const locked = TRANSPORTER_VARIATION_CHOREOGRAPHY[variation.id];
  if (!locked) {
    return base;
  }
  return {
    ...base,
    choreographyAnchors: mergeChoreographyAnchors(
      base.choreographyAnchors ?? FALLBACK_IDENTITY.transporter.choreographyAnchors,
      locked,
    ),
  };
}

export function resolveRegistryPreviewPlan(
  visual: HailVisualFields,
  registryEntry: EffectRegistryEntry | null | undefined,
  options: {
    animationEnabled: boolean;
    effectsPreviewEnabled: boolean;
  },
): RegistryPreviewPlan | null {
  const effectId = visual.effectId || "none";
  const label = registryEntry?.label ?? effectId;
  const { variationId, variation, previewProfile } = resolveVariationContext(registryEntry, visual);
  const previewIdentityRaw = previewIdentityForVisual(registryEntry, variation, effectId);

  if (
    !options.effectsPreviewEnabled ||
    !options.animationEnabled ||
    effectId === "none" ||
    registryEntry?.status === "planned"
  ) {
    return {
      effectId,
      label,
      identity: normalizePreviewIdentity(effectId, previewIdentityRaw),
      variationId,
      previewProfile,
      entranceMs: 0,
      exitMs: 0,
      stableHoldMs: Number(visual.durationMs) || 5000,
      static: true,
      moduleRender: null,
    };
  }

  const identity = normalizePreviewIdentity(effectId, previewIdentityRaw);
  const baseEntranceMs = Math.max(120, identity.lifecycleTiming.entrance_animation_ms);
  const exitMs = Math.max(120, identity.lifecycleTiming.exit_animation_ms);
  const tuning = mergeEffectTuning(visual, registryEntry);
  const draftPlan: RegistryPreviewPlan = {
    effectId,
    label,
    identity,
    variationId,
    previewProfile,
    entranceMs: baseEntranceMs,
    exitMs,
    stableHoldMs: Number(visual.durationMs) || 5000,
    static: false,
    moduleRender: null,
  };
  const moduleRender = resolveRegistryPreviewModuleRender(draftPlan, tuning);
  const entranceMs = entranceMsFromModule(baseEntranceMs, moduleRender);

  return {
    ...draftPlan,
    entranceMs,
    moduleRender,
  };
}

export function registryPreviewMotionNote(
  plan: RegistryPreviewPlan | null,
  effectsPreviewEnabled: boolean,
): string {
  if (!plan) {
    return "Effects disabled — static proof";
  }
  if (plan.static) {
    return effectsPreviewEnabled
      ? `${plan.label} — static proof (no motion)`
      : "Effects disabled — static proof";
  }
  if (plan.effectId === "transporter") {
    const { stableMs } = resolveAuthoringPreviewLoopTiming(plan);
    const stableSec = (stableMs / 1000).toFixed(1);
    return `${plan.label} (transporter) — entrance → ${stableSec}s authoring stable → exit`;
  }
  return `${plan.label} (${plan.effectId}) — entrance → stable → replay`;
}

export function authoringPreviewLoopDurationMs(plan: RegistryPreviewPlan): number {
  const { stableMs, gapMs } = resolveAuthoringPreviewLoopTiming(plan);
  return plan.entranceMs + stableMs + plan.exitMs + gapMs;
}

export function useRegistrySimulation(
  plan: RegistryPreviewPlan | null,
  motionEnabled: boolean,
  options?: { stableHoldMs?: number },
): RegistrySimulationState {
  const [phase, setPhase] = useState<RegistryPreviewPhase>("static");
  const [loopGeneration, setLoopGeneration] = useState(0);
  const [paused, setPaused] = useState(false);
  const [runToken, setRunToken] = useState(0);
  const pausedRef = useRef(false);

  const pause = () => {
    pausedRef.current = true;
    setPaused(true);
  };

  const resume = () => {
    pausedRef.current = false;
    setPaused(false);
    setRunToken((token) => token + 1);
  };

  const holdFrame = (frame: SimulationHoldFrame) => {
    setPhase(HOLD_FRAME_PHASE[frame]);
    pause();
  };

  useEffect(() => {
    if (!plan || !motionEnabled || plan.static) {
      setPhase("static");
      setLoopGeneration(0);
      setPaused(false);
      pausedRef.current = false;
      return;
    }

    if (pausedRef.current) {
      return;
    }

    const baseTiming = resolveAuthoringPreviewLoopTiming(plan);
    const stableMs =
      options?.stableHoldMs && options.stableHoldMs >= 1000
        ? options.stableHoldMs
        : baseTiming.stableMs;
    const { gapMs } = baseTiming;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const schedule = (fn: () => void, ms: number) => {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled && !pausedRef.current) fn();
        }, ms),
      );
    };

    const startLoop = () => {
      if (cancelled || pausedRef.current) return;
      setLoopGeneration((generation) => generation + 1);
      setPhase("entrance");
      schedule(() => {
        setPhase("stable");
        schedule(() => {
          setPhase("exit");
          schedule(() => {
            setPhase("gap");
            schedule(startLoop, gapMs);
          }, plan.exitMs);
        }, stableMs);
      }, plan.entranceMs);
    };

    startLoop();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [
    motionEnabled,
    options?.stableHoldMs,
    plan?.effectId,
    plan?.entranceMs,
    plan?.exitMs,
    plan?.static,
    runToken,
  ]);

  return { phase, loopGeneration, paused, pause, resume, holdFrame };
}

/** @deprecated alias */
export function useRegistryPreviewPhase(
  plan: RegistryPreviewPlan | null,
  motionEnabled: boolean,
  options?: { stableHoldMs?: number },
): RegistrySimulationState {
  return useRegistrySimulation(plan, motionEnabled, options);
}
