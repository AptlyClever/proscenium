package com.controlalt.hailoverlay

import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp

/**
 * Message band typography — mirrors LCARD web-preview `messageFontSizeFractionOfHeight`
 * (hail-render-contract `typography.messageFontSizeFractionOfHeight` = 0.021).
 */
object MessageTypography {
    const val FONT_SIZE_FRACTION_OF_HEIGHT = 0.021f
    const val MIN_SP = 14f
    const val MAX_SP = 28f

    fun messageScaleForTier(tier: PaintBoxTier): Float {
        return when (tier.tierId) {
            "small" -> 0.92f
            "large" -> 1.08f
            else -> 1f
        }
    }

    fun fontSizeSp(screenHeightPx: Float, tier: PaintBoxTier, density: Density): TextUnit {
        val px = screenHeightPx * FONT_SIZE_FRACTION_OF_HEIGHT * messageScaleForTier(tier)
        val sp = with(density) { px.toSp().value }
        return sp.coerceIn(MIN_SP, MAX_SP).sp
    }
}
