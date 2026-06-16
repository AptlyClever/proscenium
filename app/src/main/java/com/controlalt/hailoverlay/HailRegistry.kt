package com.controlalt.hailoverlay

object HailRegistry {
    const val HTTP_PORT = 8765
    const val MIN_DURATION_MS = 1_000L
    const val MAX_DURATION_MS = 30_000L

    private val allowedEffectIds = setOf("transporter_beam")
    private val allowedGlyphIds = setOf(
        "hail-sniffer",
        "hail-eye-check",
        "hail-summons",
        "hail-alert",
        "hail-route",
        "hail-beacon",
        "default",
    )
    private val allowedPaletteIds = setOf(
        "axiom_dark_cyan",
        "transporter_white",
        "cute_purple",
        "transporter_generation_next",
        "transporter_spoon",
    )

    data class ValidatedHail(
        val hailId: String,
        val effectId: String,
        val glyphId: String,
        val paletteId: String,
        val message: String,
        val durationMs: Long,
        val placement: Placement.Resolved,
        val sizeTier: PaintBoxTier,
        val effectVariationId: String?,
        val transporterVariation: ResolvedTransporterVariation,
        val choreography: EffectChoreography,
        val proceduralGraph: ProceduralGraphSpec? = null,
    )

    private fun resolveDeliveryPalette(palette: String, effectVariationId: String?): String {
        val canonical = TransporterVariationProfile.canonicalPaletteId(effectVariationId)
        if (canonical != null && palette == "axiom_dark_cyan") {
            return canonical
        }
        return palette
    }

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
        sizeTier: String? = null,
        brokerProof: String? = null,
        effectVariationId: String? = null,
        beamIntensity: Float? = null,
        beamScale: Float? = null,
        particleStyleHint: String? = null,
        choreography: EffectChoreography = EffectChoreography(),
        proceduralGraph: ProceduralGraphSpec? = null,
    ): Result<ValidatedHail> {
        if (effectId.isNullOrBlank() || effectId !in allowedEffectIds) {
            return Result.failure(IllegalArgumentException("effect_id not allowlisted"))
        }
        val normalizedGlyphId = glyphId?.trim().orEmpty()
        val isCustomGlyph = normalizedGlyphId.startsWith("custom-")
        if (normalizedGlyphId.isBlank()) {
            return Result.failure(IllegalArgumentException("glyph_id not allowlisted"))
        }
        if (isCustomGlyph) {
            if (proceduralGraph == null) {
                return Result.failure(IllegalArgumentException("glyph_id not allowlisted"))
            }
        } else if (normalizedGlyphId !in allowedGlyphIds) {
            return Result.failure(IllegalArgumentException("glyph_id not allowlisted"))
        }
        val requestedPalette = paletteId?.trim().orEmpty().ifBlank { "axiom_dark_cyan" }
        val palette = resolveDeliveryPalette(requestedPalette, effectVariationId)
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

        val resolvedSizeTier = PaintBoxTier.resolve(sizeTier)

        val proofPayload = OverlayBrokerGate.brokerProofPayloadFromValidated(
            hailId = normalizedHailId,
            effectId = effectId,
            glyphId = normalizedGlyphId,
            paletteId = palette,
            message = validatedMessage,
            durationMs = durationMs,
            placement = placement,
            sizeTier = resolvedSizeTier.tierId,
        )

        OverlayBrokerGate.validateBrokerProof(
            brokerProof = brokerProof,
            payload = proofPayload,
        ).getOrElse { return Result.failure(it) }

        return Result.success(
            ValidatedHail(
                hailId = normalizedHailId,
                effectId = effectId,
                glyphId = normalizedGlyphId,
                paletteId = palette,
                message = validatedMessage,
                durationMs = durationMs,
                placement = placement,
                sizeTier = resolvedSizeTier,
                effectVariationId = effectVariationId?.trim()?.ifBlank { null },
                transporterVariation = TransporterVariationProfile.resolve(
                    variationId = effectVariationId,
                    beamIntensity = beamIntensity,
                    beamScale = beamScale,
                    particleStyleHint = particleStyleHint,
                ),
                choreography = choreography,
                proceduralGraph = proceduralGraph,
            ),
        )
    }
}
