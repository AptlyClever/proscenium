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
) {
    companion object {
        fun fromJson(raw: String): Result<HailShowRequest> {
            return runCatching {
                val json = JSONObject(raw)
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
        )
    }
}
