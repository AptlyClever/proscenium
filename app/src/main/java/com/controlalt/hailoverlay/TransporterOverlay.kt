package com.controlalt.hailoverlay

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.sin
import kotlin.random.Random

private val BeamCyan = Color(0xFF4AF2C5)
private val BeamWhite = Color(0xFFE8FFFF)
private val BeamGreen = Color(0xFF0B3D2E)
private val MessageColor = Color(0xFFEAFBF4)

@Composable
fun TransporterOverlay(
    glyphId: String,
    message: String,
) {
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

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.TopCenter,
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawTransporterBeam(phase)
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .padding(top = 96.dp)
                .padding(horizontal = 48.dp),
        ) {
            Text(
                text = glyphFor(glyphId),
                fontSize = 96.sp,
                color = BeamWhite.copy(alpha = glyphAlpha),
                textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = message,
                fontSize = 34.sp,
                fontWeight = FontWeight.SemiBold,
                color = MessageColor,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp),
            )
        }
    }
}

private fun glyphFor(glyphId: String): String {
    return when (glyphId) {
        "hail-sniffer" -> "👃"
        else -> "✦"
    }
}

private fun DrawScope.drawTransporterBeam(phase: Float) {
    val centerX = size.width / 2f
    val beamTop = size.height * 0.02f
    val beamBottom = size.height * 0.72f
    val beamWidth = size.width * 0.18f

    drawRect(
        brush = Brush.verticalGradient(
            colors = listOf(
                BeamCyan.copy(alpha = 0.05f),
                BeamGreen.copy(alpha = 0.35f),
                Color.Transparent,
            ),
            startY = 0f,
            endY = size.height,
        ),
        size = size,
    )

    drawRect(
        brush = Brush.verticalGradient(
            colors = listOf(
                BeamWhite.copy(alpha = 0.85f),
                BeamCyan.copy(alpha = 0.55f),
                BeamGreen.copy(alpha = 0.15f),
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
            color = BeamWhite.copy(alpha = 0.35f + random.nextFloat() * 0.4f),
            radius = radius,
            center = Offset(x, baseY),
        )
    }

    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(
                BeamWhite.copy(alpha = 0.55f),
                BeamCyan.copy(alpha = 0.25f),
                Color.Transparent,
            ),
            center = Offset(centerX, size.height * 0.28f),
            radius = beamWidth * 0.9f,
        ),
        radius = beamWidth * 0.9f,
        center = Offset(centerX, size.height * 0.28f),
    )
}
