package com.controlalt.hailoverlay

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.sin
import kotlin.random.Random

data class HailPalette(
    val beamCyan: Color,
    val beamWhite: Color,
    val beamBase: Color,
    val messageColor: Color,
    val backdropTint: Color,
)

fun paletteFor(paletteId: String): HailPalette {
    return when (paletteId) {
        "cute_purple" -> HailPalette(
            beamCyan = Color(0xFFF472B6),
            beamWhite = Color(0xFFFFF1FA),
            beamBase = Color(0xFF4C1D95),
            messageColor = Color(0xFFFFF1FA),
            backdropTint = Color(0x334C1D95),
        )
        "transporter_white" -> HailPalette(
            beamCyan = Color(0xFFE8FFFF),
            beamWhite = Color(0xFFFFFFFF),
            beamBase = Color(0xFF1F2937),
            messageColor = Color(0xFFFFFFFF),
            backdropTint = Color(0x331F2937),
        )
        else -> HailPalette(
            beamCyan = Color(0xFF4AF2C5),
            beamWhite = Color(0xFFE8FFFF),
            beamBase = Color(0xFF0B3D2E),
            messageColor = Color(0xFFEAFBF4),
            backdropTint = Color(0x330B3D2E),
        )
    }
}

@Composable
fun TransporterOverlay(
    glyphId: String,
    message: String,
    paletteId: String,
    placement: Placement.Resolved,
) {
    val palette = paletteFor(paletteId)
    val transition = rememberInfiniteTransition(label = "transporter")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "beamPhase",
    )
    val glyphAlpha by transition.animateFloat(
        initialValue = 0.2f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 900, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glyphAlpha",
    )

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val density = LocalDensity.current
        val customOffset = if (placement.placementMode == Placement.MODE_CUSTOM) {
            val x = (placement.xPercent ?: 50f) / 100f
            val y = (placement.yPercent ?: 50f) / 100f
            with(density) {
                Modifier.offset(
                    x = (maxWidth * x) - 96.dp,
                    y = (maxHeight * y) - 72.dp,
                )
            }
        } else {
            Modifier
        }

        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = if (placement.placementMode == Placement.MODE_CUSTOM) {
                Alignment.TopStart
            } else {
                placement.alignment
            },
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                drawTransporterBeam(phase, palette)
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = customOffset
                    .padding(horizontal = 48.dp)
                    .padding(vertical = placementPadding(placement.placementId)),
            ) {
                GlyphDisplay(
                    glyphId = glyphId,
                    tint = palette.beamWhite.copy(alpha = glyphAlpha),
                    size = 96.dp,
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = message,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = palette.messageColor,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 12.dp),
                )
            }
        }
    }
}

private fun placementPadding(placementId: String): Dp {
    return when (placementId) {
        "top_right", "top_left" -> 48.dp
        "bottom_right", "bottom_left", "lower_center" -> 72.dp
        "center_soft" -> 0.dp
        else -> 32.dp
    }
}

private fun DrawScope.drawTransporterBeam(phase: Float, palette: HailPalette) {
    val centerX = size.width / 2f
    val beamTop = size.height * 0.02f
    val beamBottom = size.height * 0.72f
    val beamWidth = size.width * 0.18f

    drawRect(color = palette.backdropTint, size = size)

    drawRect(
        brush = Brush.verticalGradient(
            colors = listOf(
                palette.beamWhite.copy(alpha = 0.85f),
                palette.beamCyan.copy(alpha = 0.55f),
                palette.beamBase.copy(alpha = 0.15f),
                Color.Transparent,
            ),
            startY = beamTop,
            endY = beamBottom,
        ),
        topLeft = Offset(centerX - beamWidth / 2f, beamTop),
        size = androidx.compose.ui.geometry.Size(beamWidth, beamBottom - beamTop),
    )

    val particleCount = 28
    val random = Random(42)
    repeat(particleCount) { index ->
        val baseY = beamTop + (beamBottom - beamTop) * ((index / particleCount.toFloat()) + phase) % 1f
        val wobble = sin((index + phase * 10f) * 0.7f) * beamWidth * 0.25f
        val x = centerX + wobble
        val radius = 4f + random.nextFloat() * 5f
        drawCircle(
            color = palette.beamWhite.copy(alpha = 0.35f + random.nextFloat() * 0.4f),
            radius = radius,
            center = Offset(x, baseY),
        )
    }

    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(
                palette.beamWhite.copy(alpha = 0.55f),
                palette.beamCyan.copy(alpha = 0.25f),
                Color.Transparent,
            ),
            center = Offset(centerX, size.height * 0.28f),
            radius = beamWidth * 0.9f,
        ),
        radius = beamWidth * 0.9f,
        center = Offset(centerX, size.height * 0.28f),
    )
}
