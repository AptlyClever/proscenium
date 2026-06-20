package com.controlalt.hailoverlay

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale

enum class PresentationStageLayer {
    BACK,
    FRONT,
}

/** Fixed stage shell — back/front PNG layers inside the hail package (P1-3). */
@Composable
fun PresentationStageDisplay(
    template: PresentationTemplateSpec,
    layer: PresentationStageLayer,
    modifier: Modifier = Modifier,
    alpha: Float = 1f,
    scale: Float = 1f,
    transformOriginY: Float = 0.68f,
) {
    val role = when (layer) {
        PresentationStageLayer.BACK -> "back"
        PresentationStageLayer.FRONT -> "front"
    }
    val asset = template.stageAssets[role] ?: return
    val bitmap: ImageBitmap? = remember(asset.bitmapBase64) {
        runCatching {
            val bytes = Base64.decode(asset.bitmapBase64, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
        }.getOrNull()
    }
    if (bitmap != null) {
        Image(
            bitmap = bitmap,
            contentDescription = null,
            contentScale = ContentScale.Fit,
            modifier = modifier
                .fillMaxSize()
                .graphicsLayer {
                    this.alpha = alpha.coerceIn(0f, 1f)
                    scaleX = scale.coerceIn(0.5f, 1.2f)
                    scaleY = scale.coerceIn(0.5f, 1.2f)
                    transformOrigin = TransformOrigin(0.5f, transformOriginY)
                },
        )
    }
}
