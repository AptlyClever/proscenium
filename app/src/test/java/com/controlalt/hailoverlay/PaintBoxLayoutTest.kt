package com.controlalt.hailoverlay

import org.junit.Assert.assertTrue
import org.junit.Test

class PaintBoxLayoutTest {

    @Test
    fun upper_center_paint_box_is_not_full_screen_width() {
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrThrow()
        val regions = PaintBoxLayout.resolve(1920f, 1080f, placement)
        assertTrue(regions.paintBoxWidth < 1920f * 0.4f)
        assertTrue(regions.paintBoxHeight < 1080f * 0.4f)
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
