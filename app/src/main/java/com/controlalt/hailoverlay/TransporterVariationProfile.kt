package com.controlalt.hailoverlay

/**
 * Axiom-owned transporter variation geometry — mirrors LCARD `TRANSPORTER_VARIATION_PROFILES`.
 * Variation ids and tuning come from consumer render-payload; APK does not define identity.
 */
enum class TransporterParticleStyle {
    SCANFALL,
    SCANFALL_DENSE,
    SPARKLE_RISE,
}

/** Per-variation VFX layers — Slice 4 (VFX definitions v001). */
data class TransporterVfxLayers(
    val showerCurtain: Boolean = false,
    val scanPulseCount: Int = 0,
    val powerPellet: Boolean = false,
    val swirlField: Boolean = false,
) {
    companion object {
        val DEFAULT = TransporterVfxLayers()

        fun forVariation(variationId: String?): TransporterVfxLayers {
            return when (variationId?.trim().orEmpty()) {
                "voyaging" -> TransporterVfxLayers(scanPulseCount = 3, powerPellet = true)
                "generation-next" -> TransporterVfxLayers(showerCurtain = true, powerPellet = true)
                "spoon" -> TransporterVfxLayers(showerCurtain = true, powerPellet = true, swirlField = true)
                else -> DEFAULT
            }
        }
    }
}

data class TransporterVariationProfile(
    val variationId: String,
    val beamWidthMultiplier: Float,
    val beamHeightMultiplier: Float,
    val particleStyle: TransporterParticleStyle,
    val shimmerBeam: Boolean,
    val beamOpacityBias: Float,
    val particleDensityMultiplier: Float,
    val vfxLayers: TransporterVfxLayers = TransporterVfxLayers.DEFAULT,
) {
    fun beamOpacity(beamIntensity: Float?): Float {
        val base = beamIntensity?.coerceIn(0.2f, 1f) ?: 0.78f
        return (base + beamOpacityBias).coerceIn(0.15f, 1f)
    }

    companion object {
        private val PROFILES: Map<String, TransporterVariationProfile> = mapOf(
            "voyaging" to TransporterVariationProfile(
                variationId = "voyaging",
                beamWidthMultiplier = 1f,
                beamHeightMultiplier = 1f,
                particleStyle = TransporterParticleStyle.SCANFALL,
                shimmerBeam = false,
                beamOpacityBias = 0f,
                particleDensityMultiplier = 1f,
                vfxLayers = TransporterVfxLayers.forVariation("voyaging"),
            ),
            "generation-next" to TransporterVariationProfile(
                variationId = "generation-next",
                beamWidthMultiplier = 1.7f,
                beamHeightMultiplier = 1.24f,
                particleStyle = TransporterParticleStyle.SPARKLE_RISE,
                shimmerBeam = true,
                beamOpacityBias = -0.08f,
                particleDensityMultiplier = 1.15f,
                vfxLayers = TransporterVfxLayers.forVariation("generation-next"),
            ),
            "spoon" to TransporterVariationProfile(
                variationId = "spoon",
                beamWidthMultiplier = 1.4f,
                beamHeightMultiplier = 1.14f,
                particleStyle = TransporterParticleStyle.SCANFALL_DENSE,
                shimmerBeam = false,
                beamOpacityBias = 0.12f,
                particleDensityMultiplier = 1.35f,
                vfxLayers = TransporterVfxLayers.forVariation("spoon"),
            ),
        )

        val DEFAULT: TransporterVariationProfile = PROFILES.getValue("voyaging")

        /** Canonical on-device palette when operator loadout is still default cyan. */
        fun canonicalPaletteId(variationId: String?): String? {
            return when (variationId?.trim().orEmpty()) {
                "voyaging" -> "transporter_white"
                "generation-next" -> "transporter_generation_next"
                "spoon" -> "transporter_spoon"
                else -> null
            }
        }

        fun shimmerIntensity(profile: TransporterVariationProfile): Float {
            return when (profile.variationId) {
                "generation-next" -> 0.45f
                "spoon" -> 0.35f
                else -> 0.28f
            }
        }

        fun resolve(
            variationId: String?,
            beamIntensity: Float?,
            beamScale: Float?,
            particleStyleHint: String?,
        ): ResolvedTransporterVariation {
            val normalizedId = variationId?.trim().orEmpty().ifBlank { "voyaging" }
            val profile = PROFILES[normalizedId] ?: DEFAULT
            val style = particleStyleHint?.trim().orEmpty().let { hint ->
                when (hint) {
                    "scanfall_dense" -> TransporterParticleStyle.SCANFALL_DENSE
                    "sparkle_rise" -> TransporterParticleStyle.SPARKLE_RISE
                    "scanfall" -> TransporterParticleStyle.SCANFALL
                    else -> profile.particleStyle
                }
            }
            val mergedProfile = profile.copy(particleStyle = style)
            val scale = beamScale?.coerceIn(0.5f, 1.5f) ?: 1f
            return ResolvedTransporterVariation(
                profile = mergedProfile,
                beamScale = scale,
                beamOpacity = mergedProfile.beamOpacity(beamIntensity),
            )
        }
    }
}

data class ResolvedTransporterVariation(
    val profile: TransporterVariationProfile,
    val beamScale: Float,
    val beamOpacity: Float,
)
