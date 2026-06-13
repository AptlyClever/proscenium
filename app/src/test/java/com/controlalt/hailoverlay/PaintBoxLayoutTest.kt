package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.min

class PaintBoxLayoutTest {

    private fun mediumTierExpectedBeamEnvelope(screenW: Float, screenH: Float): Pair<Float, Float> {
        val boxW = screenW * TransporterContract.GROUP_WIDTH_FRACTION
        val boxH = screenH * TransporterContract.GROUP_HEIGHT_FRACTION
        val inset = TransporterContract.SAFE_ZONE_INSET_FRACTION
        val safeW = boxW * (1f - inset * 2f)
        val safeH = boxH * (1f - inset * 2f)
        val glyphH = safeH * TransporterContract.GLYPH_FOCUS_FRACTION
        val glyphW = min(safeW, glyphH * TransporterContract.GLYPH_WIDTH_ASPECT)
        val beamH = min(safeH, glyphH * TransporterContract.TRANSPORTER_BEAM_HEIGHT_MULTIPLIER)
        val beamW = min(
            safeW * TransporterContract.BEAM_WIDTH_SAFE_ZONE_FRACTION,
            glyphW * TransporterContract.BEAM_WIDTH_GLYPH_FRACTION,
        )
        return Pair(beamW, beamH)
    }

    @Test
    fun upper_center_paint_box_is_not_full_screen_width() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val regions = PaintBoxLayout.resolve(1920f, 1080f, placement)
        assertTrue(regions.paintBoxWidth < 1920f * 0.4f)
        assertTrue(regions.paintBoxHeight < 1080f * 0.4f)
    }

    @Test
    fun upper_center_beam_envelope_matches_web_preview_medium_tier() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val regions = PaintBoxLayout.resolve(1920f, 1080f, placement)
        val (expectedBeamW, expectedBeamH) = mediumTierExpectedBeamEnvelope(1920f, 1080f)

        assertEquals(expectedBeamW, regions.beamWidth, 0.5f)
        assertEquals(expectedBeamH, regions.beamHeight, 0.5f)
        assertTrue(
            "beam height must not be collapsed (${regions.beamHeight}px)",
            regions.beamHeight > 200f,
        )
        assertTrue(
            "beam width must remain TV-legible (${regions.beamWidth}px)",
            regions.beamWidth > 80f,
        )
        assertTrue(regions.beamHeight <= regions.safeZoneHeight)
        assertTrue(regions.beamWidth <= regions.safeZoneWidth)
    }

    @Test
    fun glyph_focus_center_matches_web_preview_offset() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val regions = PaintBoxLayout.resolve(1920f, 1080f, placement)
        val glyphH = regions.safeZoneHeight * TransporterContract.GLYPH_FOCUS_FRACTION
        val expectedCenterY =
            regions.safeZoneTop +
                regions.safeZoneHeight * TransporterContract.GLYPH_FOCUS_TOP_FRACTION +
                glyphH / 2f
        assertEquals(regions.safeZoneLeft + regions.safeZoneWidth / 2f, regions.glyphCenterX, 0.5f)
        assertEquals(expectedCenterY, regions.glyphCenterY, 0.5f)
    }

    @Test
    fun top_right_paint_box_is_in_upper_right_quadrant() {
        val placement = Placement.resolve("top_right", Placement.MODE_PRESET, null, null).getOrThrow()
        val regions = PaintBoxLayout.resolve(1920f, 1080f, placement)
        assertTrue(regions.paintBoxLeft + regions.paintBoxWidth <= 1920f * 0.95f)
        assertTrue(regions.paintBoxTop < 1080f * 0.25f)
    }

    @Test
    fun custom_placement_centers_on_percents() {
        val placement = Placement.resolve("custom", Placement.MODE_CUSTOM, 72f, 18f).getOrThrow()
        val regions = PaintBoxLayout.resolve(1000f, 800f, placement)
        val centerX = regions.paintBoxLeft + regions.paintBoxWidth / 2f
        val centerY = regions.paintBoxTop + regions.paintBoxHeight / 2f
        assertTrue(kotlin.math.abs(centerX - 720f) < 2f)
        assertTrue(kotlin.math.abs(centerY - 144f) < 2f)
    }

    @Test
    fun safe_zone_is_inset_inside_paint_box() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val regions = PaintBoxLayout.resolve(1920f, 1080f, placement)
        assertTrue(regions.safeZoneLeft >= regions.paintBoxLeft)
        assertTrue(regions.safeZoneTop >= regions.paintBoxTop)
        assertTrue(regions.safeZoneLeft + regions.safeZoneWidth <= regions.paintBoxLeft + regions.paintBoxWidth)
        assertTrue(regions.safeZoneTop + regions.safeZoneHeight <= regions.paintBoxTop + regions.paintBoxHeight)
    }
}
