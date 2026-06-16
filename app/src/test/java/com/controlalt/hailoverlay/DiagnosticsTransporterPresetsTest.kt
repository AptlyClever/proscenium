package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Test

class DiagnosticsTransporterPresetsTest {

    @Test
    fun parity_presets_cover_three_variations_with_locked_choreography() {
        val presets = DiagnosticsTransporterPresets.parityPresets
        assertEquals(listOf("voyaging", "generation-next", "spoon"), presets.map { it.variationId })

        val voyager = presets.first { it.variationId == "voyaging" }
        assertEquals(0.42f, voyager.choreography.glyphResolveStart, 0.001f)
        assertEquals("scanfall", voyager.particleStyleHint)

        val tng = presets.first { it.variationId == "generation-next" }
        assertEquals(0.38f, tng.choreography.glyphResolveStart, 0.001f)
        assertEquals("sparkle_rise", tng.particleStyleHint)

        val cardassian = presets.first { it.variationId == "spoon" }
        assertEquals(0.40f, cardassian.choreography.glyphResolveStart, 0.001f)
        assertEquals("scanfall_dense", cardassian.particleStyleHint)
    }
}
