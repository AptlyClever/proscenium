package com.controlalt.hailoverlay

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp

/** Flat raster Glyph Hero — same bitmap everywhere, no path projection. */
@Composable
fun ImageGlyphDisplay(
    glyph: ImageGlyphSpec,
    alpha: Float,
    size: Dp,
    modifier: Modifier = Modifier,
) {
    val glyphAlpha = alpha.coerceIn(0f, 1f)
    val bitmap: ImageBitmap? = remember(glyph.bitmapBase64) {
        runCatching {
            val bytes = Base64.decode(glyph.bitmapBase64, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size).asImageBitmap()
        }.getOrNull()
    }
    if (bitmap != null) {
        Image(
            bitmap = bitmap,
            contentDescription = null,
            contentScale = ContentScale.Fit,
            alpha = glyphAlpha,
            modifier = modifier.size(size),
        )
    }
}
