package com.controlalt.hailoverlay

import kotlin.math.sin

/**
 * Pop effect lifecycle — quick punchy ingress/egress (no transporter beam).
 * Contract anchors: effectStart=0, glyphImpactPeak=0.35, glyphLockIn=0.55, messageReveal=0.55.
 */
object PopLifecycle {

    data class Frame(
        val flashAlpha: Float,
        val flashScale: Float,
        val glyphAlpha: Float,
        val glyphScale: Float,
        val messageAlpha: Float,
        val messageScale: Float = 1f,
        val scrimAlpha: Float = 1f,
        val particlePhase: Float,
    )

    fun computeEntranceFrame(
        entranceT: Float,
        choreography: EffectChoreography,
        messageSidekick: MessageSidekickTiming? = null,
    ): Frame {
        val t = entranceT.coerceIn(0f, 1f)
        val anchors = choreography
        val impactT = segmentProgress(t, anchors.effectStart, anchors.glyphImpactPeak)
        val lockT = segmentProgress(t, anchors.glyphImpactPeak, anchors.glyphLockIn)
        val messageT = segmentProgress(t, anchors.messageRevealStart, anchors.stableReady)

        val flashPeak = when {
            t < anchors.glyphImpactPeak -> TransporterLifecycle.easeOutCubic(impactT) * 0.92f
            t < anchors.glyphLockIn -> 1f - TransporterLifecycle.easeInCubic(lockT) * 0.42f
            else -> (1f - segmentProgress(t, anchors.glyphLockIn, 1f)).coerceIn(0f, 1f) * 0.32f
        }
        val flashScale = 0.72f + flashPeak * 0.38f

        val glyphAlpha = when {
            t < anchors.glyphResolveStart -> 0f
            t < anchors.glyphImpactPeak -> segmentProgress(t, anchors.glyphResolveStart, anchors.glyphImpactPeak) * 0.35f
            else -> (0.35f + TransporterLifecycle.easeOutCubic(lockT) * 0.65f).coerceIn(0f, 1f)
        }
        val glyphScale = computeOvershootPopScale(t, anchors)
        val messageScale = computeMessagePopScale(t, anchors)

        val messageOpacity = messageSidekick?.targetOpacity?.coerceIn(0.2f, 1f) ?: 1f
        val messageAlpha = if (messageSidekick?.useStablePhase == true) {
            0f
        } else {
            (TransporterLifecycle.easeOutCubic(messageT).coerceIn(0f, 1f) * messageOpacity)
        }

        val scrimT = segmentProgress(t, anchors.effectStart, anchors.stableReady.coerceAtLeast(0.2f))
        val scrimAlpha = TransporterLifecycle.easeOutCubic(scrimT).coerceIn(0f, 1f)

        return Frame(
            flashAlpha = flashPeak.coerceIn(0f, 1f),
            flashScale = flashScale,
            glyphAlpha = glyphAlpha,
            glyphScale = glyphScale,
            messageAlpha = messageAlpha,
            messageScale = messageScale,
            scrimAlpha = scrimAlpha,
            particlePhase = impactT.coerceIn(0f, 1f),
        )
    }

    fun computeStableFrame(
        messageSidekick: MessageSidekickTiming? = null,
        stableElapsedMs: Long = 0L,
        stablePulse: Float = 0f,
    ): Frame {
        val breatheAmp = 0.04f
        val pulse = 1f - breatheAmp + sin(stablePulse * Math.PI.toFloat() * 2f) * breatheAmp
        val messageOpacity = messageSidekick?.targetOpacity?.coerceIn(0.2f, 1f) ?: 1f
        val messageAlpha = if (messageSidekick?.useStablePhase == true) {
            TransporterLifecycle.computeMessageAlphaStable(stableElapsedMs, messageSidekick)
        } else {
            messageOpacity
        }
        return Frame(
            flashAlpha = 0f,
            flashScale = 1f,
            glyphAlpha = pulse,
            glyphScale = pulse,
            messageAlpha = messageAlpha.coerceIn(0f, 1f),
            messageScale = 1f,
            scrimAlpha = 1f,
            particlePhase = stablePulse,
        )
    }

    fun computeExitFrame(
        exitElapsed: Float,
        messageSidekick: MessageSidekickTiming? = null,
        timing: LifecycleTiming = LifecycleTiming(),
    ): Frame {
        val t = exitElapsed.coerceIn(0f, 1f)
        val fade = 1f - TransporterLifecycle.easeInCubic(t)
        val messageOpacity = messageSidekick?.targetOpacity?.coerceIn(0.2f, 1f) ?: 1f
        val messageAlpha = if (messageSidekick?.useStablePhase == true) {
            val exitMs = timing.exitMs.coerceAtLeast(1L)
            val elapsedMs = (t * exitMs.toFloat()).toLong()
            TransporterLifecycle.computeMessageAlphaStable(
                messageSidekick.exitOffsetMs + elapsedMs,
                messageSidekick,
            )
        } else {
            fade * messageOpacity
        }
        return Frame(
            flashAlpha = fade * 0.35f,
            flashScale = 0.85f + fade * 0.15f,
            glyphAlpha = fade,
            glyphScale = 0.92f + fade * 0.08f,
            messageAlpha = messageAlpha.coerceIn(0f, 1f),
            messageScale = 0.92f + fade * 0.08f,
            scrimAlpha = fade,
            particlePhase = t,
        )
    }

    private fun computeOvershootPopScale(t: Float, choreography: EffectChoreography): Float {
        val peak = choreography.glyphImpactPeak.coerceIn(0.1f, 0.9f)
        val lock = choreography.glyphLockIn.coerceIn(peak + 0.05f, 0.98f)
        val overshoot = choreography.glyphLockInOvershoot.coerceIn(0f, 0.12f).let {
            if (it > 0f) it else 0.08f
        }
        if (t < choreography.glyphResolveStart) {
            return 0.72f
        }
        if (t < peak) {
            val local = segmentProgress(t, choreography.glyphResolveStart, peak)
            return 0.72f + TransporterLifecycle.easeOutCubic(local) * 0.18f
        }
        if (t < lock) {
            val local = segmentProgress(t, peak, lock)
            val bump = sin(local * Math.PI.toFloat()) * overshoot
            return 0.9f + bump
        }
        val settle = segmentProgress(t, lock, choreography.stableReady.coerceAtLeast(lock + 0.05f))
        return (1f + overshoot * 0.5f * (1f - TransporterLifecycle.easeOutCubic(settle))).coerceIn(0.85f, 1.15f)
    }

    private fun computeMessagePopScale(t: Float, choreography: EffectChoreography): Float {
        val reveal = choreography.messageRevealStart.coerceIn(0f, 0.95f)
        val ready = choreography.stableReady.coerceAtLeast(reveal + 0.08f)
        if (t < reveal) {
            return 0.68f
        }
        val local = segmentProgress(t, reveal, ready)
        val overshoot = choreography.glyphLockInOvershoot.coerceIn(0f, 0.12f).let {
            if (it > 0f) it else 0.08f
        }
        val bump = sin(local * Math.PI.toFloat()) * overshoot * 0.85f
        return (0.68f + TransporterLifecycle.easeOutCubic(local) * 0.32f + bump).coerceIn(0.65f, 1.12f)
    }

    private fun segmentProgress(t: Float, start: Float, end: Float): Float {
        if (end <= start) {
            return if (t >= start) 1f else 0f
        }
        return ((t - start) / (end - start)).coerceIn(0f, 1f)
    }
}
