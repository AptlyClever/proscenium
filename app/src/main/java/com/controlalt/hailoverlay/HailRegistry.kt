package com.controlalt.hailoverlay

object HailRegistry {
    const val HTTP_PORT = 8765
    const val MIN_DURATION_MS = 1_000L
    const val MAX_DURATION_MS = 30_000L

    private val allowedEffectIds = setOf("transporter_beam")
    private val allowedGlyphIds = setOf("hail-sniffer", "default")
    private val allowedPaletteIds = setOf("axiom_dark_cyan", "transporter_white", "cute_purple")

    data class ValidatedHail(
        val hailId: String,
        val effectId: String,
        val glyphId: String,
        val paletteId: String,
        val message: String,
        val durationMs: Long,
        val placement: Placement.Resolved,
    )

    fun validate(
        hailId: String?,
        effectId: String?,
        glyphId: String?,
        paletteId: String?,
        message: String?,
        durationMs: Long?,
        placementId: String?,
        placementMode: String?,
        xPercent: Float?,
        yPercent: Float?,
        brokerProof: String? = null,
    ): Result<ValidatedHail> {
        if (effectId.isNullOrBlank() || effectId !in allowedEffectIds) {
            return Result.failure(IllegalArgumentException("effect_id not allowlisted"))
        }
        if (glyphId.isNullOrBlank() || glyphId !in allowedGlyphIds) {
            return Result.failure(IllegalArgumentException("glyph_id not allowlisted"))
        }
        val palette = paletteId?.trim().orEmpty().ifBlank { "axiom_dark_cyan" }
        if (palette !in allowedPaletteIds) {
            return Result.failure(IllegalArgumentException("palette_id not allowlisted"))
        }
        val validatedMessage = MessageTextValidator.validate(message)
            .getOrElse { return Result.failure(it) }
        if (durationMs == null || durationMs !in MIN_DURATION_MS..MAX_DURATION_MS) {
            return Result.failure(
                IllegalArgumentException("duration_ms must be between $MIN_DURATION_MS and $MAX_DURATION_MS"),
            )
        }

        val normalizedHailId = OverlayBrokerGate.validateHailId(hailId.orEmpty())
            .getOrElse { return Result.failure(it) }

        val placement = Placement.resolve(placementId, placementMode, xPercent, yPercent)
            .getOrElse { return Result.failure(it) }

        val proofPayload = OverlayBrokerGate.brokerProofPayloadFromValidated(
            hailId = normalizedHailId,
            effectId = effectId,
            glyphId = glyphId,
            paletteId = palette,
            message = validatedMessage,
            durationMs = durationMs,
            placement = placement,
        )

        OverlayBrokerGate.validateBrokerProof(
            brokerProof = brokerProof,
            payload = proofPayload,
        ).getOrElse { return Result.failure(it) }

        return Result.success(
            ValidatedHail(
                hailId = normalizedHailId,
                effectId = effectId,
                glyphId = glyphId,
                paletteId = palette,
                message = validatedMessage,
                durationMs = durationMs,
                placement = placement,
            ),
        )
    }
}
