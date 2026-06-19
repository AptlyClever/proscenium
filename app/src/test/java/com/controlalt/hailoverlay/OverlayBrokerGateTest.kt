package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OverlayBrokerGateTest {
    private companion object {
        const val TEST_SECRET = "test-broker-secret-001"
    }

    private fun samplePayload(
        hailId: String = "hail.dynamic.test.001",
        message: String = "Dynamic hail broker test",
        placementId: String = "upper_center",
        placementMode: String = Placement.MODE_PRESET,
        xPercent: Float? = null,
        yPercent: Float? = null,
        sizeTier: String = "medium",
    ): OverlayBrokerGate.BrokerProofPayload {
        val placement = Placement.resolve(placementId, placementMode, xPercent, yPercent).getOrThrow()
        return OverlayBrokerGate.brokerProofPayloadFromValidated(
            hailId = hailId,
            effectId = "transporter_beam",
            glyphId = "default",
            paletteId = "axiom_dark_cyan",
            message = message,
            durationMs = 5000L,
            placement = placement,
            sizeTier = sizeTier,
        )
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
    fun canonicalProofInput_includes_full_render_payload() {
        val payload = samplePayload()
        val canonical = OverlayBrokerGate.canonicalProofInput(payload)
        assertEquals(
            "hail.dynamic.test.001|transporter_beam|default|axiom_dark_cyan|Dynamic hail broker test|5000|upper_center|preset|||medium",
            canonical,
        )
    }

    @Test
    fun validateBrokerProofWithSecret_accepts_matching_proof() {
        val payload = samplePayload()
        val proof = OverlayBrokerGate.computeProof(TEST_SECRET, payload)
        val result = OverlayBrokerGate.validateBrokerProofWithSecret(proof, payload, TEST_SECRET)
        assertTrue(result.isSuccess)
    }

    @Test
    fun validateBrokerProofWithSecret_rejects_missing_proof() {
        val payload = samplePayload()
        val result = OverlayBrokerGate.validateBrokerProofWithSecret(null, payload, TEST_SECRET)
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_REQUIRED, result.exceptionOrNull()?.message)
    }

    @Test
    fun validateBrokerProofWithSecret_rejects_wrong_proof() {
        val payload = samplePayload()
        val result = OverlayBrokerGate.validateBrokerProofWithSecret("deadbeef", payload, TEST_SECRET)
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }

    @Test
    fun validateBrokerProofWithSecret_rejects_tampered_message() {
        val payload = samplePayload(message = "Signed message")
        val proof = OverlayBrokerGate.computeProof(TEST_SECRET, payload)
        val tampered = payload.copy(message = "Changed message")
        val result = OverlayBrokerGate.validateBrokerProofWithSecret(proof, tampered, TEST_SECRET)
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }

    @Test
    fun validateBrokerProofWithSecret_rejects_tampered_palette() {
        val payload = samplePayload()
        val proof = OverlayBrokerGate.computeProof(TEST_SECRET, payload)
        val tampered = payload.copy(paletteId = "transporter_white")
        val result = OverlayBrokerGate.validateBrokerProofWithSecret(proof, tampered, TEST_SECRET)
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }

    @Test
    fun validateBrokerProofWithSecret_rejects_tampered_custom_placement() {
        val payload = samplePayload(
            placementId = "custom",
            placementMode = Placement.MODE_CUSTOM,
            xPercent = 72f,
            yPercent = 18f,
        )
        val proof = OverlayBrokerGate.computeProof(TEST_SECRET, payload)
        val tampered = payload.copy(yPercent = 24f)
        val result = OverlayBrokerGate.validateBrokerProofWithSecret(proof, tampered, TEST_SECRET)
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }

    @Test
    fun validateBrokerProofWithSecret_rejects_tampered_size_tier() {
        val payload = samplePayload(sizeTier = "medium")
        val proof = OverlayBrokerGate.computeProof(TEST_SECRET, payload)
        val tampered = payload.copy(sizeTier = "large")
        val result = OverlayBrokerGate.validateBrokerProofWithSecret(proof, tampered, TEST_SECRET)
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }
}
