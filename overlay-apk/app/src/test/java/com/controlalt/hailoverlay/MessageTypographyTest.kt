package com.controlalt.hailoverlay

import androidx.compose.ui.unit.Density
import org.junit.Assert.assertTrue
import org.junit.Test

class MessageTypographyTest {

    @Test
    fun large_tier_1080p_uses_contract_fraction_without_band() {
        val density = Density(1f)
        val sp = MessageTypography.fontSizeSp(1080f, PaintBoxTier.LARGE, density).value
        assertTrue(sp >= 22f)
        assertTrue(sp <= MessageTypography.MAX_SP)
    }

    @Test
    fun medium_tier_1080p_above_legacy_band_cap() {
        val density = Density(1f)
        val sp = MessageTypography.fontSizeSp(1080f, PaintBoxTier.MEDIUM, density).value
        assertTrue(sp >= 20f)
    }

    @Test
    fun narrow_short_band_caps_font_below_screen_fraction() {
        val density = Density(1f)
        val sp = MessageTypography.fontSizeSp(
            screenHeightPx = 1080f,
            bandHeightPx = 46f,
            bandWidthPx = 280f,
            textLength = 24,
            tier = PaintBoxTier.LARGE,
            density = density,
            horizontalPaddingPx = 24f,
            verticalPaddingPx = 8f,
        ).value
        assertTrue("band fit should be below uncapped screen size", sp < 22f)
        assertTrue(sp >= MessageTypography.MIN_SP)
    }

    @Test
    fun tall_band_allows_larger_type_than_short_band() {
        val density = Density(1f)
        val shortBand = MessageTypography.fontSizeSp(
            screenHeightPx = 1080f,
            bandHeightPx = 40f,
            bandWidthPx = 400f,
            textLength = 12,
            tier = PaintBoxTier.MEDIUM,
            density = density,
            horizontalPaddingPx = 24f,
            verticalPaddingPx = 8f,
        ).value
        val tallBand = MessageTypography.fontSizeSp(
            screenHeightPx = 1080f,
            bandHeightPx = 72f,
            bandWidthPx = 400f,
            textLength = 12,
            tier = PaintBoxTier.MEDIUM,
            density = density,
            horizontalPaddingPx = 24f,
            verticalPaddingPx = 8f,
        ).value
        assertTrue(tallBand > shortBand)
    }
}
