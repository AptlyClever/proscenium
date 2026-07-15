/**
 * Preview-only animation profiles — object materialization lifecycle.
 *
 * Phases: beam_in_seed → materializing_object → stable_object →
 *         beam_out_seed → dematerializing_object → cleared
 */

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function easeInOutCubic(t) {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

/** Reference entrance/exit splits — scaled to profile entrance_ms / exit_ms. */
const LIFECYCLE_PHASE_REF = {
  entrance_ms: 700,
  beam_in_seed_ms: 150,
  exit_ms: 520,
  beam_out_seed_ms: 180,
};

/** Staged materialization windows within full entrance_ms (700ms reference). */
const ENTRANCE_STAGE_REF_MS = LIFECYCLE_PHASE_REF.entrance_ms;
const DEFAULT_ENTRANCE_STAGES = {
  beamSeedEnd: 150,
  particleStart: 150,
  particleEnd: 350,
  glyphStart: 350,
  glyphEnd: 550,
  messageStart: 450,
  messageEnd: 650,
  beamClearStart: 580,
};

/**
 * Lane 5 — per-named-effect choreography anchors (fraction of entrance_ms).
 * Glyph resolve is driven by effect timeline — not independent fade/pop.
 */
export const CHOREOGRAPHY_ANCHORS = {
  none: {
    effectStart: 0,
    glyphResolveStart: 0.05,
    glyphImpactPeak: 0.6,
    glyphLockIn: 0.75,
    messageRevealStart: 0.2,
    stableReady: 0.85,
  },
  pop: {
    effectStart: 0,
    glyphResolveStart: 0.05,
    glyphImpactPeak: 0.35,
    glyphLockIn: 0.55,
    messageRevealStart: 0.55,
    stableReady: 0.7,
  },
  burst: {
    effectStart: 0,
    glyphResolveStart: 0.28,
    glyphImpactPeak: 0.52,
    glyphLockIn: 0.68,
    messageRevealStart: 0.7,
    stableReady: 0.88,
  },
  transporter: {
    effectStart: 0,
    glyphResolveStart: 0.42,
    glyphImpactPeak: 0.74,
    glyphLockIn: 0.9,
    messageRevealStart: 0.82,
    stableReady: 0.95,
  },
};

/** @deprecated — derived from choreography anchors at runtime */
const NAMED_EFFECT_ENTRANCE_STAGES = {
  none: {
    beamSeedEnd: 60,
    particleStart: 40,
    particleEnd: 100,
    glyphStart: 80,
    glyphEnd: 200,
    messageStart: 120,
    messageEnd: 210,
    beamClearStart: 180,
  },
  pop: {
    beamSeedEnd: 60,
    particleStart: 30,
    particleEnd: 160,
    glyphStart: 50,
    glyphEnd: 170,
    messageStart: 130,
    messageEnd: 240,
    beamClearStart: 180,
  },
  burst: {
    beamSeedEnd: 100,
    particleStart: 60,
    particleEnd: 420,
    glyphStart: 160,
    glyphEnd: 380,
    messageStart: 340,
    messageEnd: 580,
    beamClearStart: 460,
  },
  transporter: {
    beamSeedEnd: 680,
    particleStart: 100,
    particleEnd: 660,
    glyphStart: 480,
    glyphEnd: 640,
    messageStart: 600,
    messageEnd: 720,
    beamClearStart: 640,
  },
};

/** Lane 5 — named effect timing canon (handoff v001). */
export const NAMED_EFFECT_PROFILES = {
  none: {
    named_effect_id: "none",
    entrance_style: "fade",
    entrance_ms: 250,
    entrance_intensity: 0.82,
    beam_in_seed_ms: 40,
    hold_motion: "drift",
    exit_style: "fade",
    exit_ms: 200,
    exit_intensity: 0.82,
    beam_out_seed_ms: 36,
    particle_mode_enter: "drift",
    particle_mode_hold: "drift",
    particle_mode_exit: "collapse",
    glyph_resolve_style: "fade",
    glyph_overshoot: 0,
    field_style: "none",
    particle_style: "none",
    message_reveal_style: "fade",
  },
  pop: {
    named_effect_id: "pop",
    entrance_style: "pop_ping",
    entrance_ms: 400,
    entrance_intensity: 1.06,
    beam_in_seed_ms: 80,
    hold_motion: "drift",
    exit_style: "snap_out",
    exit_ms: 300,
    exit_intensity: 1.02,
    beam_out_seed_ms: 72,
    particle_mode_enter: "spark_burst",
    particle_mode_hold: "drift",
    particle_mode_exit: "collapse",
    glyph_resolve_style: "overshoot_pop",
    glyph_overshoot: 0.14,
    field_style: "micro_flash",
    particle_style: "tiny_sparks",
    message_reveal_style: "quick_follow",
  },
  burst: {
    named_effect_id: "burst",
    entrance_style: "radial_burst",
    entrance_ms: 780,
    entrance_intensity: 1.08,
    beam_in_seed_ms: 200,
    hold_motion: "pulse",
    exit_style: "particle_dissolve",
    exit_ms: 560,
    exit_intensity: 1.04,
    beam_out_seed_ms: 160,
    particle_mode_enter: "radial_burst",
    particle_mode_hold: "drift",
    particle_mode_exit: "collapse",
    glyph_resolve_style: "center_snap",
    glyph_overshoot: 0.1,
    field_style: "radial_bloom",
    particle_style: "radial_burst",
    message_reveal_style: "post_impact_fade",
  },
  transporter: {
    named_effect_id: "transporter",
    entrance_style: "scan_resolve",
    entrance_ms: 1900,
    entrance_intensity: 1.08,
    beam_in_seed_ms: 800,
    hold_motion: "drift",
    exit_style: "beam_dematerialize",
    exit_ms: 1400,
    exit_intensity: 1.04,
    beam_out_seed_ms: 420,
    particle_mode_enter: "scanfall",
    particle_mode_hold: "drift",
    particle_mode_exit: "scanfall",
    glyph_resolve_style: "scan_resolve",
    glyph_overshoot: 0.04,
    field_style: "vertical_phase",
    particle_style: "scanfall",
    message_reveal_style: "secondary_scan_fade",
  },
};

/** Legacy workbench preset ids → named effect ids (L3 registry may supersede). */
const PRESET_TO_NAMED_EFFECT = {
  clean_hail: "none",
  transporter_soft: "transporter",
  transporter_dense: "transporter",
  subtle_ping: "pop",
  high_attention: "burst",
};

export function resolveNamedEffectId(presetOrEffectId) {
  if (presetOrEffectId && NAMED_EFFECT_PROFILES[presetOrEffectId]) {
    return presetOrEffectId;
  }
  return PRESET_TO_NAMED_EFFECT[presetOrEffectId] || "transporter";
}

function contractNamedEffectBlock(contract, namedId) {
  const ne = contract && contract.previewVisual && contract.previewVisual.namedEffects;
  if (!ne) {
    return null;
  }
  if (ne.effects && ne.effects[namedId]) {
    return ne.effects[namedId];
  }
  return ne[namedId] || null;
}

/** Locked transporter variation choreography — mirrors contract previewVisual.transporterVariationChoreography */
export const TRANSPORTER_VARIATION_CHOREOGRAPHY = {
  voyaging: {
    effectStart: 0,
    glyphResolveStart: 0.42,
    glyphImpactPeak: 0.74,
    glyphLockIn: 0.9,
    messageRevealStart: 0.82,
    stableReady: 0.95,
  },
  "generation-next": {
    effectStart: 0,
    glyphResolveStart: 0.38,
    glyphImpactPeak: 0.7,
    glyphLockIn: 0.88,
    messageRevealStart: 0.8,
    stableReady: 0.94,
  },
  spoon: {
    effectStart: 0,
    glyphResolveStart: 0.4,
    glyphImpactPeak: 0.68,
    glyphLockIn: 0.86,
    messageRevealStart: 0.78,
    stableReady: 0.92,
  },
};

function mergeChoreographyAnchors(base, override) {
  return Object.assign({}, base || {}, override || {});
}

function transporterVariationChoreographyFromContract(contract, variationId) {
  if (!variationId) {
    return null;
  }
  const locked =
    contract &&
    contract.previewVisual &&
    contract.previewVisual.transporterVariationChoreography;
  if (locked && locked[variationId]) {
    return mergeChoreographyAnchors(CHOREOGRAPHY_ANCHORS.transporter, locked[variationId]);
  }
  const registry =
    contract &&
    contract.previewVisual &&
    contract.previewVisual.effectRegistry &&
    contract.previewVisual.effectRegistry.entries;
  const transporter = registry && registry.transporter;
  const variation =
    transporter &&
    transporter.variations &&
    transporter.variations[variationId];
  const anchors =
    variation &&
    variation.identity &&
    variation.identity.choreographyAnchors;
  if (anchors) {
    return mergeChoreographyAnchors(CHOREOGRAPHY_ANCHORS.transporter, anchors);
  }
  if (TRANSPORTER_VARIATION_CHOREOGRAPHY[variationId]) {
    return mergeChoreographyAnchors(
      CHOREOGRAPHY_ANCHORS.transporter,
      TRANSPORTER_VARIATION_CHOREOGRAPHY[variationId],
    );
  }
  return null;
}

/** Resolve effect/glyph/message timing anchors for named effect entrance. */
export function resolveChoreographyAnchors(profile, contract) {
  const namedId = profile.named_effect_id || resolveNamedEffectId(profile._preset_id);
  const variationId =
    profile._variation_id ||
    profile.variation_id ||
    profile.transporter_variation ||
    profile.effect_variation_id;
  if (namedId === "transporter" && variationId) {
    const fromVariation = transporterVariationChoreographyFromContract(contract, variationId);
    if (fromVariation) {
      return fromVariation;
    }
  }
  const base = CHOREOGRAPHY_ANCHORS[namedId] || CHOREOGRAPHY_ANCHORS.transporter;
  const block = contractNamedEffectBlock(contract, namedId);
  const fromContract =
    block && block.choreographyAnchors ? block.choreographyAnchors : null;
  return Object.assign({}, base, fromContract || {});
}

function segmentProgress(t, start, end) {
  if (t <= start) {
    return 0;
  }
  if (t >= end) {
    return 1;
  }
  return (t - start) / Math.max(0.001, end - start);
}

/** Normalized choreography progress within entrance timeline (0–1). */
export function computeChoreographyProgress(entranceT, anchors) {
  const t = clamp01(entranceT);
  const a = anchors;
  return {
    entranceT: t,
    effectT: segmentProgress(t, a.effectStart, a.glyphImpactPeak),
    glyphT: segmentProgress(t, a.glyphResolveStart, a.glyphLockIn),
    peakT: segmentProgress(t, a.glyphResolveStart, a.glyphImpactPeak),
    lockT: segmentProgress(t, a.glyphImpactPeak, a.glyphLockIn),
    messageT: segmentProgress(t, a.messageRevealStart, a.stableReady),
    pastGlyphStart: t >= a.glyphResolveStart,
    pastImpactPeak: t >= a.glyphImpactPeak,
    pastLockIn: t >= a.glyphLockIn,
    pastMessageStart: t >= a.messageRevealStart,
  };
}

function entranceStagesFromAnchors(anchors) {
  const ref = ENTRANCE_STAGE_REF_MS;
  return {
    beamSeedEnd: Math.round(anchors.glyphResolveStart * ref),
    particleStart: Math.round(anchors.effectStart * ref),
    particleEnd: Math.round(anchors.glyphLockIn * ref),
    glyphStart: Math.round(anchors.glyphResolveStart * ref),
    glyphEnd: Math.round(anchors.glyphLockIn * ref),
    messageStart: Math.round(anchors.messageRevealStart * ref),
    messageEnd: Math.round(anchors.stableReady * ref),
    beamClearStart: Math.round(anchors.glyphLockIn * ref),
  };
}

export function formatChoreographyReadout(profile, contract) {
  const a = resolveChoreographyAnchors(profile, contract);
  return (
    "choreo peak " +
    Math.round(a.glyphImpactPeak * 100) +
    "% · lock " +
    Math.round(a.glyphLockIn * 100) +
    "% · msg " +
    Math.round(a.messageRevealStart * 100) +
    "%"
  );
}

function entranceStagesForProfile(profile, contract) {
  const namedId =
    profile.named_effect_id || resolveNamedEffectId(profile._preset_id);
  if (CHOREOGRAPHY_ANCHORS[namedId]) {
    return entranceStagesFromAnchors(
      resolveChoreographyAnchors(profile, contract || {}),
    );
  }
  return (
    NAMED_EFFECT_ENTRANCE_STAGES[namedId] ||
    DEFAULT_ENTRANCE_STAGES
  );
}

/** Preset entrance-style beam-in flavor — transport only, not stable identity. */
const BEAM_IN_TUNING = {
  fade: { seedMul: 0.55, beamPeak: 0.36, materializeMul: 0.88, clearMul: 1.15, fieldMul: 0.55 },
  beam_materialize: { seedMul: 1, beamPeak: 1, materializeMul: 1, clearMul: 1, fieldMul: 1 },
  scan_resolve: { seedMul: 1.12, beamPeak: 1.24, materializeMul: 1.06, clearMul: 0.92, fieldMul: 1.18 },
  pop_ping: { seedMul: 0.55, beamPeak: 0.72, materializeMul: 0.78, clearMul: 1.3, fieldMul: 0.78 },
  radial_burst: { seedMul: 0.48, beamPeak: 0.68, materializeMul: 0.82, clearMul: 1.25, fieldMul: 1.08 },
  achievement_snap: { seedMul: 0.62, beamPeak: 0.92, materializeMul: 0.84, clearMul: 1.2, fieldMul: 0.9 },
};

export const LIFECYCLE_PHASES = {
  IDLE: "idle",
  BEAM_IN_SEED: "beam_in_seed",
  MATERIALIZING: "materializing_object",
  STABLE: "stable_object",
  BEAM_OUT_SEED: "beam_out_seed",
  DEMATERIALIZING: "dematerializing_object",
  CLEARED: "cleared",
  HIDDEN: "hidden",
};

export function isEntrancePhase(phase) {
  return (
    phase === LIFECYCLE_PHASES.BEAM_IN_SEED ||
    phase === LIFECYCLE_PHASES.MATERIALIZING
  );
}

export function isStablePhase(phase) {
  return phase === LIFECYCLE_PHASES.STABLE;
}

export function isExitPhase(phase) {
  return (
    phase === LIFECYCLE_PHASES.BEAM_OUT_SEED ||
    phase === LIFECYCLE_PHASES.DEMATERIALIZING
  );
}

function stageProgress(elapsedMs, entranceMs, startRef, endRef, stages) {
  const scale = entranceMs / ENTRANCE_STAGE_REF_MS;
  const start = startRef * scale;
  const end = endRef * scale;
  return clamp01((elapsedMs - start) / Math.max(1, end - start));
}

function entranceStageMs(entranceMs, refMs) {
  return refMs * (entranceMs / ENTRANCE_STAGE_REF_MS);
}

function beamInTuning(entranceStyle) {
  return BEAM_IN_TUNING[entranceStyle] || BEAM_IN_TUNING.beam_materialize;
}

/**
 * Enter-phase semantic sub-phase for beam-in materialization.
 * @returns {{ lifecyclePhase: string, beamClearT: number, inBeamClear: boolean }}
 */
function resolveEnterBeamInPhase(enterElapsedMs, enterMs, entranceStyle, anchors) {
  const tuning = beamInTuning(entranceStyle);
  const glyphStartMs = enterMs * anchors.glyphResolveStart * tuning.materializeMul;
  const beamClearStartMs = enterMs * anchors.glyphLockIn;
  const beamClearEndMs = enterMs;

  if (enterElapsedMs < glyphStartMs) {
    return {
      lifecyclePhase: LIFECYCLE_PHASES.BEAM_IN_SEED,
      beamClearT: 0,
      inBeamClear: false,
    };
  }

  const beamClearT =
    enterElapsedMs >= beamClearStartMs
      ? easeInOutCubic(
          clamp01((enterElapsedMs - beamClearStartMs) / Math.max(1, beamClearEndMs - beamClearStartMs)),
        )
      : 0;

  return {
    lifecyclePhase: LIFECYCLE_PHASES.MATERIALIZING,
    beamClearT: beamClearT * tuning.clearMul,
    inBeamClear: beamClearT > 0,
  };
}

function applyBeamClear(beamScale, beamIntensity, beamClearT, beamReveal) {
  if (beamClearT <= 0) {
    return { beamScale, beamIntensity, beamReveal: beamReveal != null ? beamReveal : 1 };
  }
  const eased = easeInOutCubic(clamp01(beamClearT));
  const fade = 1 - eased;
  const reveal = beamReveal != null ? beamReveal : 1;
  return {
    beamScale: beamScale * (0.18 + fade * 0.82),
    beamIntensity: beamIntensity * fade * 0.72,
    beamReveal: reveal * (1 - eased * 0.88),
  };
}

/** Subtle settle — small overshoot, not cartoon bounce. */
function easeOutSubtleSnap(t, amount) {
  const bump = (amount || 0.04) * Math.sin(clamp01(t) * Math.PI);
  return clamp01(easeOutCubic(t) + bump * (1 - easeOutCubic(t)));
}

/**
 * Resolve per-phase durations from profile (optional overrides) and contract ref.
 * Named-effect timing fields take precedence over legacy preset overrides.
 * @param {object} profile
 * @param {object} [contract]
 */
export function resolvePhaseTimings(profile, contract) {
  const namedId =
    profile.named_effect_id || resolveNamedEffectId(profile._preset_id);
  const contractNamed =
    contract &&
    contract.previewVisual &&
    contract.previewVisual.namedEffects &&
    contract.previewVisual.namedEffects[namedId];
  const namedRef =
    (contractNamed && contractNamed.lifecycleReference) ||
    (NAMED_EFFECT_PROFILES[namedId] && {
      entrance_ms: NAMED_EFFECT_PROFILES[namedId].entrance_ms,
      beam_in_seed_ms: NAMED_EFFECT_PROFILES[namedId].beam_in_seed_ms,
      exit_ms: NAMED_EFFECT_PROFILES[namedId].exit_ms,
      beam_out_seed_ms: NAMED_EFFECT_PROFILES[namedId].beam_out_seed_ms,
    });
  const ref =
    (contract &&
      contract.previewVisual &&
      contract.previewVisual.lifecyclePhases &&
      contract.previewVisual.lifecyclePhases.reference) ||
    namedRef ||
    LIFECYCLE_PHASE_REF;

  const entranceMs = profile.entrance_ms;
  const exitMs = profile.exit_ms;
  const anchors = resolveChoreographyAnchors(profile, contract || {});
  const choreoBeamIn =
    CHOREOGRAPHY_ANCHORS[namedId] != null
      ? Math.round(entranceMs * anchors.glyphResolveStart)
      : null;
  const beamInSeedMs =
    choreoBeamIn != null
      ? choreoBeamIn
      : profile.beam_in_seed_ms != null
        ? profile.beam_in_seed_ms
        : Math.round(entranceMs * (ref.beam_in_seed_ms / ref.entrance_ms));
  const beamOutSeedMs =
    profile.beam_out_seed_ms != null
      ? profile.beam_out_seed_ms
      : Math.round(exitMs * (ref.beam_out_seed_ms / ref.exit_ms));

  return {
    entranceMs,
    exitMs,
    beamInSeedMs: Math.max(1, Math.min(beamInSeedMs, entranceMs - 1)),
    materializingMs: Math.max(1, entranceMs - beamInSeedMs),
    beamOutSeedMs: Math.max(1, Math.min(beamOutSeedMs, exitMs - 1)),
    dematerializingMs: Math.max(1, exitMs - beamOutSeedMs),
    namedEffectId: namedId,
  };
}

const DEFAULT_PROFILE = {
  entrance_style: "fade",
  entrance_ms: 480,
  entrance_intensity: 1,
  hold_motion: "drift",
  exit_style: "fade",
  exit_ms: 420,
  exit_intensity: 1,
  particle_mode_enter: "drift",
  particle_mode_hold: "drift",
  particle_mode_exit: "collapse",
  glyph_resolve_style: "fade",
  glyph_overshoot: 0,
};

export function getAnimationProfile(contract, presetId) {
  const namedId = resolveNamedEffectId(presetId);
  const namedBase = NAMED_EFFECT_PROFILES[namedId] || NAMED_EFFECT_PROFILES.transporter;
  const contractNamed = contractNamedEffectBlock(contract, namedId);
  const legacy =
    contract &&
    contract.previewVisual &&
    contract.previewVisual.animationProfiles &&
    contract.previewVisual.animationProfiles[presetId];
  const contractNamedProfile =
    contractNamed && contractNamed.animationProfile
      ? contractNamed.animationProfile
      : {};
  const identityFromContract = contractNamed
    ? {
        glyph_resolve_style:
          contractNamed.glyphResolveStyle || contractNamed.glyph_resolve_style,
        field_style: contractNamed.fieldStyle || contractNamed.field_style,
        particle_style: contractNamed.particleStyle || contractNamed.particle_style,
        message_reveal_style:
          contractNamed.messageRevealStyle || contractNamed.message_reveal_style,
      }
    : {};
  const lifecycleFromContract =
    contractNamed && contractNamed.lifecycleTiming
      ? {
          entrance_ms: contractNamed.lifecycleTiming.entrance_animation_ms,
          exit_ms: contractNamed.lifecycleTiming.exit_animation_ms,
        }
      : {};

  return Object.assign(
    {},
    DEFAULT_PROFILE,
    legacy || {},
    namedBase,
    contractNamedProfile,
    identityFromContract,
    lifecycleFromContract,
    {
      named_effect_id: namedId,
      _preset_id: presetId,
    },
  );
}

/** Lane 5 — timing table for validation / workbench readout. */
export function namedEffectTimingTable(presetOrEffectId, contract) {
  const profile = getAnimationProfile(contract, presetOrEffectId);
  const timings = resolvePhaseTimings(profile, contract);
  return {
    named_effect_id: profile.named_effect_id,
    preset_id: profile._preset_id,
    entrance_ms: timings.entranceMs,
    beam_in_seed_ms: timings.beamInSeedMs,
    materializing_ms: timings.materializingMs,
    exit_ms: timings.exitMs,
    beam_out_seed_ms: timings.beamOutSeedMs,
    dematerializing_ms: timings.dematerializingMs,
    entrance_style: profile.entrance_style,
    exit_style: profile.exit_style,
  };
}

export function animationProfilePayload(profile, contract) {
  const timings = resolvePhaseTimings(profile, contract);
  return {
    named_effect_id: profile.named_effect_id || resolveNamedEffectId(profile._preset_id),
    entrance_style: profile.entrance_style,
    entrance_ms: profile.entrance_ms,
    entrance_animation_ms: profile.entrance_ms,
    entrance_intensity: profile.entrance_intensity,
    beam_in_seed_ms: timings.beamInSeedMs,
    materializing_ms: timings.materializingMs,
    hold_motion: profile.hold_motion,
    exit_style: profile.exit_style,
    exit_ms: profile.exit_ms,
    exit_animation_ms: profile.exit_ms,
    exit_intensity: profile.exit_intensity,
    beam_out_seed_ms: timings.beamOutSeedMs,
    dematerializing_ms: timings.dematerializingMs,
    particle_mode_enter: profile.particle_mode_enter,
    particle_mode_hold: profile.particle_mode_hold,
    particle_mode_exit: profile.particle_mode_exit,
    glyph_resolve_style: profile.glyph_resolve_style,
    glyph_overshoot: profile.glyph_overshoot,
    field_style: profile.field_style,
    particle_style: profile.particle_style,
    message_reveal_style: profile.message_reveal_style,
    choreography_anchors: resolveChoreographyAnchors(profile, contract),
    note: "Preview-only animation profile — Axiom Hails named effect lifecycle",
  };
}

/** Effect-specific glyph resolve — driven by choreography anchors, not generic fade. */
function computeGlyphResolve(choreo, profile, anchors) {
  const style = profile.glyph_resolve_style || "fade";
  let glyphAlpha = 0;
  let glyphScale = 0.72;
  let messageAlpha = 0;
  let glyphClipReveal = 0;

  if (!choreo.pastGlyphStart && style !== "fade") {
    return { glyphAlpha: 0, glyphScale: 0.72, messageAlpha: 0, glyphClipReveal: 0 };
  }

  switch (style) {
    case "overshoot_pop": {
      if (choreo.entranceT < anchors.glyphImpactPeak) {
        const prePeak = choreo.peakT;
        glyphScale = 0.72 + easeOutCubic(prePeak) * 0.46;
        glyphAlpha = easeOutCubic(Math.min(1, prePeak * 1.4));
      } else if (choreo.entranceT < anchors.glyphLockIn) {
        const settle = choreo.lockT;
        glyphScale = 1.18 - easeOutCubic(settle) * 0.22;
        glyphAlpha = 1;
      } else if (choreo.entranceT < anchors.stableReady) {
        const micro = segmentProgress(choreo.entranceT, anchors.glyphLockIn, anchors.stableReady);
        glyphScale = 0.96 + easeOutCubic(micro) * 0.04;
        glyphAlpha = 1;
      } else {
        glyphScale = 1;
        glyphAlpha = 1;
      }
      break;
    }
    case "center_snap": {
      if (choreo.entranceT < anchors.glyphImpactPeak) {
        glyphAlpha = 0.06 + choreo.peakT * 0.32;
        glyphScale = 0.78 + choreo.peakT * 0.38;
      } else if (choreo.entranceT < anchors.glyphLockIn) {
        const snap = choreo.lockT;
        glyphAlpha = 0.32 + easeOutCubic(snap) * 0.68;
        glyphScale = 1.06 - easeOutCubic(snap) * 0.06;
      } else if (choreo.entranceT < anchors.stableReady) {
        const settle = segmentProgress(choreo.entranceT, anchors.glyphLockIn, anchors.stableReady);
        glyphScale = 1 - easeOutCubic(settle) * 0.04;
        glyphAlpha = 1;
      } else {
        glyphAlpha = 1;
        glyphScale = 1;
      }
      break;
    }
    case "scan_resolve": {
      glyphClipReveal = easeOutCubic(choreo.glyphT);
      if (choreo.entranceT < anchors.glyphResolveStart + 0.08) {
        glyphAlpha = 0.04 + choreo.peakT * 0.12;
        glyphScale = 0.82 + choreo.peakT * 0.04;
      } else if (choreo.entranceT < anchors.glyphImpactPeak) {
        glyphAlpha = 0.1 + choreo.peakT * 0.28;
        glyphScale = 0.86 + choreo.peakT * 0.06;
      } else if (choreo.entranceT < anchors.glyphLockIn) {
        glyphAlpha = 0.38 + easeOutCubic(choreo.lockT) * 0.62;
        glyphScale = 0.92 + easeOutCubic(choreo.glyphT) * 0.08;
      } else {
        glyphAlpha = 1;
        glyphScale = 1;
      }
      break;
    }
    case "fade":
    default:
      glyphAlpha = easeOutCubic(choreo.glyphT);
      glyphScale = 0.96 + easeOutCubic(choreo.glyphT) * 0.04;
      glyphClipReveal = easeOutCubic(choreo.glyphT);
      break;
  }

  if (choreo.pastMessageStart) {
    messageAlpha = easeOutCubic(choreo.messageT);
    if (style === "center_snap") {
      messageAlpha *= 0.92;
    } else if (style === "scan_resolve") {
      messageAlpha *= 0.88;
    }
  }

  return { glyphAlpha, glyphScale, messageAlpha, glyphClipReveal };
}

function computeEntranceFrame(
  enterElapsedMs,
  enterMs,
  profile,
  enterMul,
  overshoot,
  objectVisible,
  contract,
) {
  const anchors = resolveChoreographyAnchors(profile, contract || {});
  const entranceT = clamp01(enterElapsedMs / enterMs);
  const choreo = computeChoreographyProgress(entranceT, anchors);
  const tuning = beamInTuning(profile.entrance_style);
  const t = entranceT;
  const overall = easeOutCubic(t) * profile.entrance_intensity * enterMul;

  let beamScale = 1;
  let beamIntensity = 1;
  let glyphAlpha = 0;
  let glyphScale = 0.94;
  let messageAlpha = 0;
  let glyphClipReveal = 0;
  let particleStageT = choreo.effectT;

  switch (profile.entrance_style) {
    case "pop_ping": {
      beamScale = 0.86 + easeOutCubic(choreo.effectT) * 0.1;
      beamIntensity =
        choreo.entranceT < anchors.glyphImpactPeak
          ? easeOutCubic(choreo.peakT) * 0.55
          : (1 - choreo.lockT) * 0.35;
      particleStageT = choreo.entranceT < anchors.glyphImpactPeak ? choreo.peakT : 0;
      break;
    }
    case "radial_burst": {
      beamScale = 0.5 + easeOutCubic(choreo.effectT) * 0.32;
      if (choreo.entranceT <= anchors.glyphImpactPeak) {
        beamIntensity = easeOutCubic(choreo.effectT) * 0.32 + easeOutCubic(choreo.peakT) * 0.68;
        particleStageT = choreo.effectT;
      } else {
        beamIntensity = (1 - choreo.lockT) * 0.72;
        particleStageT = 1 - choreo.lockT * 0.65;
      }
      break;
    }
    case "achievement_snap": {
      beamScale = 0.84 + easeOutCubic(choreo.effectT) * 0.16;
      beamIntensity = easeOutCubic(choreo.effectT) * 0.56 + easeOutCubic(choreo.peakT) * 0.58;
      break;
    }
    case "scan_resolve": {
      const scanFlicker =
        choreo.effectT > 0 && choreo.effectT < 1
          ? Math.sin(choreo.effectT * Math.PI * 5) * 0.04
          : 0;
      if (choreo.entranceT < anchors.glyphResolveStart) {
        beamScale = 0.1 + easeOutCubic(choreo.effectT) * 0.52;
        beamIntensity = easeOutCubic(choreo.effectT) * 0.82 + scanFlicker;
        particleStageT = choreo.effectT;
      } else if (choreo.entranceT < anchors.glyphImpactPeak) {
        beamScale = 0.58 + easeOutCubic(choreo.glyphT) * 0.22;
        beamIntensity = 0.68 + easeOutCubic(choreo.glyphT) * 0.32 + scanFlicker;
        particleStageT = choreo.glyphT;
      } else {
        beamScale = 0.8 + easeOutCubic(choreo.lockT) * 0.12;
        beamIntensity = 0.88 + (1 - easeOutCubic(choreo.lockT)) * 0.12 + scanFlicker;
        particleStageT = choreo.lockT;
      }
      break;
    }
    case "beam_materialize":
      beamScale = 0.16 + easeOutCubic(choreo.effectT) * 0.52 + easeOutCubic(choreo.glyphT) * 0.32;
      beamIntensity = 0.08 + easeOutCubic(choreo.effectT) * 0.3 + easeOutCubic(choreo.glyphT) * 0.62;
      break;
    case "fade":
    default:
      beamScale = 0.72 + easeOutCubic(choreo.effectT) * 0.18;
      beamIntensity = easeOutCubic(choreo.glyphT);
      break;
  }

  if (objectVisible) {
    const glyph = computeGlyphResolve(choreo, profile, anchors);
    glyphAlpha = glyph.glyphAlpha;
    glyphScale = glyph.glyphScale;
    messageAlpha = glyph.messageAlpha;
    glyphClipReveal = glyph.glyphClipReveal;
  }

  beamIntensity *= tuning.beamPeak;
  if (profile.entrance_style !== "fade") {
    beamScale *= 0.88 + tuning.beamPeak * 0.12;
  }

  return {
    overall,
    beamScale,
    beamIntensity,
    glyphAlpha,
    glyphScale,
    messageAlpha,
    glyphClipReveal,
    particleStageT,
    fieldMul: tuning.fieldMul,
    choreography: choreo,
    choreographyAnchors: anchors,
  };
}

function computeDematerializingFrame(t, profile, exitMul) {
  const overall = (1 - easeInCubic(t)) * profile.exit_intensity * exitMul;
  let beamScale = 1;
  let beamIntensity = 1;
  let glyphAlpha = 1;
  let glyphScale = 1;
  let messageAlpha = 1;
  let glyphClipReveal = 1;

  switch (profile.exit_style) {
    case "snap_out": {
      messageAlpha = t < 0.14 ? 1 - easeInCubic(t / 0.14) : 0;
      if (t < 0.18) {
        glyphAlpha = 1;
        glyphScale = 1;
      } else if (t < 0.52) {
        const pop = (t - 0.18) / 0.34;
        glyphScale = 1 + easeOutCubic(Math.min(1, pop * 0.55)) * 0.1;
        glyphAlpha = 1 - easeInCubic(pop) * 0.35;
      } else {
        const collapse = (t - 0.52) / 0.48;
        glyphScale = 1.1 - easeInCubic(collapse) * 0.38;
        glyphAlpha = 0.65 - easeInCubic(collapse) * 0.65;
      }
      beamScale = 1 - easeInCubic(t) * 0.42;
      beamIntensity = (1 - easeInCubic(t)) * 0.55;
      break;
    }
    case "beam_dematerialize": {
      messageAlpha = t < 0.12 ? 1 - easeInOutCubic(t / 0.12) : 0;
      if (t < 0.14) {
        glyphAlpha = 1;
        glyphScale = 1;
        glyphClipReveal = 1;
        beamIntensity = 0.35;
        beamScale = 0.92;
      } else if (t < 0.52) {
        const frag = (t - 0.14) / 0.38;
        const e = easeInOutCubic(frag);
        glyphClipReveal = 1 - e;
        glyphAlpha = 1 - e * 0.55;
        glyphScale = 1 - e * 0.08;
        beamIntensity = 0.35 + easeOutCubic(frag) * 0.55;
        beamScale = 0.92 + easeOutCubic(frag) * 0.18;
      } else {
        const pull = (t - 0.52) / 0.48;
        const e = easeInOutCubic(pull);
        glyphClipReveal = 0;
        glyphAlpha = 0.45 - e * 0.45;
        glyphScale = 0.92 - e * 0.22;
        beamIntensity = 0.9 - e * 0.9;
        beamScale = 1.1 - e * 0.82;
      }
      break;
    }
    case "collapse_to_scan": {
      const scanT = easeInCubic(t);
      beamScale = 1 - scanT * 0.88;
      beamIntensity = 1 - easeInCubic(Math.min(1, t * 1.15));
      messageAlpha = t < 0.18 ? 1 - t / 0.18 : 0;
      glyphAlpha =
        t < 0.28
          ? 1 - easeInCubic(t / 0.28) * 0.35
          : 1 - easeInCubic((t - 0.28) / 0.72);
      glyphScale = 1 - scanT * 0.18;
      break;
    }
    case "particle_dissolve": {
      const bloom = easeInCubic(Math.min(1, t * 1.8)) * (1 - easeInCubic(t));
      beamScale = 1 + bloom * 0.14;
      beamIntensity = 1 - easeInCubic(Math.min(1, t * 1.1));
      messageAlpha = t < 0.3 ? 1 - easeInCubic(t / 0.3) : 0;
      glyphAlpha = t < 0.42 ? 1 : 1 - easeInCubic((t - 0.42) / 0.58);
      glyphScale = 1 + bloom * 0.06;
      break;
    }
    case "fade":
    default:
      beamScale = 1 - easeInCubic(t) * 0.08;
      beamIntensity = 1 - easeInCubic(t);
      glyphAlpha = 1 - easeInCubic(t);
      glyphScale = 1 - easeInCubic(t) * 0.04;
      messageAlpha = 1 - easeInCubic(t);
      break;
  }

  return {
    overall,
    beamScale,
    beamIntensity,
    glyphAlpha,
    glyphScale,
    messageAlpha,
    glyphClipReveal,
  };
}

function computeBeamOutSeedFrame(t, profile, exitMul) {
  const rise = easeInOutCubic(t);
  const peak = profile.exit_intensity * exitMul;
  let beamScale = 1;
  let beamIntensity = rise * peak;

  switch (profile.exit_style) {
    case "snap_out":
      beamScale = 1 + rise * 0.14;
      break;
    case "beam_dematerialize":
      beamScale = 0.86 + rise * 0.06;
      beamIntensity = (0.1 + rise * 0.25) * peak;
      break;
    case "collapse_to_scan":
      beamScale = 1 + rise * 0.18;
      break;
    case "particle_dissolve":
      beamScale = 1 + rise * 0.12;
      break;
    case "fade":
    default:
      beamScale = 1 + rise * 0.1;
      break;
  }

  return {
    overall: 1,
    beamScale,
    beamIntensity,
    glyphAlpha: 1,
    glyphScale: 1,
    messageAlpha: 1,
  };
}

/**
 * @param {object} lifecycleRef { phase, start, stableStart, exitStart }
 * @param {object} profile animation profile
 * @param {object} grammar scale grammar (entranceIntensityMul, exitIntensityMul)
 * @param {number} now performance.now()
 */
export function advanceLifecycle(
  lifecycleRef,
  profile,
  grammar,
  now,
  holdDurationMs,
  autoTimedExit,
  contract,
) {
  if (lifecycleRef.phase === LIFECYCLE_PHASES.CLEARED) {
    return {
      done: true,
      frame: computeFrame(lifecycleRef, profile, grammar, now, contract),
    };
  }

  if (lifecycleRef.reviewSkipToStable) {
    lifecycleRef.phase = LIFECYCLE_PHASES.STABLE;
    lifecycleRef.stableStart = now;
    lifecycleRef.reviewSkipToStable = false;
  }

  const timings = resolvePhaseTimings(profile, contract);
  const animScale =
    grammar && grammar.reviewTimeScale != null && grammar.reviewTimeScale > 0
      ? grammar.reviewTimeScale
      : 1;
  const freezeAtStable = Boolean(grammar && grammar.freezeAtStable);
  const entranceElapsed = (now - lifecycleRef.start) * animScale;
  const exitElapsed =
    lifecycleRef.exitStart != null ? (now - lifecycleRef.exitStart) * animScale : 0;

  if (
    lifecycleRef.phase === LIFECYCLE_PHASES.BEAM_IN_SEED &&
    entranceElapsed >= timings.beamInSeedMs
  ) {
    lifecycleRef.phase = LIFECYCLE_PHASES.MATERIALIZING;
  }

  if (
    lifecycleRef.phase === LIFECYCLE_PHASES.MATERIALIZING &&
    entranceElapsed >= timings.entranceMs
  ) {
    lifecycleRef.phase = LIFECYCLE_PHASES.STABLE;
    lifecycleRef.stableStart = now;
  }

  if (
    autoTimedExit &&
    !freezeAtStable &&
    lifecycleRef.phase === LIFECYCLE_PHASES.STABLE &&
    holdDurationMs != null &&
    lifecycleRef.stableStart != null &&
    now - lifecycleRef.stableStart >= holdDurationMs
  ) {
    lifecycleRef.phase = LIFECYCLE_PHASES.BEAM_OUT_SEED;
    lifecycleRef.exitStart = now;
  }

  if (
    lifecycleRef.phase === LIFECYCLE_PHASES.BEAM_OUT_SEED &&
    lifecycleRef.exitStart != null
  ) {
    if (exitElapsed >= timings.beamOutSeedMs) {
      lifecycleRef.phase = LIFECYCLE_PHASES.DEMATERIALIZING;
    }
  }

  if (
    lifecycleRef.phase === LIFECYCLE_PHASES.DEMATERIALIZING &&
    lifecycleRef.exitStart != null
  ) {
    if (exitElapsed >= timings.exitMs) {
      lifecycleRef.phase = LIFECYCLE_PHASES.CLEARED;
      return {
        done: true,
        frame: computeFrame(lifecycleRef, profile, grammar, now, contract),
      };
    }
  }

  return {
    done: false,
    frame: computeFrame(lifecycleRef, profile, grammar, now, contract),
  };
}

export function requestLifecycleExit(lifecycleRef) {
  if (
    isExitPhase(lifecycleRef.phase) ||
    lifecycleRef.phase === LIFECYCLE_PHASES.CLEARED ||
    lifecycleRef.phase === LIFECYCLE_PHASES.HIDDEN
  ) {
    return;
  }
  lifecycleRef.phase = LIFECYCLE_PHASES.BEAM_OUT_SEED;
  lifecycleRef.exitStart = performance.now();
}

export function resetLifecycle(lifecycleRef) {
  lifecycleRef.phase = LIFECYCLE_PHASES.BEAM_IN_SEED;
  lifecycleRef.start = performance.now();
  lifecycleRef.stableStart = null;
  lifecycleRef.exitStart = null;
}

export function computeFrame(lifecycleRef, profile, grammar, now, contract) {
  const enterMul = (grammar && grammar.entranceIntensityMul) || 1;
  const exitMul = (grammar && grammar.exitIntensityMul) || 1;
  const overshoot = profile.glyph_overshoot || 0;
  const timings = resolvePhaseTimings(profile, contract);
  const animScale =
    grammar && grammar.reviewTimeScale != null && grammar.reviewTimeScale > 0
      ? grammar.reviewTimeScale
      : 1;

  const phase = lifecycleRef.phase;
  let beamScale = 1;
  let beamIntensity = 1;
  let glyphAlpha = 1;
  let glyphScale = 1;
  let messageAlpha = 1;
  let particleMode = profile.particle_mode_hold;
  let particleStageT = 1;
  let overall = 1;
  let holdPulse = 1;
  let enterElapsedMs = 0;
  let objectLocked = false;
  let beamClearT = 0;
  let beamActive = false;
  let fieldMul = 1;
  let objectMaterialized = false;
  let glyphClipReveal = 1;

  if (phase === LIFECYCLE_PHASES.BEAM_IN_SEED) {
    enterElapsedMs = (now - lifecycleRef.start) * animScale;
    particleMode = profile.particle_mode_enter;
    const entrance = computeEntranceFrame(
      enterElapsedMs,
      timings.entranceMs,
      profile,
      enterMul,
      overshoot,
      false,
      contract,
    );
    overall = entrance.overall;
    beamScale = entrance.beamScale;
    beamIntensity = entrance.beamIntensity;
    fieldMul = entrance.fieldMul;
    glyphAlpha = 0;
    messageAlpha = 0;
    glyphScale = 0.94;
    glyphClipReveal = 0;
    particleStageT = entrance.particleStageT;
    beamActive = beamIntensity > 0.02;
  } else if (phase === LIFECYCLE_PHASES.MATERIALIZING) {
    enterElapsedMs = (now - lifecycleRef.start) * animScale;
    particleMode = profile.particle_mode_enter;
    const entrance = computeEntranceFrame(
      enterElapsedMs,
      timings.entranceMs,
      profile,
      enterMul,
      overshoot,
      true,
      contract,
    );
    overall = entrance.overall;
    beamScale = entrance.beamScale;
    beamIntensity = entrance.beamIntensity;
    fieldMul = entrance.fieldMul;
    glyphAlpha = entrance.glyphAlpha;
    glyphScale = entrance.glyphScale;
    messageAlpha = entrance.messageAlpha;
    glyphClipReveal = entrance.glyphClipReveal || 0;
    particleStageT = entrance.particleStageT;

    const enterBeam = resolveEnterBeamInPhase(
      enterElapsedMs,
      timings.entranceMs,
      profile.entrance_style,
      entrance.choreographyAnchors ||
        resolveChoreographyAnchors(profile, contract || {}),
    );
    beamClearT = enterBeam.beamClearT;
    if (enterBeam.inBeamClear) {
      objectLocked = true;
      glyphAlpha = 1;
      messageAlpha = 1;
      glyphScale = 1;
      glyphClipReveal = 1;
    }
    objectMaterialized = glyphAlpha >= 0.98 && messageAlpha >= 0.98;
    const cleared = applyBeamClear(beamScale, beamIntensity, beamClearT, 1);
    beamScale = cleared.beamScale;
    beamIntensity = cleared.beamIntensity;
    beamActive = beamIntensity > 0.02;
  } else if (phase === LIFECYCLE_PHASES.STABLE) {
    const stableElapsed = lifecycleRef.stableStart
      ? now - lifecycleRef.stableStart
      : 0;
    particleMode = profile.particle_mode_hold;
    beamScale = 0;
    beamIntensity = 0;
    glyphAlpha = 1;
    glyphScale = 1;
    messageAlpha = 1;
    objectLocked = true;
    objectMaterialized = true;
    beamActive = false;

    if (profile.hold_motion === "pulse" || profile.hold_motion === "scanfall") {
      holdPulse = 1 + Math.sin((stableElapsed / 2200) * Math.PI * 2) * 0.045;
    }
    overall = holdPulse;
  } else if (phase === LIFECYCLE_PHASES.BEAM_OUT_SEED) {
    const exitElapsed = (now - lifecycleRef.exitStart) * animScale;
    const t = clamp01(exitElapsed / timings.beamOutSeedMs);
    particleMode = profile.particle_mode_enter;
    objectLocked = true;
    const seed = computeBeamOutSeedFrame(t, profile, exitMul);
    overall = seed.overall;
    beamScale = seed.beamScale;
    beamIntensity = seed.beamIntensity;
    glyphAlpha = seed.glyphAlpha;
    glyphScale = seed.glyphScale;
    messageAlpha = seed.messageAlpha;
  } else if (phase === LIFECYCLE_PHASES.DEMATERIALIZING) {
    const exitElapsed = (now - lifecycleRef.exitStart) * animScale;
    const phaseElapsed = exitElapsed - timings.beamOutSeedMs;
    const t = clamp01(phaseElapsed / timings.dematerializingMs);
    particleMode = profile.particle_mode_exit;
    const demat = computeDematerializingFrame(t, profile, exitMul);
    overall = demat.overall;
    beamScale = demat.beamScale;
    beamIntensity = demat.beamIntensity;
    glyphAlpha = demat.glyphAlpha;
    glyphScale = demat.glyphScale;
    messageAlpha = demat.messageAlpha;
    glyphClipReveal = demat.glyphClipReveal != null ? demat.glyphClipReveal : 1;
    beamActive = beamIntensity > 0.02;
  }

  let phaseProgress = 0;
  if (phase === LIFECYCLE_PHASES.BEAM_IN_SEED) {
    phaseProgress = clamp01(((now - lifecycleRef.start) * animScale) / timings.beamInSeedMs);
  } else if (phase === LIFECYCLE_PHASES.MATERIALIZING) {
    const matElapsed = (now - lifecycleRef.start) * animScale - timings.beamInSeedMs;
    phaseProgress = clamp01(matElapsed / timings.materializingMs);
  } else if (phase === LIFECYCLE_PHASES.STABLE && lifecycleRef.stableStart != null) {
    phaseProgress = clamp01((now - lifecycleRef.stableStart) / 1200);
  } else if (phase === LIFECYCLE_PHASES.BEAM_OUT_SEED && lifecycleRef.exitStart != null) {
    phaseProgress = clamp01(((now - lifecycleRef.exitStart) * animScale) / timings.beamOutSeedMs);
    particleStageT = 1 - phaseProgress;
  } else if (phase === LIFECYCLE_PHASES.DEMATERIALIZING && lifecycleRef.exitStart != null) {
    const dematElapsed =
      (now - lifecycleRef.exitStart) * animScale - timings.beamOutSeedMs;
    phaseProgress = clamp01(dematElapsed / timings.dematerializingMs);
  }

  const objectAlphaMul =
    objectLocked || phase === LIFECYCLE_PHASES.DEMATERIALIZING ? 1 : overall;
  const beamPresenceMul =
    phase === LIFECYCLE_PHASES.BEAM_IN_SEED ||
    phase === LIFECYCLE_PHASES.BEAM_OUT_SEED ||
    objectLocked
      ? 1
      : phase === LIFECYCLE_PHASES.DEMATERIALIZING
        ? overall
        : overall;

  if (beamActive === false && beamIntensity > 0.02) {
    beamActive = true;
  }
  if (phase === LIFECYCLE_PHASES.STABLE || beamIntensity <= 0.02) {
    beamActive = false;
  }

  return {
    phase,
    namedEffectId: timings.namedEffectId,
    exitSubPhase:
      phase === LIFECYCLE_PHASES.BEAM_OUT_SEED
        ? "beam_out_seed"
        : phase === LIFECYCLE_PHASES.DEMATERIALIZING
          ? "dematerializing_object"
          : null,
    exitDematT:
      phase === LIFECYCLE_PHASES.DEMATERIALIZING && lifecycleRef.exitStart != null
        ? clamp01(
            (now - lifecycleRef.exitStart - timings.beamOutSeedMs) /
              timings.dematerializingMs,
          )
        : 0,
    particleMode,
    phaseProgress,
    particleStageT,
    enterElapsedMs,
    entranceMs: timings.entranceMs,
    beamInSeedMs: timings.beamInSeedMs,
    beamOutSeedMs: timings.beamOutSeedMs,
    objectLocked,
    objectMaterialized,
    beamActive,
    beamClearT,
    fieldMul,
    beamScale,
    beamIntensity: Math.max(0, beamIntensity * beamPresenceMul),
    glyphAlpha: Math.max(0, glyphAlpha * objectAlphaMul),
    glyphScale,
    messageAlpha: Math.max(0, messageAlpha * objectAlphaMul),
    glyphClipReveal: glyphClipReveal != null ? glyphClipReveal : 1,
    glyphResolveStyle: profile.glyph_resolve_style || "fade",
    fieldStyle: profile.field_style || "vertical_phase",
    messageRevealStyle: profile.message_reveal_style || "fade",
    choreographyAnchors: resolveChoreographyAnchors(profile, contract || {}),
    overallIntensity: Math.max(0, overall),
    holdPulse,
  };
}
