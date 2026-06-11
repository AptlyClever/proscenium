package com.controlalt.hailoverlay

import androidx.compose.ui.Alignment

object Placement {
    const val MODE_PRESET = "preset"
    const val MODE_CUSTOM = "custom"
    const val MIN_PERCENT = 5f
    const val MAX_PERCENT = 95f

    val presetIds = setOf(
        "center_soft",
        "top_right",
        "bottom_right",
        "top_left",
        "bottom_left",
        "upper_center",
        "lower_center",
    )

    data class Resolved(
        val placementId: String,
        val placementMode: String,
        val alignment: Alignment,
        val xPercent: Float?,
        val yPercent: Float?,
    )

    fun resolve(
        placementId: String?,
        placementMode: String?,
        xPercent: Float?,
        yPercent: Float?,
    ): Result<Resolved> {
        val mode = placementMode?.trim()?.ifBlank { MODE_PRESET } ?: MODE_PRESET
        if (mode == MODE_CUSTOM) {
            if (xPercent == null || yPercent == null) {
                return Result.failure(IllegalArgumentException("custom placement requires x_percent and y_percent"))
            }
            if (xPercent !in MIN_PERCENT..MAX_PERCENT || yPercent !in MIN_PERCENT..MAX_PERCENT) {
                return Result.failure(
                    IllegalArgumentException("placement percents must be between ${MIN_PERCENT.toInt()} and ${MAX_PERCENT.toInt()}"),
                )
            }
            return Result.success(
                Resolved(
                    placementId = "custom",
                    placementMode = MODE_CUSTOM,
                    alignment = Alignment.TopStart,
                    xPercent = xPercent,
                    yPercent = yPercent,
                ),
            )
        }

        val preset = placementId?.trim().orEmpty()
        if (preset !in presetIds) {
            return Result.failure(IllegalArgumentException("placement_id not allowlisted"))
        }

        return Result.success(
            Resolved(
                placementId = preset,
                placementMode = MODE_PRESET,
                alignment = alignmentForPreset(preset),
                xPercent = null,
                yPercent = null,
            ),
        )
    }

    private fun alignmentForPreset(preset: String): Alignment {
        return when (preset) {
            "center_soft" -> Alignment.Center
            "top_right" -> Alignment.TopEnd
            "bottom_right" -> Alignment.BottomEnd
            "top_left" -> Alignment.TopStart
            "bottom_left" -> Alignment.BottomStart
            "upper_center" -> Alignment.TopCenter
            "lower_center" -> Alignment.BottomCenter
            else -> Alignment.TopCenter
        }
    }
}
