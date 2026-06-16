package com.controlalt.hailoverlay

/**
 * Operator-facing transporter presets for on-device diagnostics.
 * Fires only when the operator presses a button — full entrance + stable + exit.
 */
object DiagnosticsTransporterPresets {
    private const val HAIL_ID_PREFIX = "hail.diagnostics."
    private const val EFFECT_ID = "transporter_beam"
    private const val GLYPH_ID = "hail-sniffer"
    private const val PALETTE_ID = "axiom_dark_cyan"
    private const val DURATION_MS = 5_500L
    private const val PLACEMENT_ID = "upper_center"

    data class Preset(
        val variationId: String,
        val buttonLabel: String,
        val message: String,
        val particleStyleHint: String,
        val choreography: EffectChoreography,
    )

    val parityPresets: List<Preset> = listOf(
        Preset(
            variationId = "voyaging",
            buttonLabel = "Voyager (voyaging)",
            message = "Voyager transporter",
            particleStyleHint = "scanfall",
            choreography = EffectChoreography(
                glyphResolveStart = 0.42f,
                glyphImpactPeak = 0.74f,
                glyphLockIn = 0.90f,
                messageRevealStart = 0.82f,
                stableReady = 0.95f,
            ),
        ),
        Preset(
            variationId = "generation-next",
            buttonLabel = "TNG (generation-next)",
            message = "TNG transporter",
            particleStyleHint = "sparkle_rise",
            choreography = EffectChoreography(
                glyphResolveStart = 0.38f,
                glyphImpactPeak = 0.70f,
                glyphLockIn = 0.88f,
                messageRevealStart = 0.80f,
                stableReady = 0.94f,
            ),
        ),
        Preset(
            variationId = "spoon",
            buttonLabel = "Cardassian (spoon)",
            message = "Cardassian transporter",
            particleStyleHint = "scanfall_dense",
            choreography = EffectChoreography(
                glyphResolveStart = 0.40f,
                glyphImpactPeak = 0.68f,
                glyphLockIn = 0.86f,
                messageRevealStart = 0.78f,
                stableReady = 0.92f,
            ),
        ),
    )

    fun buildValidatedHail(preset: Preset): HailRegistry.ValidatedHail? {
        val hailId = HAIL_ID_PREFIX + preset.variationId
        val placement = Placement.resolve(PLACEMENT_ID, Placement.MODE_PRESET, null, null).getOrNull()
            ?: return null
        val proofPayload = OverlayBrokerGate.brokerProofPayloadFromValidated(
            hailId = hailId,
            effectId = EFFECT_ID,
            glyphId = GLYPH_ID,
            paletteId = PALETTE_ID,
            message = preset.message,
            durationMs = DURATION_MS,
            placement = placement,
        )
        val brokerProof = OverlayBrokerGate.computeProof(
            OverlayBrokerGate.resolveConfiguredSecret(),
            proofPayload,
        )
        return HailRegistry.validate(
            hailId = hailId,
            effectId = EFFECT_ID,
            glyphId = GLYPH_ID,
            paletteId = PALETTE_ID,
            message = preset.message,
            durationMs = DURATION_MS,
            placementId = PLACEMENT_ID,
            placementMode = Placement.MODE_PRESET,
            xPercent = null,
            yPercent = null,
            sizeTier = "large",
            brokerProof = brokerProof,
            effectVariationId = preset.variationId,
            beamIntensity = 0.78f,
            beamScale = 1f,
            particleStyleHint = preset.particleStyleHint,
            choreography = preset.choreography,
        ).getOrNull()
    }
}
