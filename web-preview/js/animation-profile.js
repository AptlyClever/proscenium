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
 * Lane 5 — per-named-effect entrance staging (700ms reference scale).
 * Transporter delays glyph/message until transport field is readable.
 */
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
    entrance_ms: 200,
    entrance_intensity: 0.82,
    beam_in_seed_ms: 36,
    hold_motion: "drift",
    exit_style: "fade",
    exit_ms: 160,
    exit_intensity: 0.82,
    beam_out_seed_ms: 32,
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
    entrance_ms: 280,
    entrance_intensity: 1.02,
    beam_in_seed_ms: 72,
    hold_motion: "drift",
    exit_style: "snap_out",
    exit_ms: 220,
    exit_intensity: 1,
    beam_out_seed_ms: 68,
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
    entrance_ms: 700,
    entrance_intensity: 1.08,
    beam_in_seed_ms: 180,
    hold_motion: "pulse",
    exit_style: "particle_dissolve",
    exit_ms: 520,
    exit_intensity: 1.04,
    beam_out_seed_ms: 150,
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
    entrance_ms: 1500,
    entrance_intensity: 1,
    beam_in_seed_ms: 720,
    hold_motion: "drift",
    exit_style: "beam_dematerialize",
    exit_ms: 1150,
    exit_intensity: 1,
    beam_out_seed_ms: 380,
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

