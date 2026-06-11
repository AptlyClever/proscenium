package com.controlalt.hailoverlay

import org.json.JSONObject

data class HailShowRequest(
    val effectId: String,
    val glyphId: String,
    val message: String,
    val durationMs: Long,
) {
    companion object {
        fun fromJson(raw: String): Result<HailShowRequest> {
            return runCatching {
                val json = JSONObject(raw)
                HailShowRequest(
                    effectId = json.getString("effect_id"),
                    glyphId = json.getString("glyph_id"),
                    message = json.getString("message"),
                    durationMs = json.getLong("duration_ms"),
                )
            }
        }
    }

    fun validate(): Result<HailAllowlist.ValidatedHail> {
        return HailAllowlist.validate(effectId, glyphId, message, durationMs)
    }
}
