package com.controlalt.hailoverlay

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.sp

@Composable
fun GlyphDisplay(
    glyphId: String,
    alpha: Float,
    size: Dp,
    scale: Float = 1f,
    proceduralGraph: ProceduralGraphSpec? = null,
) {
    val glyphAlpha = alpha.coerceIn(0f, 1f)
    val glyphScale = scale.coerceIn(0.5f, 1.35f)
    val scaleModifier = Modifier.graphicsLayer {
        this.alpha = glyphAlpha
        scaleX = glyphScale
        scaleY = glyphScale
    }
    if (proceduralGraph != null) {
        ProceduralGlyphDisplay(
            graph = proceduralGraph,
            alpha = glyphAlpha,
            size = size,
            modifier = scaleModifier,
        )
        return
    }

    val drawableId = glyphDrawableId(glyphId)
    if (drawableId != null) {
        Image(
            painter = painterResource(drawableId),
            contentDescription = glyphId,
            modifier = Modifier
                .size(size)
                .then(scaleModifier),
        )
        return
    }

    Text(
        text = glyphEmojiFallback(glyphId),
        fontSize = (size.value * 0.9f).sp,
        color = Color.White.copy(alpha = glyphAlpha),
        textAlign = TextAlign.Center,
        modifier = scaleModifier,
    )
}

private fun glyphDrawableId(glyphId: String): Int? {
    return when (glyphId) {
        "default" -> R.drawable.glyph_default
        "default" -> R.drawable.glyph_default
        "hail-summons" -> R.drawable.glyph_hail_summons
        "hail-alert" -> R.drawable.glyph_hail_alert
        "hail-route" -> R.drawable.glyph_hail_route
        "hail-beacon" -> R.drawable.glyph_hail_beacon
        "default" -> R.drawable.glyph_default
        else -> null
    }
}

private fun glyphEmojiFallback(glyphId: String): String {
    return when (glyphId) {
        "default" -> "👃"
        "default" -> "◎"
        "hail-summons" -> "▲"
        "hail-alert" -> "▮"
        "hail-route" -> "↦"
        "hail-beacon" -> "◉"
        else -> "✦"
    }
}
