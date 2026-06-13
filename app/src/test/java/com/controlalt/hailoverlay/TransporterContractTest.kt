package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TransporterContractTest {

    @Test
    fun total_lifecycle_is_additive() {
        assertEquals(8300L, TransporterContract.totalLifecycleMs(5000L))
    }

    @Test
    fun entrance_and_exit_match_axiom_contract() {
        assertEquals(1900L, TransporterContract.ENTRANCE_MS)
        assertEquals(1400L, TransporterContract.EXIT_MS)
    }
}
