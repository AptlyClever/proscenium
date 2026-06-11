/** Preview-only animation profiles — entrance / hold / exit lifecycle. */

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

/** Canonical staged entrance windows (ms) — scaled to profile.entrance_ms. */
const ENTRANCE_STAGE_REF_MS = 700;
const ENTRANCE_STAGES = {
  beamSeedEnd: 150,
  particleStart: 150,
  particleEnd: 350,
  glyphStart: 350,
  glyphEnd: 550,
  messageStart: 450,
  messageEnd: 700,
};

function stageProgress(elapsedMs, entranceMs, startRef, endRef) {
  const scale = entranceMs / ENTRANCE_STAGE_REF_MS;
  const start = startRef * scale;
  const end = endRef * scale;
  return clamp01((elapsedMs - start) / Math.max(1, end - start));
}

/** Subtle settle — small overshoot, not cartoon bounce. */
function easeOutSubtleSnap(t, amount) {
  const bump = (amount || 0.04) * Math.sin(clamp01(t) * Math.PI);
  return clamp01(easeOutCubic(t) + bump * (1 - easeOutCubic(t)));
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
  const profiles = contract.previewVisual && contract.previewVisual.animationProfiles;
  const raw = (profiles && profiles[presetId]) || {};
  return Object.assign({}, DEFAULT_PROFILE, raw);
}

export function animationProfilePayload(profile) {
  return {
    entrance_style: profile.entrance_style,
    entrance_ms: profile.entrance_ms,
    entrance_intensity: profile.entrance_intensity,
    hold_motion: profile.hold_motion,
    exit_style: profile.exit_style,
    exit_ms: profile.exit_ms,
    exit_intensity: profile.exit_intensity,
    particle_mode_enter: profile.particle_mode_enter,
    particle_mode_hold: profile.particle_mode_hold,
    particle_mode_exit: profile.particle_mode_exit,
    glyph_resolve_style: profile.glyph_resolve_style,
    glyph_overshoot: profile.glyph_overshoot,
    note: "Preview-only animation profile — future Axiom-owned candidate",
  };
}

