package com.controlalt.hailoverlay

import org.json.JSONObject

data class HailShowRequest(
    val hailId: String,
    val effectId: String,
    val glyphId: String,
    val paletteId: String?,
    val message: String,
    val durationMs: Long,
    val placementId: String?,
    val placementMode: String?,
    val xPercent: Float?,
    val yPercent: Float?,
    val sizeTier: String?,
    val brokerProof: String?,
    val effectVariationId: String?,
    val beamIntensity: Float?,
    val beamScale: Float?,
    val particleStyleHint: String?,
    val choreography: EffectChoreography,
    val proceduralGraph: ProceduralGraphSpec?,
) {
    companion object {
        fun fromJson(raw: String): Result<HailShowRequest> {
            return runCatching {
                val json = JSONObject(raw)
                val androidTuning = json.optJSONObject("android_effect_tuning")
                val effectIdentity = json.optJSONObject("effect_identity")
                val proceduralGraph = ProceduralGlyphParser.parseGlyphRender(json.optJSONObject("glyph_render"))
                HailShowRequest(
                    hailId = json.optString("hail_id", "hail.sniffer.001"),
                    effectId = json.getString("effect_id"),
                    glyphId = json.getString("glyph_id"),
                    paletteId = json.optString("palette_id").ifBlank { null },
                    message = json.getString("message"),
                    durationMs = json.getLong("duration_ms"),
                    placementId = json.optString("placement_id").ifBlank { null },
                    placementMode = json.optString("placement_mode").ifBlank { null },
                    xPercent = if (json.has("x_percent")) json.getDouble("x_percent").toFloat() else null,
                    yPercent = if (json.has("y_percent")) json.getDouble("y_percent").toFloat() else null,
                    sizeTier = json.optString("size_tier").ifBlank { null },
                    brokerProof = json.optString("broker_proof").ifBlank { null },
                    effectVariationId = json.optString("effect_variation_id").ifBlank { null },
                    beamIntensity = androidTuning?.optDouble("beam_intensity")?.toFloat(),
                    beamScale = androidTuning?.optDouble("beam_scale")?.toFloat(),
                    particleStyleHint = effectIdentity?.optString("particle_style")?.ifBlank { null },
                    choreography = EffectChoreography.fromJson(effectIdentity),
                    proceduralGraph = proceduralGraph,
                )
            }
        }
    }

    fun validate(): Result<HailRegistry.ValidatedHail> {
        return HailRegistry.validate(
            hailId = hailId,
            effectId = effectId,
            glyphId = glyphId,
            paletteId = paletteId,
            message = message,
            durationMs = durationMs,
            placementId = placementId,
            placementMode = placementMode,
            xPercent = xPercent,
            yPercent = yPercent,
            sizeTier = sizeTier,
            brokerProof = brokerProof,
            effectVariationId = effectVariationId,
            beamIntensity = beamIntensity,
            beamScale = beamScale,
            particleStyleHint = particleStyleHint,
            choreography = choreography,
            proceduralGraph = proceduralGraph,
        )
    }
}
