package com.controlalt.hailoverlay

import androidx.compose.ui.unit.Density
import org.junit.Assert.assertTrue
import org.junit.Test

class MessageTypographyTest {

    @Test
    fun large_tier_1080p_uses_contract_fraction_not_band_cap() {
        val density = Density(1f)
        val sp = MessageTypography.fontSizeSp(1080f, PaintBoxTier.LARGE, density).value
        // 1080 * 0.021 * 1.08 ≈ 24.5sp — legible on TV; old band cap was 9–14sp
        assertTrue(sp >= 22f)
        assertTrue(sp <= MessageTypography.MAX_SP)
    }

    @Test
    fun medium_tier_1080p_above_legacy_band_cap() {
        val density = Density(1f)
        val sp = MessageTypography.fontSizeSp(1080f, PaintBoxTier.MEDIUM, density).value
        assertTrue(sp >= 20f)
    }
}
