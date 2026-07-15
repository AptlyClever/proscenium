package com.controlalt.hailoverlay

import kotlin.math.pow
import kotlin.math.sin

/**
 * Transporter materialization lifecycle — ports LCARD web-preview animation-profile.js
 * (beam_in_seed → materializing → beam_clear → stable → beam_out_seed → dematerialize).
 */
object TransporterLifecycle {

    /** Dematerialize segment opens at this normalized beam intensity (matches beam_out_seed end). */
    private const val EXIT_DEMAT_BEAM_INTENSITY = 0.35f
    private const val EXIT_DEMAT_BEAM_SCALE = 0.92f

    enum class EntranceSubPhase {
        BEAM_IN_SEED,
        MATERIALIZING,
        BEAM_CLEAR,
    }

    enum class ExitSubPhase {
        BEAM_OUT_SEED,
        DEMATERIALIZING,
    }

    data class Frame(
        val beamIntensity: Float,
        val beamScale: Float,
        val beamActive: Boolean,
        val beamReveal: Float,
        val beamClearT: Float,
        val glyphAlpha: Float,
        val glyphScale: Float,
        val glyphOffsetY: Float,
        val messageAlpha: Float,
        val particlePhase: Float,
        val dematerializing: Boolean,
    )

    fun easeOutCubic(t: Float): Float {
        val c = t.coerceIn(0f, 1f)
        return 1f - (1f - c).pow(3)
    }

    fun easeInCubic(t: Float): Float {
        val c = t.coerceIn(0f, 1f)
        return c * c * c
    }

    fun easeInOutCubic(t: Float): Float {
        val c = t.coerceIn(0f, 1f)
        return if (c < 0.5f) {
            4f * c * c * c
        } else {
            1f - (-2f * c + 2f).pow(3) / 2f
        }
    }

    fun entranceSubPhase(
        entranceT: Float,
        choreography: EffectChoreography,
        timing: LifecycleTiming = LifecycleTiming(),
    ): EntranceSubPhase {
        val t = entranceT.coerceIn(0f, 1f)
        val entranceMs = timing.entranceMs.toFloat().coerceAtLeast(1f)
        val beamInEnd = timing.beamInSeedMs.toFloat() / entranceMs
        val clearStart = choreography.glyphLockIn
        return when {
            t < beamInEnd -> EntranceSubPhase.BEAM_IN_SEED
            t < clearStart -> EntranceSubPhase.MATERIALIZING
            else -> EntranceSubPhase.BEAM_CLEAR
        }
    }

    fun exitSubPhase(exitElapsed: Float, timing: LifecycleTiming = LifecycleTiming()): ExitSubPhase {
        val exitMs = timing.exitMs.toFloat().coerceAtLeast(1f)
        val beamOutEnd = timing.beamOutSeedMs.toFloat() / exitMs
        return if (exitElapsed < beamOutEnd) {
            ExitSubPhase.BEAM_OUT_SEED
        } else {
            ExitSubPhase.DEMATERIALIZING
        }
    }

    /**
     * Smooth beam_clear overlay — identity at clearT=0, fully cleared at clearT=1.
     * Column reveal tapers so the field lifts away instead of popping off.
     */
    fun applyBeamClearHandoff(
        beamScale: Float,
        beamIntensity: Float,
        beamReveal: Float,
        beamClearT: Float,
    ): Triple<Float, Float, Float> {
        if (beamClearT <= 0f) {
            return Triple(beamScale, beamIntensity, beamReveal)
        }
        val eased = easeInOutCubic(beamClearT.coerceIn(0f, 1f))
        val fade = 1f - eased
        return Triple(
            beamScale * (0.18f + fade * 0.82f),
            beamIntensity * fade * 0.72f,
            beamReveal * (1f - eased * 0.88f),
        )
    }

