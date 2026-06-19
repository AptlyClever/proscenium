package com.controlalt.hailoverlay

import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import kotlin.math.ceil

/**
 * Message band typography — contract fraction (`messageFontSizeFractionOfHeight` = 0.021)
 * capped by [layout_regions.message_band] so copy fits inside the package on TV.
 */
object MessageTypography {
    const val FONT_SIZE_FRACTION_OF_HEIGHT = 0.021f
    const val MIN_SP = 12f
    const val MAX_SP = 28f
    const val LINE_HEIGHT_MULTIPLIER = 1.25f
    const val CHAR_WIDTH_EM_RATIO = 0.52f
    const val MAX_LINES = 3

    fun messageScaleForTier(tier: PaintBoxTier): Float {
        return when (tier.tierId) {
            "small" -> 0.92f
            "large" -> 1.08f
            else -> 1f
        }
    }

    fun screenFontSizePx(screenHeightPx: Float, tier: PaintBoxTier): Float {
        return screenHeightPx * FONT_SIZE_FRACTION_OF_HEIGHT * messageScaleForTier(tier)
    }

    fun bandHeightFontSizePx(
        bandHeightPx: Float,
        verticalPaddingPx: Float,
        maxLines: Int = MAX_LINES,
    ): Float {
        val usable = (bandHeightPx - verticalPaddingPx).coerceAtLeast(1f)
        return usable / (maxLines.coerceAtLeast(1) * LINE_HEIGHT_MULTIPLIER)
    }

    fun bandWidthFontSizePx(
        bandWidthPx: Float,
        horizontalPaddingPx: Float,
        textLength: Int,
        maxLines: Int = MAX_LINES,
    ): Float {
        val usable = (bandWidthPx - horizontalPaddingPx).coerceAtLeast(1f)
        val chars = textLength.coerceAtLeast(1)
        val charsPerLine = ceil(chars.toFloat() / maxLines.coerceAtLeast(1).toFloat()).coerceAtLeast(1f)
        return usable / (charsPerLine * CHAR_WIDTH_EM_RATIO)
    }

    fun fontSizeSp(
        screenHeightPx: Float,
        tier: PaintBoxTier,
        density: Density,
    ): TextUnit {
        return fontSizeSp(
            screenHeightPx = screenHeightPx,
            bandHeightPx = null,
            bandWidthPx = null,
            textLength = 0,
            tier = tier,
            density = density,
        )
    }

    fun fontSizeSp(
        screenHeightPx: Float,
        bandHeightPx: Float?,
        bandWidthPx: Float?,
        textLength: Int,
        tier: PaintBoxTier,
        density: Density,
        horizontalPaddingPx: Float = 0f,
        verticalPaddingPx: Float = 0f,
        maxLines: Int = MAX_LINES,
    ): TextUnit {
        val screenPx = screenFontSizePx(screenHeightPx, tier)
        val heightPx = bandHeightPx?.takeIf { it > 0f }?.let {
            bandHeightFontSizePx(it, verticalPaddingPx, maxLines)
        } ?: screenPx
        val widthPx = if (bandWidthPx != null && bandWidthPx > 0f && textLength > 0) {
            bandWidthFontSizePx(bandWidthPx, horizontalPaddingPx, textLength, maxLines)
        } else {
            screenPx
        }
        val px = minOf(screenPx, heightPx, widthPx)
        val sp = with(density) { px.toSp().value }
        return sp.coerceIn(MIN_SP, MAX_SP).sp
    }
}
