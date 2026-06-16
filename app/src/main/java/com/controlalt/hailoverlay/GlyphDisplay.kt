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
) {
    val glyphAlpha = alpha.coerceIn(0f, 1f)
    val drawableId = glyphDrawableId(glyphId)
    if (drawableId != null) {
        Image(
            painter = painterResource(drawableId),
            contentDescription = glyphId,
            modifier = Modifier
                .size(size)
                .graphicsLayer { this.alpha = glyphAlpha },
        )
        return
    }

    Text(
        text = glyphEmojiFallback(glyphId),
        fontSize = (size.value * 0.9f).sp,
        color = Color.White.copy(alpha = glyphAlpha),
        textAlign = TextAlign.Center,
    )
}

private fun glyphDrawableId(glyphId: String): Int? {
    return when (glyphId) {
        "hail-sniffer" -> R.drawable.glyph_hail_sniffer
        "hail-eye-check" -> R.drawable.glyph_hail_eye_check
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
        "hail-sniffer" -> "👃"
        "hail-eye-check" -> "◎"
        "hail-summons" -> "▲"
        "hail-alert" -> "▮"
        "hail-route" -> "↦"
        "hail-beacon" -> "◉"
        else -> "✦"
    }
}
