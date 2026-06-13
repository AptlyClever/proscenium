package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HailRegistryTest {

    private companion object {
        const val TEST_SECRET = "test-broker-secret-001"
    }

    private fun proofPayload(
        hailId: String = "hail.sniffer.001",
        effectId: String = "transporter_beam",
        glyphId: String = "hail-sniffer",
        paletteId: String = "axiom_dark_cyan",
        message: String = "What's sniffing?",
        durationMs: Long = 5500L,
        placementId: String = "upper_center",
        placementMode: String = Placement.MODE_PRESET,
        xPercent: Float? = null,
        yPercent: Float? = null,
        sizeTier: String = "medium",
    ): OverlayBrokerGate.BrokerProofPayload {
        val placement = Placement.resolve(placementId, placementMode, xPercent, yPercent).getOrThrow()
        return OverlayBrokerGate.brokerProofPayloadFromValidated(
            hailId = hailId,
            effectId = effectId,
            glyphId = glyphId,
            paletteId = paletteId,
            message = message,
            durationMs = durationMs,
            placement = placement,
            sizeTier = sizeTier,
        )
    }

    private fun brokerProof(payload: OverlayBrokerGate.BrokerProofPayload): String {
        return OverlayBrokerGate.computeProof(TEST_SECRET, payload)
    }

    private fun validBase(
        message: String = "What's sniffing?",
        effectId: String = "transporter_beam",
        glyphId: String = "hail-sniffer",
        paletteId: String = "axiom_dark_cyan",
        placementId: String = "upper_center",
        hailId: String = "hail.sniffer.001",
        durationMs: Long = 5500L,
        sizeTier: String? = null,
    ): Result<HailRegistry.ValidatedHail> {
        val payload = proofPayload(
            hailId = hailId,
            effectId = effectId,
            glyphId = glyphId,
            paletteId = paletteId,
            message = message,
            durationMs = durationMs,
            placementId = placementId,
            sizeTier = PaintBoxTier.resolve(sizeTier).tierId,
        )
        return HailRegistry.validate(
            hailId = hailId,
            effectId = effectId,
            glyphId = glyphId,
            paletteId = paletteId,
            message = message,
            durationMs = durationMs,
            placementId = placementId,
            placementMode = Placement.MODE_PRESET,
            xPercent = null,
            yPercent = null,
            sizeTier = sizeTier,
            brokerProof = brokerProof(payload),
        )
    }

    @Test
    fun accepts_valid_axiom_variant_message() {
        val result = validBase(message = "Sniff check initiated.")
        assertTrue(result.isSuccess)
        assertEquals("Sniff check initiated.", result.getOrNull()?.message)
    }

    @Test
    fun accepts_dynamic_hail_id_with_broker_proof() {
        val hailId = "hail.can_i_see_this.001"
        val result = validBase(
            hailId = hailId,
            message = "Can I see this?",
            durationMs = 5000L,
        )
        assertTrue(result.isSuccess)
        assertEquals(hailId, result.getOrNull()?.hailId)
    }

    @Test
    fun accepts_new_dynamic_hail_id_not_in_legacy_allowlist() {
        val hailId = "hail.dynamic.test.001"
        val result = validBase(hailId = hailId, message = "Dynamic hail")
        assertTrue(result.isSuccess)
        assertEquals(hailId, result.getOrNull()?.hailId)
    }

    @Test
    fun rejects_missing_broker_proof() {
        val result = HailRegistry.validate(
            hailId = "hail.sniffer.001",
            effectId = "transporter_beam",
            glyphId = "hail-sniffer",
            paletteId = "axiom_dark_cyan",
            message = "Missing proof",
            durationMs = 5500L,
            placementId = "upper_center",
            placementMode = Placement.MODE_PRESET,
            xPercent = null,
            yPercent = null,
            brokerProof = null,
        )
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_REQUIRED, result.exceptionOrNull()?.message)
    }

    @Test
    fun rejects_invalid_broker_proof() {
        val result = validBase().let { _ ->
            HailRegistry.validate(
                hailId = "hail.sniffer.001",
                effectId = "transporter_beam",
                glyphId = "hail-sniffer",
                paletteId = "axiom_dark_cyan",
                message = "Bad proof",
                durationMs = 5500L,
                placementId = "upper_center",
                placementMode = Placement.MODE_PRESET,
                xPercent = null,
                yPercent = null,
                brokerProof = "deadbeef",
            )
        }
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }

    @Test
    fun rejects_tampered_message_with_valid_broker_proof() {
        val payload = proofPayload(message = "Original message")
        val tamperedProof = brokerProof(payload)
        val result = HailRegistry.validate(
            hailId = payload.hailId,
            effectId = payload.effectId,
            glyphId = payload.glyphId,
            paletteId = payload.paletteId,
            message = "Tampered message",
            durationMs = payload.durationMs,
            placementId = payload.placementId,
            placementMode = payload.placementMode,
            xPercent = null,
            yPercent = null,
            brokerProof = tamperedProof,
        )
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }

    @Test
    fun rejects_tampered_palette_with_valid_broker_proof() {
        val payload = proofPayload(paletteId = "axiom_dark_cyan")
        val result = HailRegistry.validate(
            hailId = payload.hailId,
            effectId = payload.effectId,
            glyphId = payload.glyphId,
            paletteId = "transporter_white",
            message = payload.message,
            durationMs = payload.durationMs,
            placementId = payload.placementId,
            placementMode = payload.placementMode,
            xPercent = null,
            yPercent = null,
            brokerProof = brokerProof(payload),
        )
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }

    @Test
    fun rejects_tampered_placement_with_valid_broker_proof() {
        val payload = proofPayload(placementId = "upper_center")
        val result = HailRegistry.validate(
            hailId = payload.hailId,
            effectId = payload.effectId,
            glyphId = payload.glyphId,
            paletteId = payload.paletteId,
            message = payload.message,
            durationMs = payload.durationMs,
            placementId = "lower_center",
            placementMode = payload.placementMode,
            xPercent = null,
            yPercent = null,
            brokerProof = brokerProof(payload),
        )
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }

    @Test
    fun rejects_tampered_size_tier_with_valid_broker_proof() {
        val payload = proofPayload(sizeTier = "medium")
        val result = HailRegistry.validate(
            hailId = payload.hailId,
            effectId = payload.effectId,
            glyphId = payload.glyphId,
            paletteId = payload.paletteId,
            message = payload.message,
            durationMs = payload.durationMs,
            placementId = payload.placementId,
            placementMode = payload.placementMode,
            xPercent = null,
            yPercent = null,
            sizeTier = "large",
            brokerProof = brokerProof(payload),
        )
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }

    @Test
    fun rejects_invalid_effect() {
        assertTrue(validBase(effectId = "laser_show").isFailure)
    }

    @Test
    fun accepts_hail_eye_check_glyph() {
        val result = validBase(
            hailId = "hail.can_i_see_this.001",
            glyphId = "hail-eye-check",
            message = "Can I see this?",
        )
        assertTrue(result.isSuccess)
        assertEquals("hail-eye-check", result.getOrNull()?.glyphId)
    }

    @Test
    fun rejects_invalid_glyph() {
        assertTrue(validBase(glyphId = "unknown-glyph").isFailure)
    }

    @Test
    fun rejects_invalid_palette() {
        assertTrue(validBase(paletteId = "neon_pink").isFailure)
    }

    @Test
    fun rejects_invalid_placement() {
        val payload = proofPayload(placementId = "upper_center")
        val result = HailRegistry.validate(
            hailId = payload.hailId,
            effectId = payload.effectId,
            glyphId = payload.glyphId,
            paletteId = payload.paletteId,
            message = payload.message,
            durationMs = payload.durationMs,
            placementId = "offscreen",
            placementMode = Placement.MODE_PRESET,
            xPercent = null,
            yPercent = null,
            brokerProof = brokerProof(payload),
        )
        assertTrue(result.isFailure)
    }

    @Test
    fun rejects_blank_message() {
        assertTrue(validBase(message = "   ").isFailure)
    }

    @Test
    fun rejects_invalid_hail_id_format() {
        val result = validBase(hailId = "not-a-hail-id")
        assertTrue(result.isFailure)
    }
}
