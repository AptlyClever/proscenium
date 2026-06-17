package com.controlalt.hailoverlay

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MessageSidekickTimingTest {

    @Test
    fun fromJson_parses_sidekick_entity() {
        val entity = JSONObject(
            """
            {
              "text": "Hello TV",
              "sidekick_id": "secondary_fade",
              "entrance_ms": 240,
              "exit_ms": 180,
              "opacity": 0.88,
              "exit_offset_ms": 4820,
              "stable_hold_ms": 5000
            }
            """.trimIndent(),
        )
        val timing = MessageSidekickTiming.fromJson(entity, stableHoldMs = 5000L)
        assertTrue(timing.useStablePhase)
        assertEquals(240L, timing.entranceMs)
        assertEquals(180L, timing.exitMs)
        assertEquals(0.88f, timing.targetOpacity, 0.001f)
        assertEquals(4820L, timing.exitOffsetMs)
    }

    @Test
    fun fromJson_legacy_reveal_fields_use_entrance_choreography() {
        val entity = JSONObject(
            """{ "text": "Hi", "reveal_delay_ms": 420, "reveal_style": "fade" }""",
        )
        val timing = MessageSidekickTiming.fromJson(entity, stableHoldMs = 5000L)
        assertFalse(timing.useStablePhase)
    }

    @Test
    fun computeMessageAlphaStable_fades_in_at_stable_start() {
        val timing = MessageSidekickTiming(
            entranceMs = 480L,
            exitMs = 360L,
            targetOpacity = 0.92f,
            exitOffsetMs = 4640L,
            stableHoldMs = 5000L,
            useStablePhase = true,
        )
        assertEquals(0f, TransporterLifecycle.computeMessageAlphaStable(0L, timing), 0.001f)
        assertTrue(TransporterLifecycle.computeMessageAlphaStable(240L, timing) > 0.4f)
        assertEquals(0.92f, TransporterLifecycle.computeMessageAlphaStable(480L, timing), 0.02f)
        assertEquals(0.92f, TransporterLifecycle.computeMessageAlphaStable(3000L, timing), 0.02f)
    }

    @Test
    fun computeMessageAlphaStable_fades_out_before_hold_end() {
        val timing = MessageSidekickTiming(
            entranceMs = 480L,
            exitMs = 360L,
            targetOpacity = 0.92f,
            exitOffsetMs = 4640L,
            stableHoldMs = 5000L,
            useStablePhase = true,
        )
        assertTrue(TransporterLifecycle.computeMessageAlphaStable(4980L, timing) < 0.2f)
        assertEquals(0f, TransporterLifecycle.computeMessageAlphaStable(5000L, timing), 0.001f)
    }

    @Test
    fun entrance_frame_hides_message_when_sidekick_stable_phase() {
        val choreography = EffectChoreography(messageRevealStart = 0.2f, stableReady = 0.95f)
        val timing = MessageSidekickTiming(
            entranceMs = 480L,
            exitMs = 360L,
            targetOpacity = 0.92f,
            exitOffsetMs = 4640L,
            stableHoldMs = 5000L,
            useStablePhase = true,
        )
        val lateEntrance = TransporterLifecycle.computeEntranceFrame(0.95f, choreography, 1f, timing)
        assertEquals(0f, lateEntrance.messageAlpha, 0.001f)
    }
}
