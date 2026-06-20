package com.controlalt.hailoverlay

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin

data class ImageLayerSpec(
    val role: String,
    val bitmapBase64: String,
    val mediaType: String,
    val zIndex: Int = 0,
    val pulseAnchor: String? = null,
)

data class ImageLayersGlyphSpec(
    val layers: List<ImageLayerSpec>,
)

/** Accent-layer pulse tied to choreography anchors (mirrors Paintbox `glyphImpactPeak` pulse). */
object ImageLayerPulse {
    private const val IMPACT_WINDOW = 0.14f
    private const val IMPACT_BOOST = 0.28f
    private const val STABLE_BREATHE = 0.08f

    fun alphaMultiplier(
        pulseAnchor: String?,
        phase: TransporterPhase,
        entranceT: Float,
        stablePulse: Float,
        choreography: EffectChoreography,
    ): Float {
        if (pulseAnchor != "glyphImpactPeak") {
            return 1f
        }
        return when (phase) {
            TransporterPhase.ENTRANCE -> {
                val peak = choreography.glyphImpactPeak.coerceIn(0.1f, 0.95f)
                val dist = abs(entranceT - peak)
                if (dist >= IMPACT_WINDOW) {
                    1f
                } else {
                    val pulse = 1f - (dist / IMPACT_WINDOW)
                    1f + pulse * IMPACT_BOOST
                }
            }
            TransporterPhase.STABLE -> {
                1f - STABLE_BREATHE + sin(stablePulse * PI.toFloat() * 2f) * STABLE_BREATHE
            }
            TransporterPhase.EXIT -> 1f
            TransporterPhase.CLEARED -> 0f
        }
    }
}
