package com.controlalt.hailoverlay

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StableInterestTest {

    @Test
    fun fromJson_parses_contract_block() {
        val json = JSONObject(
            """
            {
              "stable_residual": "optional_glyph_local",
              "glyph_breathe_amplitude": 0.06,
              "glyph_shimmer_intensity": 0.37,
              "stable_rim_pulse_ms": 420,
              "rim_pulse_enabled": true
            }
            """.trimIndent(),
        )
        val interest = StableInterest.fromJson(json)
        requireNotNull(interest)
        assertTrue(interest.glyphLocalResidual)
        assertEquals(0.06f, interest.glyphBreatheAmplitude, 0.001f)
        assertEquals(0.37f, interest.glyphShimmerIntensity, 0.001f)
        assertTrue(interest.rimPulseEnabled)
    }

    @Test
    fun rimPulseAlpha_fades_after_window() {
        val interest = StableInterest(rimPulseEnabled = true, stableRimPulseMs = 420L)
        val early = StableInterest.rimPulseAlpha(120L, 0.14f, interest)
        val late = StableInterest.rimPulseAlpha(500L, 0.14f, interest)
        assertTrue(early > late)
        assertEquals(0f, late, 0.001f)
    }

    @Test
    fun rimPulse_disabled_for_green() {
        val interest = StableInterest(rimPulseEnabled = false)
        assertEquals(0f, StableInterest.rimPulseAlpha(100L, 0.2f, interest), 0.001f)
    }
}