    fun computeEntranceFrame(
        entranceT: Float,
        choreography: EffectChoreography,
        beamPresence: Float,
        messageSidekick: MessageSidekickTiming? = null,
        timing: LifecycleTiming = LifecycleTiming(),
    ): Frame {
        val t = entranceT.coerceIn(0f, 1f)
        val entranceMs = timing.entranceMs.toFloat().coerceAtLeast(1f)
        val beamInSeedMs = timing.beamInSeedMs.toFloat()
        val anchors = choreography
        val glyphT = segmentProgress(t, anchors.glyphResolveStart, anchors.glyphLockIn)
        val lockT = segmentProgress(t, anchors.glyphLockIn, anchors.stableReady)
        val messageT = segmentProgress(t, anchors.messageRevealStart, anchors.stableReady)
        val scanFlicker = if (t in 0.01f..0.99f) {
            sin(t * Math.PI.toFloat() * 5f) * 0.04f
        } else {
            0f
        }

        var beamScale: Float
        var beamIntensity: Float
        var particlePhase: Float
        var beamReveal: Float
        var beamClearT = 0f

        val beamInEnd = beamInSeedMs / entranceMs
        when {
            t < beamInEnd -> {
                val local = segmentProgress(t, 0f, beamInEnd)
                beamScale = 0.1f + easeOutCubic(local) * 0.52f
                beamIntensity = (easeOutCubic(local) * 0.82f + scanFlicker) * beamPresence
                particlePhase = local
                beamReveal = easeOutCubic(local)
            }
            else -> {
                if (t < anchors.glyphImpactPeak) {
                    beamScale = 0.58f + easeOutCubic(glyphT) * 0.22f
                    beamIntensity = (0.68f + easeOutCubic(glyphT) * 0.32f + scanFlicker) * beamPresence
                    particlePhase = glyphT
                } else {
                    beamScale = 0.8f + easeOutCubic(lockT) * 0.12f
                    beamIntensity = (0.88f + (1f - easeOutCubic(lockT)) * 0.12f + scanFlicker) * beamPresence
                    particlePhase = lockT
                }
                beamReveal = 1f

                if (t >= anchors.glyphLockIn) {
                    val rawClear = segmentProgress(t, anchors.glyphLockIn, 1f)
                    beamClearT = easeInOutCubic(rawClear)
                    val cleared = applyBeamClearHandoff(beamScale, beamIntensity, beamReveal, beamClearT)
                    beamScale = cleared.first
                    beamIntensity = cleared.second
                    beamReveal = cleared.third
                    particlePhase = 1f - beamClearT
                }
            }
        }

        if (t >= anchors.effectStart && t < anchors.glyphResolveStart) {
            val anticipation = segmentProgress(t, anchors.effectStart, anchors.glyphResolveStart)
            beamIntensity = (beamIntensity + anticipation * 0.08f * beamPresence).coerceIn(0f, 1f)
        }

        val glyphAlpha = when {
            t < anchors.effectStart -> 0.04f
            t < anchors.glyphResolveStart -> 0.04f + segmentProgress(t, anchors.effectStart, anchors.glyphResolveStart) * 0.04f
            else -> (0.08f + easeOutCubic(glyphT) * 0.92f).coerceIn(0f, 1f)
        }
        val glyphScale = computeGlyphEntranceScale(t, anchors)
        val messageAlpha = if (messageSidekick?.useStablePhase == true) {
            0f
        } else if (t < anchors.messageRevealStart) {
            0f
        } else {
            easeOutCubic(messageT) * 0.92f
        }

        return Frame(
            beamIntensity = beamIntensity.coerceIn(0f, 1f),
            beamScale = beamScale.coerceIn(0.05f, 1.35f),
            beamActive = beamIntensity > 0.03f,
            beamReveal = beamReveal.coerceIn(0f, 1f),
            beamClearT = beamClearT,
            glyphAlpha = glyphAlpha,
            glyphScale = glyphScale,
            glyphOffsetY = 0f,
            messageAlpha = messageAlpha.coerceIn(0f, 1f),
            particlePhase = particlePhase.coerceIn(0f, 1f),
            dematerializing = false,
        )
    }