function entranceStagesForProfile(profile) {
  const namedId =
    profile.named_effect_id || resolveNamedEffectId(profile._preset_id);
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
function resolveEnterBeamInPhase(enterElapsedMs, enterMs, entranceStyle, stages) {
  const tuning = beamInTuning(entranceStyle);
  const s = stages || DEFAULT_ENTRANCE_STAGES;
  const glyphStartMs =
    entranceStageMs(enterMs, s.glyphStart) * tuning.materializeMul;
  const beamClearStartMs = entranceStageMs(enterMs, s.beamClearStart);
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
      ? clamp01((enterElapsedMs - beamClearStartMs) / Math.max(1, beamClearEndMs - beamClearStartMs))
      : 0;

  return {
    lifecyclePhase: LIFECYCLE_PHASES.MATERIALIZING,
    beamClearT: beamClearT * tuning.clearMul,
    inBeamClear: beamClearT > 0,
  };
}

function applyBeamClear(beamScale, beamIntensity, beamClearT) {
  if (beamClearT <= 0) {
    return { beamScale, beamIntensity };
  }
  const fade = 1 - easeInCubic(clamp01(beamClearT));
  return {
    beamScale: beamScale * (0.12 + fade * 0.88),
    beamIntensity: beamIntensity * fade,
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
  const beamInSeedMs =
    profile.beam_in_seed_ms != null
      ? profile.beam_in_seed_ms
      : Math.round(
          entranceMs * (ref.beam_in_seed_ms / ref.entrance_ms),
        );
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

  return Object.assign(
    {},
    DEFAULT_PROFILE,
    legacy || {},
    namedBase,
    contractNamedProfile,
    identityFromContract,
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
    entrance_intensity: profile.entrance_intensity,
    beam_in_seed_ms: timings.beamInSeedMs,
    materializing_ms: timings.materializingMs,
    hold_motion: profile.hold_motion,
    exit_style: profile.exit_style,
    exit_ms: profile.exit_ms,
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
    note: "Preview-only animation profile — Axiom Hails named effect lifecycle",
  };
}

/** Effect-specific glyph resolve — glyph first, message second. */
function computeGlyphResolve(glyphT, messageT, profile) {
  const style = profile.glyph_resolve_style || "fade";
  const reveal = profile.message_reveal_style || "fade";
  let glyphAlpha = 0;
  let glyphScale = 0.76;
  let messageAlpha = 0;
  let glyphClipReveal = 0;

  switch (style) {
    case "overshoot_pop": {
      if (glyphT <= 0) {
        break;
      }
      glyphAlpha = easeOutCubic(Math.min(1, glyphT * 2.2));
      if (glyphT < 0.42) {
        const t = glyphT / 0.42;
        glyphScale = 0.76 + easeOutCubic(t) * 0.4;
      } else if (glyphT < 0.68) {
        const t = (glyphT - 0.42) / 0.26;
        glyphScale = 1.16 - easeOutCubic(t) * 0.2;
      } else {
        const t = (glyphT - 0.68) / 0.32;
        glyphScale = 0.96 + easeOutCubic(t) * 0.04;
      }
      break;
    }
    case "center_snap": {
      if (glyphT <= 0) {
        break;
      }
      const impactT = easeOutCubic(Math.min(1, glyphT * 1.35));
      glyphAlpha = impactT < 0.22 ? (impactT / 0.22) * 0.45 : 0.45 + easeOutCubic((glyphT - 0.22) / 0.78) * 0.55;
      if (glyphT < 0.35) {
        glyphScale = 0.82 + easeOutCubic(glyphT / 0.35) * 0.28;
      } else if (glyphT < 0.58) {
        const t = (glyphT - 0.35) / 0.23;
        glyphScale = 1.1 - easeOutCubic(t) * 0.12;
      } else {
        const t = (glyphT - 0.58) / 0.42;
        glyphScale = 0.98 + easeOutCubic(t) * 0.02;
      }
      break;
    }
    case "scan_resolve": {
      if (glyphT <= 0) {
        break;
      }
      glyphClipReveal = easeOutCubic(glyphT);
      glyphAlpha =
        glyphT < 0.12
          ? (glyphT / 0.12) * 0.38
          : 0.38 + easeOutCubic((glyphT - 0.12) / 0.88) * 0.62;
      glyphScale = 0.86 + easeOutCubic(glyphT) * 0.14;
      if (glyphT > 0.9) {
        glyphScale = 1 + (1 - (glyphT - 0.9) / 0.1) * 0.05;
      }
      break;
    }
    case "fade":
    default:
      glyphAlpha = easeOutCubic(glyphT);
      glyphScale = 0.96 + easeOutCubic(glyphT) * 0.04;
      glyphClipReveal = easeOutCubic(glyphT);
      break;
  }

  switch (reveal) {
    case "quick_follow":
      messageAlpha = glyphT > 0.48 ? easeOutCubic(messageT) : 0;
      break;
    case "post_impact_fade":
      messageAlpha = glyphT > 0.62 ? easeOutCubic(messageT) * 0.92 : 0;
      break;
    case "secondary_scan_fade":
      messageAlpha = glyphT > 0.78 ? easeOutCubic(messageT) * 0.88 : 0;
      break;
    case "fade":
    default:
      messageAlpha = easeOutCubic(messageT);
      break;
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
) {
  const tuning = beamInTuning(profile.entrance_style);
  const stages = entranceStagesForProfile(profile);
  const t = clamp01(enterElapsedMs / enterMs);
  const overall = easeOutCubic(t) * profile.entrance_intensity * enterMul;

  const beamT = stageProgress(
    enterElapsedMs,
    enterMs,
    0,
    stages.beamSeedEnd * tuning.seedMul,
    stages,
  );
  const particleStageT = stageProgress(
    enterElapsedMs,
    enterMs,
    stages.particleStart,
    stages.particleEnd,
    stages,
  );
  const glyphT = stageProgress(
    enterElapsedMs,
    enterMs,
    stages.glyphStart,
    stages.glyphEnd,
    stages,
  );
  const messageT = stageProgress(
    enterElapsedMs,
    enterMs,
    stages.messageStart,
    stages.messageEnd,
    stages,
  );

  let beamScale = 1;
  let beamIntensity = 1;
  let glyphAlpha = 0;
  let glyphScale = 0.94;
  let messageAlpha = 0;
  let glyphClipReveal = 0;

  switch (profile.entrance_style) {
    case "pop_ping": {
      beamScale = 0.88 + easeOutCubic(beamT) * 0.08;
      beamIntensity =
        easeOutCubic(beamT) * 0.38 + easeOutCubic(particleStageT) * 0.48;
      break;
    }
    case "radial_burst": {
      beamScale = 0.52 + easeOutCubic(particleStageT) * 0.28;
      beamIntensity =
        easeOutCubic(beamT) * 0.28 + easeOutCubic(particleStageT) * 0.68;
      break;
    }
    case "achievement_snap": {
      beamScale =
        0.84 +
        easeOutCubic(beamT) * 0.1 +
        easeOutCubic(particleStageT) * 0.06;
      beamIntensity =
        easeOutCubic(beamT) * 0.56 + easeOutCubic(particleStageT) * 0.58;
      break;
    }
    case "scan_resolve": {
      const scanFlicker =
        particleStageT > 0 && particleStageT < 1
          ? Math.sin(particleStageT * Math.PI * 5) * 0.04
          : 0;
      beamScale =
        0.18 +
        easeOutCubic(beamT) * 0.52 +
        easeOutCubic(particleStageT) * 0.3;
      beamIntensity =
        0.06 +
        easeOutCubic(beamT) * 0.28 +
        easeOutCubic(particleStageT) * 0.58 +
        scanFlicker;
      break;
    }
    case "beam_materialize":
      beamScale =
        0.16 +
        easeOutCubic(beamT) * 0.52 +
        easeOutCubic(particleStageT) * 0.32;
      beamIntensity =
        0.08 +
        easeOutCubic(beamT) * 0.3 +
        easeOutCubic(particleStageT) * 0.62;
      break;
    case "fade":
    default:
      beamScale = 0.72 + easeOutCubic(beamT) * 0.18;
      beamIntensity = easeOutCubic(beamT);
      break;
  }

  if (objectVisible) {
    const glyph = computeGlyphResolve(glyphT, messageT, profile);
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
  };
}

function computeDematerializingFrame(t, profile, exitMul) {
  const overall = (1 - easeInCubic(t)) * profile.exit_intensity * exitMul;
  let beamScale = 1;
  let beamIntensity = 1;
  let glyphAlpha = 1;
  let glyphScale = 1;
  let messageAlpha = 1;

  switch (profile.exit_style) {
    case "snap_out":
      beamScale = 1 - easeInCubic(t) * 0.35;
      beamIntensity = 1 - easeInCubic(t);
      glyphAlpha = 1 - easeInCubic(Math.min(1, t * 1.5));
      glyphScale = 1 - easeInCubic(t) * 0.12;
      messageAlpha = t < 0.2 ? 1 - t / 0.2 : 0;
      break;
    case "beam_dematerialize":
      beamScale = 1 - easeInCubic(Math.min(1, t * 1.35)) * 0.78;
      beamIntensity = t < 0.6 ? 1 - easeInCubic(t / 0.6) : 0;
      messageAlpha =
        t < 0.4
          ? 1 - easeInCubic(t / 0.4) * 0.55
          : 1 - easeInCubic((t - 0.4) / 0.6);
      glyphAlpha = t < 0.48 ? 1 : 1 - easeInCubic((t - 0.48) / 0.52);
      glyphScale = 1 - easeInCubic(t) * 0.07;
      break;
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
  };
}

function computeBeamOutSeedFrame(t, profile, exitMul) {
  const rise = easeOutCubic(t);
  const peak = profile.exit_intensity * exitMul;
  let beamScale = 1;
  let beamIntensity = rise * peak;

  switch (profile.exit_style) {
    case "snap_out":
      beamScale = 1 + rise * 0.14;
      break;
    case "beam_dematerialize":
      beamScale = 1 + rise * 0.24;
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

  const timings = resolvePhaseTimings(profile, contract);
  const elapsed = now - lifecycleRef.start;

  if (
    lifecycleRef.phase === LIFECYCLE_PHASES.BEAM_IN_SEED &&
    elapsed >= timings.beamInSeedMs
  ) {
    lifecycleRef.phase = LIFECYCLE_PHASES.MATERIALIZING;
  }

  if (
    lifecycleRef.phase === LIFECYCLE_PHASES.MATERIALIZING &&
    elapsed >= timings.entranceMs
  ) {
    lifecycleRef.phase = LIFECYCLE_PHASES.STABLE;
    lifecycleRef.stableStart = now;
  }

  if (
    autoTimedExit &&
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
    const exitElapsed = now - lifecycleRef.exitStart;
    if (exitElapsed >= timings.beamOutSeedMs) {
      lifecycleRef.phase = LIFECYCLE_PHASES.DEMATERIALIZING;
    }
  }

  if (
    lifecycleRef.phase === LIFECYCLE_PHASES.DEMATERIALIZING &&
    lifecycleRef.exitStart != null
  ) {
    const exitElapsed = now - lifecycleRef.exitStart;
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
    enterElapsedMs = now - lifecycleRef.start;
    particleMode = profile.particle_mode_enter;
    const entrance = computeEntranceFrame(
      enterElapsedMs,
      timings.entranceMs,
      profile,
      enterMul,
      overshoot,
      false,
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
    enterElapsedMs = now - lifecycleRef.start;
    particleMode = profile.particle_mode_enter;
    const entrance = computeEntranceFrame(
      enterElapsedMs,
      timings.entranceMs,
      profile,
      enterMul,
      overshoot,
      true,
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
      entranceStagesForProfile(profile),
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
    const cleared = applyBeamClear(beamScale, beamIntensity, beamClearT);
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
    const exitElapsed = now - lifecycleRef.exitStart;
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
    const exitElapsed = now - lifecycleRef.exitStart;
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
  }

  let phaseProgress = 0;
  if (phase === LIFECYCLE_PHASES.BEAM_IN_SEED) {
    phaseProgress = clamp01((now - lifecycleRef.start) / timings.beamInSeedMs);
  } else if (phase === LIFECYCLE_PHASES.MATERIALIZING) {
    const matElapsed = now - lifecycleRef.start - timings.beamInSeedMs;
    phaseProgress = clamp01(matElapsed / timings.materializingMs);
  } else if (phase === LIFECYCLE_PHASES.STABLE && lifecycleRef.stableStart != null) {
    phaseProgress = clamp01((now - lifecycleRef.stableStart) / 1200);
  } else if (phase === LIFECYCLE_PHASES.BEAM_OUT_SEED && lifecycleRef.exitStart != null) {
    phaseProgress = clamp01((now - lifecycleRef.exitStart) / timings.beamOutSeedMs);
    particleStageT = 1 - phaseProgress;
  } else if (phase === LIFECYCLE_PHASES.DEMATERIALIZING && lifecycleRef.exitStart != null) {
    const dematElapsed = now - lifecycleRef.exitStart - timings.beamOutSeedMs;
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
    overallIntensity: Math.max(0, overall),
    holdPulse,
  };
}
