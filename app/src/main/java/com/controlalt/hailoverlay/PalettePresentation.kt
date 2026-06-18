package com.controlalt.hailoverlay

import androidx.compose.ui.graphics.Color
import org.json.JSONObject

/**
 * Palette-backed TV presentation surface — paint-box scrim + message plate (Phase A).
 */
data class PalettePresentation(
    val paletteId: String,
    val backdropTint: Color,
    val packageScrimOpacity: Float,
    val packageCornerRadiusPx: Float,
    val messageBacking: Color,
    val messageBackingOpacity: Float,
    val messagePlateRadiusPx: Float,
    val messageColor: Color,
    val packageShadowAlpha: Float,
) {
    companion object {
        private const val DEFAULT_SCRIM_OPACITY = 0.2f
        private const val DEFAULT_CORNER_RADIUS_PX = 12f
        private const val DEFAULT_PLATE_RADIUS_PX = 6f
        private const val DEFAULT_SHADOW_ALPHA = 0.28f

        fun fromJson(json: JSONObject?, paletteId: String?): PalettePresentation {
            if (json != null) {
                return PalettePresentation(
                    paletteId = json.optString("palette_id", paletteId ?: "axiom_dark_cyan"),
                    backdropTint = parseColor(json.optString("backdrop_tint"), "#0A2E24"),
                    packageScrimOpacity = json.optDouble("package_scrim_opacity", DEFAULT_SCRIM_OPACITY.toDouble()).toFloat(),
                    packageCornerRadiusPx = json.optDouble("package_corner_radius_px", DEFAULT_CORNER_RADIUS_PX.toDouble()).toFloat(),
                    messageBacking = parseColor(json.optString("message_backing"), "#121618"),
                    messageBackingOpacity = json.optDouble("message_backing_opacity", 0.5).toFloat().coerceIn(0.2f, 1f),
                    messagePlateRadiusPx = json.optDouble("message_plate_radius_px", DEFAULT_PLATE_RADIUS_PX.toDouble()).toFloat(),
                    messageColor = parseColor(json.optString("message_color"), "#F0FAF6"),
                    packageShadowAlpha = json.optDouble("package_shadow_alpha", DEFAULT_SHADOW_ALPHA.toDouble()).toFloat(),
                )
            }
            val palette = paletteFor(paletteId ?: "axiom_dark_cyan")
            return PalettePresentation(
                paletteId = paletteId ?: "axiom_dark_cyan",
                backdropTint = palette.backdropTint,
                packageScrimOpacity = DEFAULT_SCRIM_OPACITY,
                packageCornerRadiusPx = DEFAULT_CORNER_RADIUS_PX,
                messageBacking = palette.messageBacking,
                messageBackingOpacity = palette.messageBackingOpacity,
                messagePlateRadiusPx = DEFAULT_PLATE_RADIUS_PX,
                messageColor = palette.messageColor,
                packageShadowAlpha = DEFAULT_SHADOW_ALPHA,
            )
        }

        private fun parseColor(raw: String, fallbackHex: String): Color {
            val value = raw.trim().ifBlank { fallbackHex }
            return runCatching {
                val normalized = if (value.startsWith("#")) value.substring(1) else value
                when (normalized.length) {
                    6 -> Color(0xFF000000 or normalized.toLong(16).toInt())
                    8 -> Color(normalized.toLong(16).toInt())
                    else -> Color(0xFF000000 or fallbackHex.removePrefix("#").toLong(16).toInt())
                }
            }.getOrElse {
                Color(0xFF000000 or fallbackHex.removePrefix("#").toLong(16).toInt())
            }
        }
    }

    fun scrimColor(): Color = backdropTint.copy(alpha = packageScrimOpacity.coerceIn(0f, 1f))

    fun plateColor(): Color = messageBacking.copy(alpha = messageBackingOpacity.coerceIn(0f, 1f))
}