    fun computeMessageAlphaStable(elapsedMs: Long, timing: MessageSidekickTiming): Float {
        val elapsed = elapsedMs.coerceAtLeast(0L)
        val opacity = timing.targetOpacity
        if (elapsed < timing.entranceMs) {
            val t = elapsed.toFloat() / timing.entranceMs.toFloat()
            return (easeOutCubic(t) * opacity).coerceIn(0f, 1f)
        }
        if (elapsed >= timing.exitOffsetMs) {
            val exitElapsed = elapsed - timing.exitOffsetMs
            if (exitElapsed >= timing.exitMs) {
                return 0f
            }
            val t = exitElapsed.toFloat() / timing.exitMs.toFloat()
            return (opacity * (1f - easeInCubic(t))).coerceIn(0f, 1f)
        }
        return opacity.coerceIn(0f, 1f)
    }

    fun computeStableFrame(
        stablePulse: Float,
        stableElapsedMs: Long = 0L,
        messageSidekick: MessageSidekickTiming? = null,
        stableInterest: StableInterest? = null,
    ): Frame {
        val breatheAmp = stableInterest?.glyphBreatheAmplitude?.coerceIn(0.02f, 0.12f) ?: 0.04f
        val pulse = 1f - breatheAmp + sin(stablePulse * Math.PI.toFloat() * 2f) * breatheAmp
        val scalePulse = 1f + sin(stablePulse * Math.PI.toFloat() * 2f) * (breatheAmp * 0.28f)
        val messageAlpha = if (messageSidekick?.useStablePhase == true) {
            computeMessageAlphaStable(stableElapsedMs, messageSidekick)
        } else {
            1f
        }
        return Frame(
            beamIntensity = 0f,
            beamScale = 0f,
            beamActive = false,
            beamReveal = 0f,
            beamClearT = 1f,
            glyphAlpha = pulse,
            glyphScale = scalePulse,
            glyphOffsetY = 0f,
            messageAlpha = messageAlpha.coerceIn(0f, 1f),
            particlePhase = stablePulse,
            dematerializing = false,
        )
    }

