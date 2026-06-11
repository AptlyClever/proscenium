package com.controlalt.hailoverlay

object HailAllowlist {
    const val HTTP_PORT = 8765

    private val allowedEffectIds = setOf("transporter_beam")
    private val allowedGlyphIds = setOf("hail-sniffer")
    private val allowedMessages = setOf("What's sniffing?")

    const val MIN_DURATION_MS = 1_000L
    const val MAX_DURATION_MS = 30_000L

    data class ValidatedHail(
        val effectId: String,
        val glyphId: String,
        val message: String,
        val durationMs: Long,
    )

    fun validate(
        effectId: String?,
        glyphId: String?,
        message: String?,
        durationMs: Long?,
    ): Result<ValidatedHail> {
        if (effectId.isNullOrBlank() || effectId !in allowedEffectIds) {
            return Result.failure(IllegalArgumentException("effect_id not allowlisted"))
        }
        if (glyphId.isNullOrBlank() || glyphId !in allowedGlyphIds) {
            return Result.failure(IllegalArgumentException("glyph_id not allowlisted"))
        }
        if (message.isNullOrBlank() || message !in allowedMessages) {
            return Result.failure(IllegalArgumentException("message not allowlisted"))
        }
        if (durationMs == null || durationMs !in MIN_DURATION_MS..MAX_DURATION_MS) {
            return Result.failure(
                IllegalArgumentException("duration_ms must be between $MIN_DURATION_MS and $MAX_DURATION_MS"),
            )
        }
        return Result.success(
            ValidatedHail(
                effectId = effectId,
                glyphId = glyphId,
                message = message,
                durationMs = durationMs,
            ),
        )
    }
}
