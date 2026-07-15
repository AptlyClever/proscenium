package com.controlalt.hailoverlay

import org.json.JSONObject

/**
 * Phase III stable-phase interest — hero-led glyph breathe + optional rim pulse.
 */
data class StableInterest(
    val stableResidual: String = "none",
    val glyphBreatheAmplitude: Float = 0.06f,
    val glyphShimmerIntensity: Float = 0.32f,
    val stableRimPulseMs: Long = 420L,
    val rimPulseEnabled: Boolean = false,
) {
    val glyphLocalResidual: Boolean
        get() = stableResidual == "optional_glyph_local"

    companion object {
        fun fromJson(json: JSONObject?): StableInterest? {
            if (json == null) {
                return null
            }
            return StableInterest(
                stableResidual = json.optString("stable_residual", "none"),
                glyphBreatheAmplitude = json.optDouble("glyph_breathe_amplitude", 0.06).toFloat()
                    .coerceIn(0.02f, 0.12f),
                glyphShimmerIntensity = json.optDouble("glyph_shimmer_intensity", 0.32).toFloat()
                    .coerceIn(0.18f, 0.55f),
                stableRimPulseMs = json.optLong("stable_rim_pulse_ms", 420L).coerceAtLeast(120L),
                rimPulseEnabled = json.optBoolean("rim_pulse_enabled", false),
            )
        }

        fun rimPulseAlpha(
            stableElapsedMs: Long,
            baseRimAlpha: Float,
            interest: StableInterest?,
        ): Float {
            if (interest == null || !interest.rimPulseEnabled) {
                return 0f
            }
            if (stableElapsedMs >= interest.stableRimPulseMs) {
                return 0f
            }
            val t = stableElapsedMs.toFloat() / interest.stableRimPulseMs.toFloat()
            val fade = 1f - TransporterLifecycle.easeOutCubic(t)
            return (baseRimAlpha * fade * 0.55f).coerceIn(0f, 0.22f)
        }
    }
}
