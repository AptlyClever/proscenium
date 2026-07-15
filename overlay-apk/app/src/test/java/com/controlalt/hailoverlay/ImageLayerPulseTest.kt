package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ImageLayerPulseTest {
    private val choreography = EffectChoreography(
        glyphImpactPeak = 0.46f,
        glyphLockIn = 0.64f,
    )

    @Test
    fun accentMultiplier_peaks_near_glyphImpactPeak_during_entrance() {
        val atPeak = ImageLayerPulse.alphaMultiplier(
            pulseAnchor = "glyphImpactPeak",
            phase = TransporterPhase.ENTRANCE,
            entranceT = 0.46f,
            stablePulse = 0f,
            choreography = choreography,
        )
        val away = ImageLayerPulse.alphaMultiplier(
            pulseAnchor = "glyphImpactPeak",
            phase = TransporterPhase.ENTRANCE,
            entranceT = 0.1f,
            stablePulse = 0f,
            choreography = choreography,
        )
        assertTrue(atPeak > away)
        assertTrue(atPeak > 1f)
    }

    @Test
    fun accentMultiplier_ignores_non_pulse_layers() {
        assertEquals(
            1f,
            ImageLayerPulse.alphaMultiplier(
                pulseAnchor = null,
                phase = TransporterPhase.ENTRANCE,
                entranceT = 0.46f,
                stablePulse = 0f,
                choreography = choreography,
            ),
            0.001f,
        )
    }
}
