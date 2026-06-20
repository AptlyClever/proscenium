package com.controlalt.hailoverlay

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp

private data class DecodedImageLayer(
    val spec: ImageLayerSpec,
    val bitmap: ImageBitmap,
)

/** Dual-layer raster Glyph Hero — mass + accent with optional pulse anchor. */
@Composable
fun ImageLayersGlyphDisplay(
    glyph: ImageLayersGlyphSpec,
    alpha: Float,
    scale: Float,
    size: Dp,
    phase: TransporterPhase,
    entranceT: Float,
    stablePulse: Float,
    choreography: EffectChoreography,
    modifier: Modifier = Modifier,
) {
    val glyphAlpha = alpha.coerceIn(0f, 1f)
    val glyphScale = scale.coerceIn(0.5f, 1.35f)
    val decodedLayers = remember(glyph.layers) {
        glyph.layers
            .sortedBy { it.zIndex }
            .mapNotNull { layer ->
                runCatching {
                    val bytes = Base64.decode(layer.bitmapBase64, Base64.DEFAULT)
                    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
                    if (bitmap != null) DecodedImageLayer(layer, bitmap) else null
                }.getOrNull()
            }
    }

    Box(
        modifier = modifier
            .size(size)
            .graphicsLayer {
                this.alpha = glyphAlpha
                scaleX = glyphScale
                scaleY = glyphScale
            },
    ) {
        decodedLayers.forEach { layer ->
            val layerAlpha = ImageLayerPulse.alphaMultiplier(
                pulseAnchor = layer.spec.pulseAnchor,
                phase = phase,
                entranceT = entranceT,
                stablePulse = stablePulse,
                choreography = choreography,
            ).coerceIn(0f, 1.35f)
            Image(
                bitmap = layer.bitmap,
                contentDescription = null,
                contentScale = ContentScale.Fit,
                alpha = layerAlpha.coerceIn(0f, 1f),
                modifier = Modifier.fillMaxSize(),
            )
        }
    }
}
