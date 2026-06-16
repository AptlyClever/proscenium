package com.controlalt.hailoverlay

import org.json.JSONArray
import org.json.JSONObject

data class ProceduralPathSpec(
    val d: String,
    val strokeWidth: Float,
    val opacity: Float,
)

data class ProceduralGraphSpec(
    val paths: List<ProceduralPathSpec>,
    val signature: String?,
)

object ProceduralGlyphParser {
    fun parseGlyphRender(json: JSONObject?): ProceduralGraphSpec? {
        if (json == null) {
            return null
        }
        if (json.optString("kind") != "procedural") {
            return null
        }
        return parseGraph(json.optJSONObject("procedural_graph"))
    }

    fun parseGraph(json: JSONObject?): ProceduralGraphSpec? {
        if (json == null || json.optInt("version") != 1) {
            return null
        }
        val pathsJson = json.optJSONArray("paths") ?: return null
        val paths = mutableListOf<ProceduralPathSpec>()
        for (index in 0 until pathsJson.length()) {
            val row = pathsJson.optJSONObject(index) ?: continue
            val d = row.optString("d").trim()
            if (d.isEmpty()) {
                continue
            }
            val strokeWidth = row.optDouble("stroke_width", 2.5).toFloat()
            val opacity = row.optDouble("opacity", 1.0).toFloat()
            paths.add(ProceduralPathSpec(d = d, strokeWidth = strokeWidth, opacity = opacity))
        }
        if (paths.isEmpty()) {
            return null
        }
        val signature = json.optString("signature").ifBlank { null }
        return ProceduralGraphSpec(paths = paths, signature = signature)
    }
}
