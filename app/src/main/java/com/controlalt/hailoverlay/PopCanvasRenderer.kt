package com.controlalt.hailoverlay

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import kotlin.math.cos
import kotlin.math.sin

/**
 * Glyph-local pop renderer — micro_flash + tiny_sparks (max 8 particles per contract).
 */
object PopCanvasRenderer {

    private const val PARTICLE_COUNT = 8
    private const val TV_ALPHA_BOOST = 5.5f

    private data class PaletteRoles(
        val flash: Color,
        val spark: Color,
    )

    private fun rolesFor(paletteId: String): PaletteRoles {
        return when (paletteId) {
            "axiom_dark_cyan" -> PaletteRoles(
                flash = Color(0xFF7EE8D8),
                spark = Color(0xFFB8FFF4),
            )
            "transporter_white" -> PaletteRoles(
                flash = Color(0xFFE8F4FF),
                spark = Color(0xFFF8FCFF),
            )
            "cute_purple" -> PaletteRoles(
                flash = Color(0xFFE8B8D8),
                spark = Color(0xFFF5D0EC),
            )
            else -> rolesFor("axiom_dark_cyan")
        }
    }

    private fun alphaTv(value: Float): Float = (value * TV_ALPHA_BOOST).coerceIn(0f, 1f)

    fun DrawScope.drawPopFrame(
        regions: PaintBoxLayout.Regions,
        paletteId: String,
        frame: PopLifecycle.Frame,
    ) {
        if (frame.flashAlpha <= 0.01f && frame.particlePhase <= 0.01f) {
            return
        }
        val roles = rolesFor(paletteId)
        val cx = regions.glyphCenterX
        val cy = regions.glyphCenterY
        val radius = regions.glyphVisualSizePx * 0.42f * frame.flashScale

        if (frame.flashAlpha > 0.02f) {
            drawCircle(
                brush = androidx.compose.ui.graphics.Brush.radialGradient(
                    colors = listOf(
                        roles.flash.copy(alpha = alphaTv(frame.flashAlpha * 0.55f)),
                        roles.flash.copy(alpha = alphaTv(frame.flashAlpha * 0.18f)),
                        Color.Transparent,
                    ),
                    center = Offset(cx, cy),
                    radius = radius,
                ),
                radius = radius,
                center = Offset(cx, cy),
            )
        }

        val sparkRadius = regions.glyphVisualSizePx * 0.08f
        for (i in 0 until PARTICLE_COUNT) {
            val angle = (i.toFloat() / PARTICLE_COUNT) * (Math.PI.toFloat() * 2f)
            val spread = regions.glyphVisualSizePx * (0.22f + frame.particlePhase * 0.38f)
            val wobble = sin((frame.particlePhase + i * 0.13f) * Math.PI.toFloat() * 2f) * 0.08f
            val px = cx + cos(angle) * spread * (1f + wobble)
            val py = cy + sin(angle) * spread * (1f + wobble)
            val sparkAlpha = alphaTv(
                frame.flashAlpha * 0.65f * (1f - frame.particlePhase * 0.35f),
            )
            if (sparkAlpha > 0.02f) {
                drawCircle(
                    color = roles.spark.copy(alpha = sparkAlpha),
                    radius = sparkRadius,
                    center = Offset(px, py),
                )
            }
        }
    }

    /** Subtle stable-hold shimmer — keeps overlay canvas invalidating on Google TV. */
    fun DrawScope.drawPopStableFrame(
        regions: PaintBoxLayout.Regions,
        paletteId: String,
        stablePulse: Float,
        glyphResidualIntensity: Float = 1f,
    ) {
        if (regions.paintBoxWidth < 8f) {
            return
        }
        val roles = rolesFor(paletteId)
        val cx = regions.glyphCenterX
        val cy = regions.glyphCenterY
        val radius = regions.glyphVisualSizePx * (0.34f + sin(stablePulse * Math.PI.toFloat() * 2f) * 0.04f)
        val shimmer = alphaTv(0.22f * glyphResidualIntensity.coerceIn(0f, 1f))
        if (shimmer <= 0.02f) {
            return
        }
        drawCircle(
            brush = androidx.compose.ui.graphics.Brush.radialGradient(
                colors = listOf(
                    roles.flash.copy(alpha = shimmer * 0.55f),
                    roles.flash.copy(alpha = shimmer * 0.16f),
                    Color.Transparent,
                ),
                center = Offset(cx, cy),
                radius = radius,
            ),
            radius = radius,
            center = Offset(cx, cy),
        )
    }
}
