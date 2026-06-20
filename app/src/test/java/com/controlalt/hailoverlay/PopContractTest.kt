package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Test

class PopContractTest {

    @Test
    fun pop_timing_between_harness_and_transporter() {
        assertEquals(900L, PopContract.ENTRANCE_MS)
        assertEquals(480L, PopContract.EXIT_MS)
        assert(PopContract.ENTRANCE_MS < TransporterContract.ENTRANCE_MS)
        assert(PopContract.ENTRANCE_MS > 600L)
    }

    @Test
    fun lifecycleTiming_replaces_transporter_defaults() {
        val timing = PopContract.lifecycleTiming(5000L)
        assertEquals(900L, timing.entranceMs)
        assertEquals(480L, timing.exitMs)
        assertEquals(5000L, timing.stableHoldMs)
    }
}
