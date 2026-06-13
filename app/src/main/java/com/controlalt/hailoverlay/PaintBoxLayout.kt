package com.controlalt.hailoverlay

/**
 * Resolves Paint Box + Safe Effect Zone rects on screen for a hail size tier.
 * Mirrors LCARD web-preview placement.js + effect-config layout regions.
 */
object PaintBoxLayout {

    data class Regions(
        val paintBoxLeft: Float,
        val paintBoxTop: Float,
        val paintBoxWidth: Float,
        val paintBoxHeight: Float,
        val safeZoneLeft: Float,
        val safeZoneTop: Float,
        val safeZoneWidth: Float,
        val safeZoneHeight: Float,
        val glyphCenterX: Float,
        val glyphCenterY: Float,
        val beamWidth: Float,
        val beamHeight: Float,
        val glyphVisualSizePx: Float,
        val tier: PaintBoxTier,
    )

    fun resolve(
        screenWidthPx: Float,
        screenHeightPx: Float,
        placement: Placement.Resolved,
        tier: PaintBoxTier = PaintBoxTier.MEDIUM,
    ): Regions {
        val boxW = screenWidthPx * tier.widthFraction
        val boxH = screenHeightPx * tier.heightFraction

        val (left, top) = if (placement.placementMode == Placement.MODE_CUSTOM) {
            val x = (placement.xPercent ?: 50f) / 100f
            val y = (placement.yPercent ?: 50f) / 100f
            Pair(screenWidthPx * x - boxW / 2f, screenHeightPx * y - boxH / 2f)
        } else {
            paintBoxOriginForPreset(
                placementId = placement.placementId,
                screenWidthPx = screenWidthPx,
                screenHeightPx = screenHeightPx,
                boxW = boxW,
                boxH = boxH,
            )
        }

        val inset = tier.safeZoneInsetFraction
        val safeW = boxW * (1f - inset * 2f)
        val safeH = boxH * (1f - inset * 2f)
        val safeLeft = left + boxW * inset
        val safeTop = top + boxH * inset

        val glyphH = safeH * tier.glyphFocusFraction
        val glyphW = minOf(safeW, glyphH * TransporterContract.GLYPH_WIDTH_ASPECT)
        val glyphTop = safeTop + safeH * TransporterContract.GLYPH_FOCUS_TOP_FRACTION
        val glyphCenterX = safeLeft + safeW / 2f
        val glyphCenterY = glyphTop + glyphH / 2f

        val beamH = minOf(safeH, glyphH * tier.transporterBeamHeightMultiplier)
        val beamW = minOf(
            safeW * TransporterContract.BEAM_WIDTH_SAFE_ZONE_FRACTION,
            glyphW * TransporterContract.BEAM_WIDTH_GLYPH_FRACTION,
        )
        val glyphVisualSizePx = maxOf(
            tier.glyphVisualSizeFloorPx,
            boxH * tier.glyphVisualFraction,
        )

        return Regions(
            paintBoxLeft = left,
            paintBoxTop = top,
            paintBoxWidth = boxW,
            paintBoxHeight = boxH,
            safeZoneLeft = safeLeft,
            safeZoneTop = safeTop,
            safeZoneWidth = safeW,
            safeZoneHeight = safeH,
            glyphCenterX = glyphCenterX,
            glyphCenterY = glyphCenterY,
            beamWidth = beamW,
            beamHeight = beamH,
            glyphVisualSizePx = glyphVisualSizePx,
            tier = tier,
        )
    }

    private fun paintBoxOriginForPreset(
        placementId: String,
        screenWidthPx: Float,
        screenHeightPx: Float,
        boxW: Float,
        boxH: Float,
    ): Pair<Float, Float> {
        val padStart = screenWidthPx * TransporterContract.HORIZONTAL_INSET_FRACTION
        val padEnd = padStart
        val padTop = screenHeightPx * TransporterContract.TOP_INSET_FRACTION
        val padBottom = screenHeightPx * TransporterContract.BOTTOM_INSET_FRACTION

        var left = padStart
        var top = padTop + when (placementId) {
            "upper_center" -> screenHeightPx * TransporterContract.UPPER_CENTER_EXTRA_TOP_FRACTION
            else -> 0f
        }

        when (placementId) {
            "top_right", "bottom_right" -> left = screenWidthPx - padEnd - boxW
            "upper_center", "lower_center", "center_soft" -> left = (screenWidthPx - boxW) / 2f
            "top_left", "bottom_left" -> left = padStart
            else -> left = (screenWidthPx - boxW) / 2f
        }

        when (placementId) {
            "bottom_right", "bottom_left", "lower_center" -> top = screenHeightPx - padBottom - boxH
            "center_soft" -> top = (screenHeightPx - boxH) / 2f
            else -> { /* keep computed top */ }
        }

        return Pair(left, top)
    }
}
