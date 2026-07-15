package com.controlalt.hailoverlay

/**
 * Paint Box size tiers — mirrors Axiom hail-render-contract.v001.json paintBox.tiers.
 */
data class PaintBoxTier(
    val tierId: String,
    val widthFraction: Float,
    val heightFraction: Float,
    val safeZoneInsetFraction: Float,
    val glyphFocusFraction: Float,
    val glyphVisualFraction: Float,
    val glyphVisualSizeFloorPx: Float,
    val transporterBeamHeightMultiplier: Float,
) {
    companion object {
        val SMALL = PaintBoxTier(
            tierId = "small",
            widthFraction = 0.24f,
            heightFraction = 0.26f,
            safeZoneInsetFraction = 0.12f,
            glyphFocusFraction = 0.62f,
            glyphVisualFraction = 0.46f,
            glyphVisualSizeFloorPx = 108f,
            transporterBeamHeightMultiplier = 1.35f,
        )

        val MEDIUM = PaintBoxTier(
            tierId = "medium",
            widthFraction = 0.32f,
            heightFraction = 0.34f,
            safeZoneInsetFraction = 0.11f,
            glyphFocusFraction = 0.64f,
            glyphVisualFraction = 0.5f,
            glyphVisualSizeFloorPx = 152f,
            transporterBeamHeightMultiplier = 1.5f,
        )

        val LARGE = PaintBoxTier(
            tierId = "large",
            widthFraction = 0.42f,
            heightFraction = 0.44f,
            safeZoneInsetFraction = 0.10f,
            glyphFocusFraction = 0.66f,
            glyphVisualFraction = 0.54f,
            glyphVisualSizeFloorPx = 208f,
            transporterBeamHeightMultiplier = 1.65f,
        )

        fun resolve(raw: String?): PaintBoxTier {
            return when (raw?.trim()?.lowercase()) {
                "small", "s" -> SMALL
                "large", "l" -> LARGE
                "medium", "m", null, "" -> MEDIUM
                else -> MEDIUM
            }
        }
    }
}
