package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HailRegistryTest {

    private companion object {
        const val TEST_SECRET = "test-broker-secret-001"
    }

    private fun brokerProof(
        hailId: String = "hail.sniffer.001",
        effectId: String = "transporter_beam",
        glyphId: String = "hail-sniffer",
        durationMs: Long = 5500L,
    ): String {
        return OverlayBrokerGate.computeProof(TEST_SECRET, hailId, effectId, glyphId, durationMs)
    }

    private fun validBase(
        message: String = "What's sniffing?",
        effectId: String = "transporter_beam",
        glyphId: String = "hail-sniffer",
        paletteId: String = "axiom_dark_cyan",
        placementId: String = "upper_center",
        hailId: String = "hail.sniffer.001",
        durationMs: Long = 5500L,
    ) = HailRegistry.validate(
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
        brokerProof = brokerProof(hailId = hailId, effectId = effectId, glyphId = glyphId, durationMs = durationMs),
    )

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
        val hailId = "hail.sniffer.001"
        val effectId = "transporter_beam"
        val glyphId = "hail-sniffer"
        val durationMs = 5500L
        val result = HailRegistry.validate(
            hailId = hailId,
            effectId = effectId,
            glyphId = glyphId,
            paletteId = "axiom_dark_cyan",
            message = "Bad proof",
            durationMs = durationMs,
            placementId = "upper_center",
            placementMode = Placement.MODE_PRESET,
            xPercent = null,
            yPercent = null,
            brokerProof = "deadbeef",
        )
        assertTrue(result.isFailure)
        assertEquals(OverlayBrokerGate.ERROR_INVALID, result.exceptionOrNull()?.message)
    }

    @Test
    fun rejects_invalid_effect() {
        assertTrue(validBase(effectId = "laser_show").isFailure)
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
        assertTrue(validBase(placementId = "offscreen").isFailure)
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
