package com.controlalt.hailoverlay

import org.json.JSONObject

/**
 * Message Sidekick stable-phase timing from Axiom `message_entity` (pso-20260621).
 * Message fades in at stable hold start and out before hold ends — not during effect entrance.
 */
data class MessageSidekickTiming(
    val entranceMs: Long,
    val exitMs: Long,
    val targetOpacity: Float,
    val exitOffsetMs: Long,
    val stableHoldMs: Long,
    /** When true, message alpha is driven only during stable hold (entrance/exit effect phases hide copy). */
    val useStablePhase: Boolean,
) {
    companion object {
        private const val DEFAULT_ENTRANCE_MS = 480L
        private const val DEFAULT_EXIT_MS = 360L
        private const val DEFAULT_OPACITY = 0.92f

        fun fromJson(messageEntity: JSONObject?, stableHoldMs: Long): MessageSidekickTiming {
            val hold = messageEntity?.optLong("stable_hold_ms")?.takeIf { it > 0L } ?: stableHoldMs.coerceAtLeast(0L)
            if (messageEntity == null) {
                return legacyDefaults(hold, useStablePhase = false)
            }

            val hasSidekickPayload = messageEntity.has("sidekick_id") ||
                messageEntity.has("entrance_ms") ||
                messageEntity.has("exit_offset_ms")

            if (!hasSidekickPayload) {
                return legacyDefaults(hold, useStablePhase = false)
            }

            val entranceMs = messageEntity.optLong("entrance_ms", DEFAULT_ENTRANCE_MS).coerceAtLeast(80L)
            val exitMs = messageEntity.optLong("exit_ms", DEFAULT_EXIT_MS).coerceAtLeast(80L)
            val opacity = messageEntity.optDouble("opacity", DEFAULT_OPACITY.toDouble())
                .toFloat()
                .coerceIn(0.2f, 1f)
            val exitOffset = messageEntity.optLong(
                "exit_offset_ms",
                (hold - exitMs).coerceAtLeast(0L),
            ).coerceIn(0L, hold.coerceAtLeast(0L))

            return MessageSidekickTiming(
                entranceMs = entranceMs,
                exitMs = exitMs,
                targetOpacity = opacity,
                exitOffsetMs = exitOffset,
                stableHoldMs = hold,
                useStablePhase = true,
            )
        }

        private fun legacyDefaults(stableHoldMs: Long, useStablePhase: Boolean): MessageSidekickTiming {
            return MessageSidekickTiming(
                entranceMs = DEFAULT_ENTRANCE_MS,
                exitMs = DEFAULT_EXIT_MS,
                targetOpacity = DEFAULT_OPACITY,
                exitOffsetMs = (stableHoldMs - DEFAULT_EXIT_MS).coerceAtLeast(0L),
                stableHoldMs = stableHoldMs,
                useStablePhase = useStablePhase,
            )
        }
    }
}
