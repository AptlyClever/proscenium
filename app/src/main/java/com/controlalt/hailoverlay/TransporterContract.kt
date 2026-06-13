package com.controlalt.hailoverlay

/**
 * Axiom v001 transporter lifecycle timing + screen placement insets.
 * Paint Box fractions live in [PaintBoxTier].
 */
object TransporterContract {
    const val ENTRANCE_MS = 1900L
    const val EXIT_MS = 1400L

    const val GLYPH_FOCUS_TOP_FRACTION = 0.06f
    const val GLYPH_WIDTH_ASPECT = 1.05f
    const val BEAM_WIDTH_SAFE_ZONE_FRACTION = 0.72f
    const val BEAM_WIDTH_GLYPH_FRACTION = 0.62f

    const val HORIZONTAL_INSET_FRACTION = 0.065f
    const val TOP_INSET_FRACTION = 0.085f
    const val BOTTOM_INSET_FRACTION = 0.105f
    const val UPPER_CENTER_EXTRA_TOP_FRACTION = 0.035f
    const val CENTER_SOFT_VERTICAL_FRACTION = 0.07f

    fun totalLifecycleMs(stableHoldMs: Long): Long {
        return ENTRANCE_MS + stableHoldMs + EXIT_MS
    }
}
