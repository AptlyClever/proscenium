package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.min

class PaintBoxLayoutTest {

    private fun expectedBeamEnvelope(
        screenW: Float,
        screenH: Float,
        tier: PaintBoxTier,
    ): Pair<Float, Float> {
        val boxW = screenW * tier.widthFraction
        val boxH = screenH * tier.heightFraction
        val inset = tier.safeZoneInsetFraction
        val safeW = boxW * (1f - inset * 2f)
        val safeH = boxH * (1f - inset * 2f)
        val glyphH = safeH * tier.glyphFocusFraction
        val glyphW = min(safeW, glyphH * TransporterContract.GLYPH_WIDTH_ASPECT)
        val beamH = min(safeH, glyphH * tier.transporterBeamHeightMultiplier)
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
        val tier = PaintBoxTier.MEDIUM
        val regions = PaintBoxLayout.resolve(1920f, 1080f, placement, tier)
        val (expectedBeamW, expectedBeamH) = expectedBeamEnvelope(1920f, 1080f, tier)

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
        assertEquals(tier, regions.tier)
    }

    @Test
    fun large_tier_paint_box_is_larger_than_medium() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val medium = PaintBoxLayout.resolve(1920f, 1080f, placement, PaintBoxTier.MEDIUM)
        val large = PaintBoxLayout.resolve(1920f, 1080f, placement, PaintBoxTier.LARGE)

        assertTrue(large.paintBoxWidth > medium.paintBoxWidth)
        assertTrue(large.paintBoxHeight > medium.paintBoxHeight)
        assertTrue(large.beamHeight > medium.beamHeight)
        assertTrue(large.glyphVisualSizePx > medium.glyphVisualSizePx)
    }

    @Test
    fun small_tier_paint_box_is_smaller_than_medium() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val small = PaintBoxLayout.resolve(1920f, 1080f, placement, PaintBoxTier.SMALL)
        val medium = PaintBoxLayout.resolve(1920f, 1080f, placement, PaintBoxTier.MEDIUM)

        assertTrue(small.paintBoxWidth < medium.paintBoxWidth)
        assertTrue(small.paintBoxHeight < medium.paintBoxHeight)
        assertTrue(small.beamHeight < medium.beamHeight)
    }

    @Test
    fun unknown_tier_falls_back_to_medium() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val fallback = PaintBoxLayout.resolve(
            1920f,
            1080f,
            placement,
            PaintBoxTier.resolve("not-a-tier"),
        )
        val medium = PaintBoxLayout.resolve(1920f, 1080f, placement, PaintBoxTier.MEDIUM)
        assertEquals(medium.paintBoxWidth, fallback.paintBoxWidth, 0.01f)
        assertEquals(medium.beamHeight, fallback.beamHeight, 0.01f)
    }

    @Test
    fun glyph_focus_center_matches_web_preview_offset() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val tier = PaintBoxTier.MEDIUM
        val regions = PaintBoxLayout.resolve(1920f, 1080f, placement, tier)
        val glyphH = regions.safeZoneHeight * tier.glyphFocusFraction
        val expectedCenterY =
            regions.safeZoneTop +
                regions.safeZoneHeight * TransporterContract.GLYPH_FOCUS_TOP_FRACTION +
                glyphH / 2f
        assertEquals(regions.safeZoneLeft + regions.safeZoneWidth / 2f, regions.glyphCenterX, 0.5f)
        assertEquals(expectedCenterY, regions.glyphCenterY, 0.5f)
    }

    @Test
    fun medium_glyph_visual_size_matches_axiom_contract() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val tier = PaintBoxTier.MEDIUM
        val screenH = 1080f
        val boxH = screenH * tier.heightFraction
        val expectedGlyphVisual = maxOf(tier.glyphVisualSizeFloorPx, boxH * tier.glyphVisualFraction)

        val regions = PaintBoxLayout.resolve(1920f, screenH, placement, tier)
        assertEquals(expectedGlyphVisual, regions.glyphVisualSizePx, 0.01f)
        assertEquals(183.6f, regions.glyphVisualSizePx, 0.01f)
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
