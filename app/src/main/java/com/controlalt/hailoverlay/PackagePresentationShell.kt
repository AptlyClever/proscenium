package com.controlalt.hailoverlay

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp

/**
 * Paint-box presentation shell — scrim + package shadow + rim glow (Phase I Kit parity).
 * Mirrors Axiom `packageScrimStyle` / `messagePlateStyle` semantics.
 */
object PackagePresentationShell {
    @Composable
    fun Scrim(
        presentation: PalettePresentation,
        modifier: Modifier = Modifier,
        rimPulseAlpha: Float = 0f,
    ) {
        val density = LocalDensity.current
        val cornerDp = with(density) { presentation.packageCornerRadiusPx.toDp() }
        val shape = RoundedCornerShape(cornerDp)
        val rim = (presentation.rimGlowAlpha + rimPulseAlpha).coerceIn(0f, 0.35f)
        val shadowAlpha = presentation.packageShadowAlpha.coerceIn(0f, 0.55f)

        Box(
            modifier = modifier
                .fillMaxSize()
                .drawBehind {
                    val cornerPx = presentation.packageCornerRadiusPx
                    if (shadowAlpha > 0.05f) {
                        drawRoundRect(
                            color = Color.Black.copy(alpha = shadowAlpha),
                            topLeft = Offset(0f, 4f),
                            size = Size(size.width, (size.height - 4f).coerceAtLeast(1f)),
                            cornerRadius = CornerRadius(cornerPx, cornerPx),
                        )
                    }
                    if (rim > 0.02f) {
                        drawRoundRect(
                            color = Color.White.copy(alpha = rim * 0.55f),
                            style = Stroke(width = 8f),
                            cornerRadius = CornerRadius(cornerPx, cornerPx),
                        )
                    }
                }
                .clip(shape)
                .background(presentation.scrimColor())
                .then(
                    if (rim > 0.02f) {
                        Modifier.border(1.dp, Color.White.copy(alpha = rim), shape)
                    } else {
                        Modifier
                    },
                ),
        )
    }

    fun messagePlateBorderModifier(shape: RoundedCornerShape): Modifier {
        return Modifier.border(1.dp, Color.White.copy(alpha = 0.04f), shape)
    }
}
