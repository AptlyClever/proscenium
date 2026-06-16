package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HailShowRequestVariationTest {

    private fun testSecret(): String = BuildConfig.OVERLAY_BROKER_SECRET

    @Test
    fun fromJson_parses_variation_and_android_tuning() {
        val json = """
            {
              "hail_id": "hail.sniffer.001",
              "effect_id": "transporter_beam",
              "glyph_id": "hail-sniffer",
              "palette_id": "transporter_white",
              "message": "Sniff check",
              "duration_ms": 5500,
              "placement_id": "upper_center",
              "placement_mode": "preset",
              "size_tier": "large",
              "effect_variation_id": "spoon",
              "android_effect_tuning": { "beam_intensity": 0.9, "beam_scale": 1.1 },
              "effect_identity": { "particle_style": "scanfall_dense" },
              "broker_proof": "placeholder"
            }
        """.trimIndent()

        val request = HailShowRequest.fromJson(json).getOrThrow()
        assertEquals("spoon", request.effectVariationId)
        assertEquals(0.9f, request.beamIntensity)
        assertEquals(1.1f, request.beamScale)
        assertEquals("scanfall_dense", request.particleStyleHint)
    }

    @Test
    fun validate_resolves_transporter_variation_on_validated_hail() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val proofPayload = OverlayBrokerGate.brokerProofPayloadFromValidated(
            hailId = "hail.sniffer.001",
            effectId = "transporter_beam",
            glyphId = "hail-sniffer",
            paletteId = "transporter_spoon",
            message = "Spoon beam",
            durationMs = 5500L,
            placement = placement,
            sizeTier = "large",
        )
        val proof = OverlayBrokerGate.computeProof(testSecret(), proofPayload)

        val result = HailRegistry.validate(
            hailId = proofPayload.hailId,
            effectId = proofPayload.effectId,
            glyphId = proofPayload.glyphId,
            paletteId = proofPayload.paletteId,
            message = proofPayload.message,
            durationMs = proofPayload.durationMs,
            placementId = proofPayload.placementId,
            placementMode = proofPayload.placementMode,
            xPercent = null,
            yPercent = null,
            sizeTier = proofPayload.sizeTier,
            brokerProof = proof,
            effectVariationId = "spoon",
            beamIntensity = 0.82f,
            beamScale = 1f,
            particleStyleHint = "scanfall_dense",
        )

        assertTrue(result.isSuccess)
        val hail = result.getOrThrow()
        assertEquals("spoon", hail.transporterVariation.profile.variationId)
        assertEquals(TransporterParticleStyle.SCANFALL_DENSE, hail.transporterVariation.profile.particleStyle)
    }
}