    fun computeExitFrame(
        exitElapsed: Float,
        beamPresence: Float,
        messageSidekick: MessageSidekickTiming? = null,
        timing: LifecycleTiming = LifecycleTiming(),
    ): Frame {
        val elapsed = exitElapsed.coerceIn(0f, 1f)
        val exitMs = timing.exitMs.toFloat().coerceAtLeast(1f)
        val beamOutSeedMs = timing.beamOutSeedMs.toFloat()
        val frame = when (exitSubPhase(elapsed, timing)) {
            ExitSubPhase.BEAM_OUT_SEED -> {
                val local = segmentProgress(elapsed, 0f, beamOutSeedMs / exitMs)
                val rise = easeInOutCubic(local)
                val beamIntensity = (0.1f + rise * (EXIT_DEMAT_BEAM_INTENSITY - 0.1f)) * beamPresence
                val beamScale = 0.86f + rise * (EXIT_DEMAT_BEAM_SCALE - 0.86f)
                Frame(
                    beamIntensity = beamIntensity.coerceIn(0f, 1f),
                    beamScale = beamScale,
                    beamActive = beamIntensity > 0.03f,
                    beamReveal = 0.12f + rise * 0.78f,
                    beamClearT = 0f,
                    glyphAlpha = 1f,
                    glyphScale = 1f,
                    glyphOffsetY = 0f,
                    messageAlpha = 1f,
                    particlePhase = 1f - rise * 0.35f,
                    dematerializing = false,
                )
            }
            ExitSubPhase.DEMATERIALIZING -> {
                val local = segmentProgress(
                    elapsed,
                    beamOutSeedMs / exitMs,
                    1f,
                )
                val frag = easeInOutCubic(local)
                val messageAlpha = if (local < 0.12f) {
                    1f - easeInOutCubic(local / 0.12f)
                } else {
                    0f
                }
                val (glyphAlpha, glyphScale, beamIntensity, beamScale, beamReveal) = when {
                    local < 0.14f -> Quintuple(1f, 1f, EXIT_DEMAT_BEAM_INTENSITY, EXIT_DEMAT_BEAM_SCALE, 0.9f)
                    local < 0.52f -> {
                        val f = (local - 0.14f) / 0.38f
                        val e = easeInOutCubic(f)
                        Quintuple(
                            1f - e * 0.55f,
                            1f - e * 0.04f,
                            (EXIT_DEMAT_BEAM_INTENSITY + easeOutCubic(f) * 0.55f) * beamPresence,
                            EXIT_DEMAT_BEAM_SCALE + easeOutCubic(f) * 0.18f,
                            0.9f - e * 0.25f,
                        )
                    }
                    else -> {
                        val pull = (local - 0.52f) / 0.48f
                        val e = easeInOutCubic(pull)
                        Quintuple(
                            0.45f - e * 0.45f,
                            1f - e * 0.04f,
                            (0.9f - e * 0.9f) * beamPresence,
                            1.1f - e * 0.82f,
                            0.65f - e * 0.65f,
                        )
                    }
                }
                Frame(
                    beamIntensity = beamIntensity.coerceIn(0f, 1f),
                    beamScale = beamScale,
                    beamActive = beamIntensity > 0.03f,
                    beamReveal = beamReveal.coerceIn(0f, 1f),
                    beamClearT = frag,
                    glyphAlpha = glyphAlpha.coerceIn(0f, 1f),
                    glyphScale = glyphScale,
                    glyphOffsetY = 0f,
                    messageAlpha = messageAlpha.coerceIn(0f, 1f),
                    particlePhase = 1f - local,
                    dematerializing = true,
                )
            }
        }
        return if (messageSidekick?.useStablePhase == true) {
            frame.copy(messageAlpha = 0f)
        } else {
            frame
        }
    }

    private data class Quintuple(
        val glyphAlpha: Float,
        val glyphScale: Float,
        val beamIntensity: Float,
        val beamScale: Float,
        val beamReveal: Float,
    )

    private fun computeGlyphEntranceScale(t: Float, anchors: EffectChoreography): Float {
        val overshoot = anchors.glyphLockInOvershoot.coerceIn(0f, 0.12f)
        val peakScale = 1f + overshoot
        return when {
            t < anchors.effectStart -> 0.82f
            t < anchors.glyphResolveStart -> {
                val local = segmentProgress(t, anchors.effectStart, anchors.glyphResolveStart)
                0.82f + easeOutCubic(local) * 0.04f
            }
            t < anchors.glyphImpactPeak -> {
                val local = segmentProgress(t, anchors.glyphResolveStart, anchors.glyphImpactPeak)
                0.86f + easeOutCubic(local) * 0.06f
            }
            t < anchors.glyphLockIn -> {
                val local = segmentProgress(t, anchors.glyphImpactPeak, anchors.glyphLockIn)
                0.92f + easeOutCubic(local) * (peakScale - 0.92f)
            }
            t < anchors.stableReady -> {
                val settle = segmentProgress(t, anchors.glyphLockIn, anchors.stableReady)
                peakScale - easeOutCubic(settle) * overshoot
            }
            else -> 1f
        }
    }

    private fun segmentProgress(t: Float, start: Float, end: Float): Float {
        if (t <= start) {
            return 0f
        }
        if (t >= end) {
            return 1f
        }
        return ((t - start) / (end - start).coerceAtLeast(0.001f)).coerceIn(0f, 1f)
    }
}
