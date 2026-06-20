package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PopLifecycleTest {

    private val popChoreography = EffectChoreography(
        glyphResolveStyle = "overshoot_pop",
        messageRevealStyle = "quick_follow",
        effectStart = 0f,
        glyphResolveStart = 0.05f,
        glyphImpactPeak = 0.35f,
        glyphLockIn = 0.55f,
        messageRevealStart = 0.55f,
        stableReady = 0.7f,
    )

    @Test
    fun entrance_frame_peaks_flash_before_glyph_lock() {
        val early = PopLifecycle.computeEntranceFrame(0.2f, popChoreography)
        val peak = PopLifecycle.computeEntranceFrame(0.35f, popChoreography)
        val late = PopLifecycle.computeEntranceFrame(0.6f, popChoreography)
        assertTrue(peak.flashAlpha > early.flashAlpha)
        assertTrue(peak.glyphAlpha >= early.glyphAlpha)
        assertTrue(late.glyphAlpha >= peak.glyphAlpha * 0.9f)
    }

    @Test
    fun entrance_frame_reveals_message_with_quick_follow() {
        val timing = MessageSidekickTiming(
            entranceMs = 480L,
            exitMs = 360L,
            targetOpacity = 0.92f,
            exitOffsetMs = 4640L,
            stableHoldMs = 5000L,
            useStablePhase = false,
        )
        val early = PopLifecycle.computeEntranceFrame(0.5f, popChoreography, timing)
        val late = PopLifecycle.computeEntranceFrame(0.9f, popChoreography, timing)
        assertEquals(0f, early.messageAlpha, 0.001f)
        assertTrue(late.messageAlpha > 0.5f)
        assertTrue(late.messageScale > 0.9f)
    }

    @Test
    fun stable_frame_keeps_message_visible_with_quick_follow() {
        val timing = MessageSidekickTiming(
            entranceMs = 480L,
            exitMs = 360L,
            targetOpacity = 0.92f,
            exitOffsetMs = 4640L,
            stableHoldMs = 5000L,
            useStablePhase = false,
        )
        val frame = PopLifecycle.computeStableFrame(
            messageSidekick = timing,
            stablePulse = 0.25f,
        )
        assertEquals(0.92f, frame.messageAlpha, 0.02f)
    }

    @Test
    fun stable_frame_has_breathe_and_no_flash() {
        val frame = PopLifecycle.computeStableFrame(stablePulse = 0.25f)
        assertEquals(0f, frame.flashAlpha, 0.001f)
        assertTrue(frame.glyphAlpha > 0.9f)
        assertEquals(0.25f, frame.particlePhase, 0.001f)
    }

    @Test
    fun exit_frame_fades_out() {
        val start = PopLifecycle.computeExitFrame(0f)
        val end = PopLifecycle.computeExitFrame(1f)
        assertTrue(start.glyphAlpha > end.glyphAlpha)
        assertTrue(start.flashAlpha >= end.flashAlpha)
    }
}
