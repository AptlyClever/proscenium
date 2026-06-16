package com.controlalt.hailoverlay

import org.json.JSONObject

/**
 * Axiom effect_identity choreography consumed on device for glyph/message timing.
 */
data class EffectChoreography(
    val glyphResolveStyle: String = "scan_resolve",
    val messageRevealStyle: String = "secondary_scan_fade",
    val glyphResolveStart: Float = 0.42f,
    val glyphImpactPeak: Float = 0.74f,
    val glyphLockIn: Float = 0.9f,
    val messageRevealStart: Float = 0.82f,
    val stableReady: Float = 0.95f,
) {
    companion object {
        fun fromJson(json: JSONObject?): EffectChoreography {
            if (json == null) {
                return EffectChoreography()
            }
            val anchors = json.optJSONObject("choreography_anchors")
            return EffectChoreography(
                glyphResolveStyle = json.optString("glyph_resolve_style").ifBlank { "scan_resolve" },
                messageRevealStyle = json.optString("message_reveal_style").ifBlank { "secondary_scan_fade" },
                glyphResolveStart = anchors?.optDouble("glyphResolveStart")?.toFloat() ?: 0.42f,
                glyphImpactPeak = anchors?.optDouble("glyphImpactPeak")?.toFloat() ?: 0.74f,
                glyphLockIn = anchors?.optDouble("glyphLockIn")?.toFloat() ?: 0.9f,
                messageRevealStart = anchors?.optDouble("messageRevealStart")?.toFloat() ?: 0.82f,
                stableReady = anchors?.optDouble("stableReady")?.toFloat() ?: 0.95f,
            )
        }

        fun resolveAlphas(
            phase: TransporterPhase,
            entranceProgress: Float,
            exitProgress: Float,
            stablePulse: Float,
            choreography: EffectChoreography,
        ): Pair<Float, Float> {
            return when (phase) {
                TransporterPhase.ENTRANCE -> {
                    val glyph = glyphAlphaEntrance(entranceProgress, choreography)
                    val message = messageAlphaEntrance(entranceProgress, choreography)
                    Pair(glyph, message)
                }
                TransporterPhase.STABLE -> {
                    val pulse = 0.92f + kotlin.math.sin(stablePulse * Math.PI.toFloat() * 2f) * 0.08f
                    Pair(pulse, 1f)
                }
                TransporterPhase.EXIT -> {
                    val exit = exitProgress.coerceIn(0f, 1f)
                    Pair(exit, exit)
                }
                TransporterPhase.CLEARED -> Pair(0f, 0f)
            }
        }

        private fun glyphAlphaEntrance(t: Float, choreography: EffectChoreography): Float {
            val start = choreography.glyphResolveStart.coerceIn(0f, 0.95f)
            if (t < start) {
                return 0.12f
            }
            val span = (1f - start).coerceAtLeast(0.05f)
            return (0.12f + ((t - start) / span).coerceIn(0f, 1f) * 0.88f).coerceIn(0f, 1f)
        }

        private fun messageAlphaEntrance(t: Float, choreography: EffectChoreography): Float {
            val start = choreography.messageRevealStart.coerceIn(0f, 0.98f)
            if (t < start) {
                return 0f
            }
            val span = (1f - start).coerceAtLeast(0.05f)
            return ((t - start) / span).coerceIn(0f, 1f)
        }
    }
}
