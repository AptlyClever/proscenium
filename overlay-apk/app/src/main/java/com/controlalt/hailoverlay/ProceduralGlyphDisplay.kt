package com.controlalt.hailoverlay

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp

@Composable
fun ProceduralGlyphDisplay(
    graph: ProceduralGraphSpec,
    alpha: Float,
    size: Dp,
    tint: Color = Color.White,
    modifier: Modifier = Modifier,
) {
    val glyphAlpha = alpha.coerceIn(0f, 1f)
    val parsedPaths = remember(graph.signature, graph.paths) {
        graph.paths.map { spec ->
            spec to PathParser().parsePathString(spec.d).toPath()
        }
    }
    Canvas(modifier = modifier.size(size)) {
        val scale = this.size.minDimension / 48f
        val matrix = androidx.compose.ui.graphics.Matrix().apply {
            scale(scale, scale)
        }

        parsedPaths.forEach { (spec, path) ->
            val transformed = Path().apply {
                addPath(path)
                transform(matrix)
            }
            val ink = tint.copy(alpha = glyphAlpha * spec.opacity.coerceIn(0f, 1f))
            if (spec.fill != ProceduralFillMode.NONE) {
                drawPath(path = transformed, color = ink, style = Fill)
            }
            if (spec.strokeWidth > 0f) {
                drawPath(
                    path = transformed,
                    color = ink,
                    style = Stroke(
                        width = spec.strokeWidth * scale,
                        cap = spec.strokeLineCap.toComposeCap(),
                        join = spec.strokeLineJoin.toComposeJoin(),
                    ),
                )
            }
        }

        graph.circles.forEach { circle ->
            if (circle.fill == ProceduralFillMode.NONE || circle.r <= 0f) {
                return@forEach
            }
            val ink = tint.copy(alpha = glyphAlpha * circle.opacity.coerceIn(0f, 1f))
            drawCircle(
                color = ink,
                radius = circle.r * scale,
                center = Offset(circle.cx * scale, circle.cy * scale),
            )
        }
    }
}

private fun ProceduralStrokeLineCap.toComposeCap(): StrokeCap {
    return when (this) {
        ProceduralStrokeLineCap.BUTT -> StrokeCap.Butt
        ProceduralStrokeLineCap.SQUARE -> StrokeCap.Square
        ProceduralStrokeLineCap.ROUND -> StrokeCap.Round
    }
}

private fun ProceduralStrokeLineJoin.toComposeJoin(): StrokeJoin {
    return when (this) {
        ProceduralStrokeLineJoin.MITER -> StrokeJoin.Miter
        ProceduralStrokeLineJoin.BEVEL -> StrokeJoin.Bevel
        ProceduralStrokeLineJoin.ROUND -> StrokeJoin.Round
    }
}
