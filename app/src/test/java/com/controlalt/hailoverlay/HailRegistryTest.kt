package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HailRegistryTest {

    private fun testSecret(): String = BuildConfig.OVERLAY_BROKER_SECRET

    private fun proofPayload(
        hailId: String = "hail.spoon_transporter.001",
        effectId: String = "transporter_beam",
        glyphId: String = "default",
        paletteId: String = "axiom_dark_cyan",
        message: String = "Spoon transporter check",
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
        return OverlayBrokerGate.computeProof(testSecret(), payload)
    }

    private fun validBase(
        message: String = "Spoon transporter check",
        effectId: String = "transporter_beam",
        glyphId: String = "default",
        paletteId: String = "axiom_dark_cyan",
        placementId: String = "upper_center",
        hailId: String = "hail.spoon_transporter.001",
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
        val hailId = "hail.spoon_transporter.001"
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
            hailId = "hail.spoon_transporter.001",
            effectId = "transporter_beam",
            glyphId = "default",
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
                hailId = "hail.spoon_transporter.001",
                effectId = "transporter_beam",
                glyphId = "default",
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
            hailId = "hail.spoon_transporter.001",
            glyphId = "default",
            message = "Can I see this?",
        )
        assertTrue(result.isSuccess)
        assertEquals("default", result.getOrNull()?.glyphId)
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

    @Test
    fun accepts_custom_image_layers_glyph_with_broker_proof() {
        val hailId = "hail.fleet_beacon.001"
        val payload = proofPayload(
            hailId = hailId,
            glyphId = "custom-fleet-beacon",
            message = "Achievement unlocked",
        )
        val layers = ImageLayersGlyphSpec(
            layers = listOf(
                ImageLayerSpec(
                    role = "mass",
                    bitmapBase64 = "aW1hZ2U=",
                    mediaType = "image/png",
                    zIndex = 0,
                ),
                ImageLayerSpec(
                    role = "accent",
                    bitmapBase64 = "aW1hZ2Uy",
                    mediaType = "image/png",
                    zIndex = 1,
                    pulseAnchor = "glyphImpactPeak",
                ),
            ),
        )
        val result = HailRegistry.validate(
            hailId = hailId,
            effectId = payload.effectId,
            glyphId = payload.glyphId,
            paletteId = payload.paletteId,
            message = payload.message,
            durationMs = payload.durationMs,
            placementId = payload.placementId,
            placementMode = payload.placementMode,
            xPercent = null,
            yPercent = null,
            brokerProof = brokerProof(payload),
            imageLayersGlyph = layers,
        )
        assertTrue(result.isSuccess)
        assertNotNull(result.getOrNull()?.imageLayersGlyph)
    }

    @Test
    fun resolves_variation_canonical_palette_when_operator_palette_is_default_cyan() {
        val spoonPayload = proofPayload(paletteId = "transporter_spoon")
        val result = HailRegistry.validate(
            hailId = spoonPayload.hailId,
            effectId = spoonPayload.effectId,
            glyphId = spoonPayload.glyphId,
            paletteId = "axiom_dark_cyan",
            message = spoonPayload.message,
            durationMs = spoonPayload.durationMs,
            placementId = spoonPayload.placementId,
            placementMode = spoonPayload.placementMode,
            xPercent = null,
            yPercent = null,
            sizeTier = spoonPayload.sizeTier,
            brokerProof = brokerProof(spoonPayload),
            effectVariationId = "spoon",
        )
        assertTrue(result.isSuccess)
        assertEquals("transporter_spoon", result.getOrNull()?.paletteId)
    }
}
