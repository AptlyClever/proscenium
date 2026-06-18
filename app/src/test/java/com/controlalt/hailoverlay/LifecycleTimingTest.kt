package com.controlalt.hailoverlay

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

class LifecycleTimingTest {

    @Test
    fun fromJson_reads_contract_lifecycle() {
        val json = JSONObject(
            """
            {
              "entrance_animation_ms": 1200,
              "stable_hold_ms": 5000,
              "exit_animation_ms": 900,
              "beam_in_seed_ms": 520,
              "beam_out_seed_ms": 300
            }
            """.trimIndent(),
        )
        val timing = LifecycleTiming.fromJson(json, fallbackHoldMs = 5500L)
        assertEquals(1200L, timing.entranceMs)
        assertEquals(900L, timing.exitMs)
        assertEquals(520L, timing.beamInSeedMs)
        assertEquals(300L, timing.beamOutSeedMs)
        assertEquals(5000L, timing.stableHoldMs)
        assertEquals(7100L, timing.totalLifecycleMs(5500L))
    }

    @Test
    fun fromJson_defaults_when_missing() {
        val timing = LifecycleTiming.fromJson(null, fallbackHoldMs = 4800L)
        assertEquals(TransporterContract.ENTRANCE_MS, timing.entranceMs)
        assertEquals(TransporterContract.EXIT_MS, timing.exitMs)
        assertEquals(4800L, timing.stableHoldMs)
    }
}