/**
 * @param {object} lifecycleRef { phase, start, holdStart, exitStart }
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
) {
  const enterMs = profile.entrance_ms;
  const exitMs = profile.exit_ms;
  const elapsed = now - lifecycleRef.start;

  if (lifecycleRef.phase === "enter" && elapsed >= enterMs) {
    lifecycleRef.phase = "hold";
    lifecycleRef.holdStart = now;
  }

  if (
    autoTimedExit &&
    lifecycleRef.phase === "hold" &&
    holdDurationMs != null &&
    lifecycleRef.holdStart != null &&
    now - lifecycleRef.holdStart >= holdDurationMs
  ) {
    lifecycleRef.phase = "exit";
    lifecycleRef.exitStart = now;
  }

  if (lifecycleRef.phase === "exit" && lifecycleRef.exitStart != null) {
    if (now - lifecycleRef.exitStart >= exitMs) {
      return { done: true, frame: computeFrame(lifecycleRef, profile, grammar, now) };
    }
  }

  return { done: false, frame: computeFrame(lifecycleRef, profile, grammar, now) };
}

export function requestLifecycleExit(lifecycleRef) {
  if (lifecycleRef.phase === "exit" || lifecycleRef.phase === "hidden") {
    return;
  }
  lifecycleRef.phase = "exit";
  lifecycleRef.exitStart = performance.now();
}

export function resetLifecycle(lifecycleRef) {
  lifecycleRef.phase = "enter";
  lifecycleRef.start = performance.now();
  lifecycleRef.holdStart = null;
  lifecycleRef.exitStart = null;
}

export function computeFrame(lifecycleRef, profile, grammar, now) {
  const enterMul = (grammar && grammar.entranceIntensityMul) || 1;
  const exitMul = (grammar && grammar.exitIntensityMul) || 1;
  const overshoot = profile.glyph_overshoot || 0;

  let phase = lifecycleRef.phase;
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

  if (phase === "enter") {
    const enterMs = profile.entrance_ms;
    enterElapsedMs = now - lifecycleRef.start;
    const t = clamp01(enterElapsedMs / enterMs);
    particleMode = profile.particle_mode_enter;
    overall = easeOutCubic(t) * profile.entrance_intensity * enterMul;

    const beamT = stageProgress(
      enterElapsedMs,
      enterMs,
      0,
      ENTRANCE_STAGES.beamSeedEnd,
    );
    particleStageT = stageProgress(
      enterElapsedMs,
      enterMs,
      ENTRANCE_STAGES.particleStart,
      ENTRANCE_STAGES.particleEnd,
    );
    const glyphT = stageProgress(
      enterElapsedMs,
      enterMs,
      ENTRANCE_STAGES.glyphStart,
      ENTRANCE_STAGES.glyphEnd,
    );
    const messageT = stageProgress(
      enterElapsedMs,
      enterMs,
      ENTRANCE_STAGES.messageStart,
      ENTRANCE_STAGES.messageEnd,
    );

    switch (profile.entrance_style) {
      case "pop_ping": {
        const snap = 0.05 + overshoot * 0.35;
        beamScale = 0.9 + easeOutCubic(beamT) * 0.1;
        beamIntensity =
          easeOutCubic(beamT) * 0.45 + easeOutCubic(particleStageT) * 0.55;
        glyphAlpha = glyphT > 0 ? easeOutSubtleSnap(glyphT, snap) : 0;
        glyphScale = glyphT > 0 ? 0.94 + easeOutSubtleSnap(glyphT, snap * 1.4) * 0.06 : 0.94;
        messageAlpha = easeOutCubic(messageT);
        break;
      }
      case "achievement_snap": {
        const snap = 0.04 + overshoot * 0.55;
        beamScale =
          0.84 +
          easeOutCubic(beamT) * 0.1 +
          easeOutCubic(particleStageT) * 0.06;
        beamIntensity =
          easeOutCubic(beamT) * 0.5 + easeOutCubic(particleStageT) * 0.5;
        glyphAlpha = glyphT > 0 ? easeOutSubtleSnap(glyphT, snap) : 0;
        glyphScale =
          glyphT > 0 ? 0.9 + easeOutSubtleSnap(glyphT, snap * 1.2) * 0.1 : 0.9;
        messageAlpha = easeOutCubic(messageT);
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
        glyphAlpha =
          glyphT < 0.1
            ? glyphT / 0.1 * 0.3
            : 0.3 + easeOutCubic((glyphT - 0.1) / 0.9) * 0.7;
        glyphScale = 0.88 + easeOutCubic(glyphT) * 0.12;
        messageAlpha = easeOutCubic(messageT);
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
        glyphAlpha = easeOutCubic(glyphT);
        glyphScale = 0.9 + easeOutCubic(glyphT) * 0.1;
        messageAlpha = easeOutCubic(messageT);
        break;
      case "fade":
      default:
        beamScale = 0.86 + easeOutCubic(beamT) * 0.14;
        beamIntensity = easeOutCubic(t);
        glyphAlpha = easeOutCubic(glyphT);
        glyphScale = 0.96 + easeOutCubic(glyphT) * 0.04;
        messageAlpha = easeOutCubic(messageT);
        break;
    }
  } else if (phase === "hold") {
    const holdElapsed = lifecycleRef.holdStart ? now - lifecycleRef.holdStart : 0;
    particleMode = profile.particle_mode_hold;
    beamScale = 1;
    beamIntensity = 1;
    glyphAlpha = 1;
    glyphScale = 1;
    messageAlpha = 1;

    if (profile.hold_motion === "pulse" || profile.hold_motion === "scanfall") {
      holdPulse = 1 + Math.sin((holdElapsed / 2200) * Math.PI * 2) * 0.045;
    }
    overall = holdPulse;
  } else if (phase === "exit") {
    const t = clamp01((now - lifecycleRef.exitStart) / profile.exit_ms);
    particleMode = profile.particle_mode_exit;
    overall = (1 - easeInCubic(t)) * profile.exit_intensity * exitMul;

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
        messageAlpha = t < 0.4 ? 1 - easeInCubic(t / 0.4) * 0.55 : 1 - easeInCubic((t - 0.4) / 0.6);
        glyphAlpha = t < 0.48 ? 1 : 1 - easeInCubic((t - 0.48) / 0.52);
        glyphScale = 1 - easeInCubic(t) * 0.07;
        break;
      case "collapse_to_scan": {
        const scanT = easeInCubic(t);
        beamScale = 1 - scanT * 0.88;
        beamIntensity = 1 - easeInCubic(Math.min(1, t * 1.15));
        messageAlpha = t < 0.18 ? 1 - t / 0.18 : 0;
        glyphAlpha = t < 0.28 ? 1 - easeInCubic(t / 0.28) * 0.35 : 1 - easeInCubic((t - 0.28) / 0.72);
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
  }

  let phaseProgress = 0;
  if (phase === "enter") {
    phaseProgress = clamp01((now - lifecycleRef.start) / profile.entrance_ms);
  } else if (phase === "hold" && lifecycleRef.holdStart != null) {
    phaseProgress = clamp01((now - lifecycleRef.holdStart) / 1200);
  } else if (phase === "exit" && lifecycleRef.exitStart != null) {
    phaseProgress = clamp01((now - lifecycleRef.exitStart) / profile.exit_ms);
  }

  return {
    phase,
    particleMode,
    phaseProgress,
    particleStageT,
    enterElapsedMs,
    entranceMs: profile.entrance_ms,
    beamScale,
    beamIntensity: beamIntensity * overall,
    glyphAlpha: Math.max(0, glyphAlpha * overall),
    glyphScale,
    messageAlpha: Math.max(0, messageAlpha * overall),
    overallIntensity: Math.max(0, overall),
    holdPulse,
  };
}
