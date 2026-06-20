package com.controlalt.hailoverlay

import org.json.JSONObject

enum class ProceduralFillMode {
    NONE,
    CURRENT_COLOR,
}

enum class ProceduralStrokeLineCap {
    BUTT,
    ROUND,
    SQUARE,
}

enum class ProceduralStrokeLineJoin {
    MITER,
    ROUND,
    BEVEL,
}

data class ProceduralPathSpec(
    val d: String,
    val strokeWidth: Float,
    val opacity: Float,
    val fill: ProceduralFillMode = ProceduralFillMode.NONE,
    val strokeLineCap: ProceduralStrokeLineCap = ProceduralStrokeLineCap.ROUND,
    val strokeLineJoin: ProceduralStrokeLineJoin = ProceduralStrokeLineJoin.ROUND,
)

data class ProceduralCircleSpec(
    val cx: Float,
    val cy: Float,
    val r: Float,
    val opacity: Float,
    val fill: ProceduralFillMode = ProceduralFillMode.CURRENT_COLOR,
)

data class ProceduralGraphSpec(
    val paths: List<ProceduralPathSpec>,
    val circles: List<ProceduralCircleSpec> = emptyList(),
    val signature: String?,
)

data class ImageGlyphSpec(
    val bitmapBase64: String,
    val mediaType: String,
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

    /** Flat raster Glyph Hero — bitmap arrives inline, no path data to parse. */
    fun parseImageGlyphRender(json: JSONObject?): ImageGlyphSpec? {
        if (json == null || json.optString("kind") != "image") {
            return null
        }
        val bitmapBase64 = json.optString("image_base64").trim()
        if (bitmapBase64.isEmpty()) {
            return null
        }
        val mediaType = json.optString("image_media_type", "image/png").ifBlank { "image/png" }
        return ImageGlyphSpec(bitmapBase64 = bitmapBase64, mediaType = mediaType)
    }

    /** Dual-layer raster Glyph Hero — ordered PNG layers with optional pulse anchors. */
    fun parseImageLayersGlyphRender(json: JSONObject?): ImageLayersGlyphSpec? {
        if (json == null || json.optString("kind") != "image_layers") {
            return null
        }
        val layersJson = json.optJSONArray("layers") ?: return null
        val layers = mutableListOf<ImageLayerSpec>()
        for (index in 0 until layersJson.length()) {
            val row = layersJson.optJSONObject(index) ?: continue
            val bitmapBase64 = row.optString("image_base64").trim()
            if (bitmapBase64.isEmpty()) {
                continue
            }
            val mediaType = row.optString("image_media_type", "image/png").ifBlank { "image/png" }
            layers.add(
                ImageLayerSpec(
                    role = row.optString("role", "mass").ifBlank { "mass" },
                    bitmapBase64 = bitmapBase64,
                    mediaType = mediaType,
                    zIndex = row.optInt("z_index", layers.size),
                    pulseAnchor = row.optString("pulse_anchor").ifBlank { null },
                ),
            )
        }
        if (layers.isEmpty()) {
            return null
        }
        return ImageLayersGlyphSpec(layers = layers)
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
            paths.add(
                ProceduralPathSpec(
                    d = d,
                    strokeWidth = row.optDouble("stroke_width", 2.5).toFloat(),
                    opacity = row.optDouble("opacity", 1.0).toFloat(),
                    fill = parseFillMode(row.optString("fill", "none")),
                    strokeLineCap = parseStrokeLineCap(row.optString("stroke_linecap", "round")),
                    strokeLineJoin = parseStrokeLineJoin(row.optString("stroke_linejoin", "round")),
                ),
            )
        }
        val circlesJson = json.optJSONArray("circles")
        val circles = mutableListOf<ProceduralCircleSpec>()
        if (circlesJson != null) {
            for (index in 0 until circlesJson.length()) {
                val row = circlesJson.optJSONObject(index) ?: continue
                circles.add(
                    ProceduralCircleSpec(
                        cx = row.optDouble("cx").toFloat(),
                        cy = row.optDouble("cy").toFloat(),
                        r = row.optDouble("r").toFloat(),
                        opacity = row.optDouble("opacity", 0.9).toFloat(),
                        fill = parseFillMode(row.optString("fill", "currentColor")),
                    ),
                )
            }
        }
        if (paths.isEmpty() && circles.isEmpty()) {
            return null
        }
        val signature = json.optString("signature").ifBlank { null }
        return ProceduralGraphSpec(paths = paths, circles = circles, signature = signature)
    }

    internal fun parseFillMode(raw: String?): ProceduralFillMode {
        return when (raw?.trim()?.lowercase()) {
            null, "", "none" -> ProceduralFillMode.NONE
            else -> ProceduralFillMode.CURRENT_COLOR
        }
    }

    internal fun parseStrokeLineCap(raw: String?): ProceduralStrokeLineCap {
        return when (raw?.trim()?.lowercase()) {
            "butt" -> ProceduralStrokeLineCap.BUTT
            "square" -> ProceduralStrokeLineCap.SQUARE
            else -> ProceduralStrokeLineCap.ROUND
        }
    }

    internal fun parseStrokeLineJoin(raw: String?): ProceduralStrokeLineJoin {
        return when (raw?.trim()?.lowercase()) {
            "miter" -> ProceduralStrokeLineJoin.MITER
            "bevel" -> ProceduralStrokeLineJoin.BEVEL
            else -> ProceduralStrokeLineJoin.ROUND
        }
    }
}
