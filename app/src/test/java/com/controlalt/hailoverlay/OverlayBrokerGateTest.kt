package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OverlayBrokerGateTest {
    private companion object {
        const val TEST_SECRET = "test-broker-secret-001"
    }

    @Test
    fun validateHailId_accepts_dynamic_id() {
        val result = OverlayBrokerGate.validateHailId("hail.dynamic.test.001")
        assertTrue(result.isSuccess)
        assertEquals("hail.dynamic.test.001", result.getOrNull())
    }

    @Test
    fun validateHailId_rejects_invalid_format() {
        assertTrue(OverlayBrokerGate.validateHailId("bad id").isFailure)
    }

    @Test
    fun validateBrokerProof_accepts_matching_proof() {
        val hailId = "hail.dynamic.test.001"
        val effectId = "transporter_beam"
        val glyphId = "hail-sniffer"
        val durationMs = 5000L
        val proof = OverlayBrokerGate.computeProof(TEST_SECRET, hailId, effectId, glyphId, durationMs)
        val result = OverlayBrokerGate.validateBrokerProof(proof, hailId, effectId, glyphId, durationMs)
        assertTrue(result.isSuccess)
    }

    @Test
    fun validateBrokerProof_rejects_missing_proof() {
        val result = OverlayBrokerGate.validateBrokerProof(
            brokerProof = null,
            hailId = "hail.dynamic.test.001",
            effectId = "transporter_beam",
            glyphId = "hail-sniffer",
            durationMs = 5000L,
        )
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_REQUIRED, result.exceptionOrNull()?.message)
    }

    @Test
    fun validateBrokerProof_rejects_wrong_proof() {
        val result = OverlayBrokerGate.validateBrokerProof(
            brokerProof = "deadbeef",
            hailId = "hail.dynamic.test.001",
            effectId = "transporter_beam",
            glyphId = "hail-sniffer",
            durationMs = 5000L,
        )
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }
}
