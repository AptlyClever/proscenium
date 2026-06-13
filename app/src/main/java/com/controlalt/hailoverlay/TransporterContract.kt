package com.controlalt.hailoverlay

/**
 * Axiom v001 transporter timing + medium-tier Paint Box fractions (canonical contract mirror).
 * Source: ctrl-alt-axiom config/hails/hail-render-contract.v001.json
 */
object TransporterContract {
    const val ENTRANCE_MS = 1900L
    const val EXIT_MS = 1400L

    const val GROUP_WIDTH_FRACTION = 0.32f
    const val GROUP_HEIGHT_FRACTION = 0.34f
    const val SAFE_ZONE_INSET_FRACTION = 0.11f
    const val GLYPH_FOCUS_FRACTION = 0.62f
    const val GLYPH_VISUAL_FRACTION = 0.46f
    const val TRANSPORTER_BEAM_HEIGHT_MULTIPLIER = 1.55f

    const val HORIZONTAL_INSET_FRACTION = 0.065f
    const val TOP_INSET_FRACTION = 0.085f
    const val BOTTOM_INSET_FRACTION = 0.105f
    const val UPPER_CENTER_EXTRA_TOP_FRACTION = 0.035f
    const val CENTER_SOFT_VERTICAL_FRACTION = 0.07f

    fun totalLifecycleMs(stableHoldMs: Long): Long {
        return ENTRANCE_MS + stableHoldMs + EXIT_MS
    }
}
