package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HailRegistryTest {

    private fun validBase(
        message: String = "What's sniffing?",
        effectId: String = "transporter_beam",
        glyphId: String = "hail-sniffer",
        paletteId: String = "axiom_dark_cyan",
        placementId: String = "upper_center",
    ) = HailRegistry.validate(
        hailId = "hail.sniffer.001",
        effectId = effectId,
        glyphId = glyphId,
        paletteId = paletteId,
        message = message,
        durationMs = 5500L,
        placementId = placementId,
        placementMode = Placement.MODE_PRESET,
        xPercent = null,
        yPercent = null,
    )

    @Test
    fun accepts_valid_axiom_variant_message() {
        val result = validBase(message = "Sniff check initiated.")
        assertTrue(result.isSuccess)
        assertEquals("Sniff check initiated.", result.getOrNull()?.message)
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
}
