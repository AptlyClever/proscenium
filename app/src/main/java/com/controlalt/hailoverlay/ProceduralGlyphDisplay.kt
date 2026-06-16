package com.controlalt.hailoverlay

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp

@Composable
fun ProceduralGlyphDisplay(
    graph: ProceduralGraphSpec,
    alpha: Float,
    size: Dp,
    tint: Color = Color.White,
) {
    val glyphAlpha = alpha.coerceIn(0f, 1f)
    Canvas(modifier = Modifier.size(size)) {
        val scale = this.size.minDimension / 48f
        graph.paths.forEach { spec ->
            val path = PathParser().parsePathString(spec.d).toPath()
            val matrix = androidx.compose.ui.graphics.Matrix()
            matrix.scale(scale, scale)
            path.transform(matrix)
            drawPath(
                path = path,
                color = tint.copy(alpha = glyphAlpha * spec.opacity.coerceIn(0f, 1f)),
                style = Stroke(width = spec.strokeWidth * scale),
            )
        }
    }
}
