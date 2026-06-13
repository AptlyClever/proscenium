package com.controlalt.hailoverlay

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
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
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.random.Random

enum class TransporterPhase {
    ENTRANCE,
    STABLE,
    EXIT,
    CLEARED,
}

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
    sizeTier: PaintBoxTier = PaintBoxTier.MEDIUM,
    stableHoldMs: Long,
    onLifecycleComplete: () -> Unit,
) {
    val palette = paletteFor(paletteId)
    var phase by remember { mutableStateOf(TransporterPhase.ENTRANCE) }
    val entranceProgress = remember { Animatable(0f) }
    val exitProgress = remember { Animatable(1f) }
    var stablePulse by remember { mutableStateOf(0f) }

    LaunchedEffect(glyphId, message, stableHoldMs) {
        phase = TransporterPhase.ENTRANCE
        entranceProgress.snapTo(0f)
        entranceProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(
                durationMillis = TransporterContract.ENTRANCE_MS.toInt(),
                easing = LinearEasing,
            ),
        )
        phase = TransporterPhase.STABLE
        val stableEnd = System.currentTimeMillis() + stableHoldMs
        while (System.currentTimeMillis() < stableEnd) {
            stablePulse = ((System.currentTimeMillis() % 2400L) / 2400f)
            kotlinx.coroutines.delay(32)
        }
        phase = TransporterPhase.EXIT
        exitProgress.snapTo(1f)
        exitProgress.animateTo(
            targetValue = 0f,
            animationSpec = tween(
                durationMillis = TransporterContract.EXIT_MS.toInt(),
                easing = LinearEasing,
            ),
        )
        phase = TransporterPhase.CLEARED
        onLifecycleComplete()
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val density = LocalDensity.current
        val screenW = with(density) { maxWidth.toPx() }
        val screenH = with(density) { maxHeight.toPx() }
        val regions = remember(screenW, screenH, placement, sizeTier) {
            PaintBoxLayout.resolve(screenW, screenH, placement, sizeTier)
        }

        val entrance = entranceProgress.value
        val exit = exitProgress.value
        val glyphAlpha = when (phase) {
            TransporterPhase.ENTRANCE -> 0.15f + entrance * 0.85f
            TransporterPhase.STABLE -> 0.92f + sin(stablePulse * Math.PI.toFloat() * 2f) * 0.08f
            TransporterPhase.EXIT -> exit.coerceIn(0f, 1f)
            TransporterPhase.CLEARED -> 0f
        }

        Canvas(modifier = Modifier.fillMaxSize()) {
            when (phase) {
                TransporterPhase.ENTRANCE -> drawLocalizedTransporterBeam(
                    regions = regions,
                    palette = palette,
                    intensity = entrance,
                    dematerializing = false,
                )
                TransporterPhase.STABLE -> drawStableResidual(
                    regions = regions,
                    palette = palette,
                    pulse = stablePulse,
                )
                TransporterPhase.EXIT -> drawLocalizedTransporterBeam(
                    regions = regions,
                    palette = palette,
                    intensity = exit,
                    dematerializing = true,
                )
                TransporterPhase.CLEARED -> Unit
            }
        }

        val glyphSizeDp = with(density) { regions.glyphVisualSizePx.toDp() }
        val boxWidthDp = with(density) { regions.paintBoxWidth.toDp() }
        val safePadH = with(density) { (regions.safeZoneLeft - regions.paintBoxLeft).toDp() }
        val safePadV = with(density) { (regions.safeZoneTop - regions.paintBoxTop).toDp() }

        Box(
            modifier = Modifier
                .offset {
                    IntOffset(
                        regions.paintBoxLeft.roundToInt(),
                        regions.paintBoxTop.roundToInt(),
                    )
                }
                .width(boxWidthDp)
                .padding(horizontal = safePadH, vertical = safePadV),
            contentAlignment = Alignment.TopCenter,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                GlyphDisplay(
                    glyphId = glyphId,
                    tint = palette.beamWhite.copy(alpha = glyphAlpha.coerceIn(0f, 1f)),
                    size = glyphSizeDp.coerceAtLeast(48.dp),
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = message,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = palette.messageColor.copy(alpha = glyphAlpha.coerceIn(0f, 1f)),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 8.dp),
                )
            }
        }
    }
}

private fun DrawScope.drawLocalizedTransporterBeam(
    regions: PaintBoxLayout.Regions,
    palette: HailPalette,
    intensity: Float,
    dematerializing: Boolean,
) {
    if (intensity <= 0.01f) {
        return
    }

    val cx = regions.glyphCenterX
    val beamW = regions.beamWidth
    val beamH = regions.beamHeight
    val beamTop = regions.glyphCenterY - beamH * (if (dematerializing) 0.35f else 0.85f)
    val beamBottom = regions.glyphCenterY + beamH * 0.25f
    val alphaScale = intensity.coerceIn(0f, 1f)

    drawRect(
        brush = Brush.verticalGradient(
            colors = listOf(
                palette.beamWhite.copy(alpha = 0.75f * alphaScale),
                palette.beamCyan.copy(alpha = 0.45f * alphaScale),
                palette.beamBase.copy(alpha = 0.12f * alphaScale),
                Color.Transparent,
            ),
            startY = beamTop,
            endY = beamBottom,
        ),
        topLeft = Offset(cx - beamW / 2f, beamTop),
        size = androidx.compose.ui.geometry.Size(beamW, beamBottom - beamTop),
    )

    val particleCount = 12
    val random = Random(if (dematerializing) 7 else 3)
    repeat(particleCount) { index ->
        val travel = if (dematerializing) 1f - intensity else intensity
        val baseY = beamTop + (beamBottom - beamTop) * ((index / particleCount.toFloat()) + travel * 0.35f) % 1f
        val wobble = sin((index + travel * 8f) * 0.9f) * beamW * 0.18f
        drawCircle(
            color = palette.beamWhite.copy(alpha = (0.25f + random.nextFloat() * 0.35f) * alphaScale),
            radius = 2.5f + random.nextFloat() * 3f,
            center = Offset(cx + wobble, baseY),
        )
    }
}

private fun DrawScope.drawStableResidual(
    regions: PaintBoxLayout.Regions,
    palette: HailPalette,
    pulse: Float,
) {
    val cx = regions.glyphCenterX
    val cy = regions.glyphCenterY
    val r = regions.beamWidth * 0.55f
    val pulseAlpha = 0.08f + sin(pulse * Math.PI.toFloat() * 2f) * 0.04f
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(
                palette.beamWhite.copy(alpha = pulseAlpha),
                palette.beamCyan.copy(alpha = pulseAlpha * 0.45f),
                Color.Transparent,
            ),
            center = Offset(cx, cy),
            radius = r,
        ),
        radius = r,
        center = Offset(cx, cy),
    )
}
