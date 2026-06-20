package com.controlalt.hailoverlay

import kotlin.math.pow

/**
 * Basic breakout stage motion — card frame scales/fades with package lifecycle.
 * Pairs with [PresentationTemplateSpec.glyphMotionProfile] `breakout_emerge`.
 */
object BreakoutStageMotion {

    data class Frame(
        val alpha: Float,
        val scale: Float,
    ) {
        companion object {
            val Identity = Frame(alpha = 1f, scale = 1f)
        }
    }

    fun frame(
        phase: TransporterPhase,
        entranceT: Float,
        exitElapsed: Float,
        glyphAlpha: Float = 1f,
        glyphResolveStart: Float = 0.28f,
    ): Frame {
        return when (phase) {
            TransporterPhase.ENTRANCE -> {
                val resolveStart = glyphResolveStart.coerceIn(0f, 0.85f)
                val localT = if (entranceT <= resolveStart) {
                    0f
                } else {
                    ((entranceT - resolveStart) / (1f - resolveStart).coerceAtLeast(0.05f))
                        .coerceIn(0f, 1f)
                }
                val t = easeOutCubic(localT)
                Frame(
                    alpha = t,
                    scale = 0.68f + 0.32f * t,
                )
            }
            TransporterPhase.STABLE -> Frame.Identity
            TransporterPhase.EXIT, TransporterPhase.CLEARED -> {
                val t = easeInCubic(exitElapsed.coerceIn(0f, 1f))
                val exitAlpha = 1f - t
                val coupledAlpha = minOf(exitAlpha, glyphAlpha.coerceIn(0f, 1f))
                Frame(
                    alpha = coupledAlpha,
                    scale = 1f - 0.14f * t,
                )
            }
        }
    }

    fun forPopPhase(
        entranceT: Float,
        exitElapsed: Float,
        isEntrance: Boolean,
        isExit: Boolean,
    ): Frame {
        return when {
            isEntrance -> frame(TransporterPhase.ENTRANCE, entranceT, 0f)
            isExit -> frame(TransporterPhase.EXIT, 0f, exitElapsed)
            else -> Frame.Identity
        }
    }

    private fun easeOutCubic(t: Float): Float {
        return 1f - (1f - t).pow(3)
    }

    private fun easeInCubic(t: Float): Float {
        return t * t * t
    }
}
