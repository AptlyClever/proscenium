package com.controlalt.hailoverlay

import org.json.JSONObject

/**
 * Authoritative hail package layout from Axiom (package_schema_version 2).
 * paint_box_screen is reference-viewport pixels; layout_regions are paint-box-local.
 */
data class PackageLayoutV2(
    val packageSchemaVersion: Int,
    val referenceWidth: Float,
    val referenceHeight: Float,
    val paintBoxLeft: Float,
    val paintBoxTop: Float,
    val paintBoxWidth: Float,
    val paintBoxHeight: Float,
    val glyphCenterX: Float,
    val glyphCenterY: Float,
    val glyphWidth: Float,
    val glyphHeight: Float,
    val beamWidth: Float,
    val beamHeight: Float,
    val messageBandLeft: Float,
    val messageBandTop: Float,
    val messageBandWidth: Float,
    val messageBandHeight: Float,
    val messageSidekick: MessageSidekickTiming,
) {
    companion object {
        fun fromJson(
            packageSchemaVersion: Int,
            referenceViewport: JSONObject?,
            paintBoxScreen: JSONObject?,
            layoutRegions: JSONObject?,
            messageEntity: JSONObject?,
            stableHoldMs: Long = 5000L,
        ): PackageLayoutV2? {
            if (packageSchemaVersion < 2 || paintBoxScreen == null || layoutRegions == null) {
                return null
            }
            val refW = referenceViewport?.optDouble("width")?.toFloat() ?: 1920f
            val refH = referenceViewport?.optDouble("height")?.toFloat() ?: 1080f
            val glyphFocus = layoutRegions.optJSONObject("glyph_focus") ?: return null
            val effectField = layoutRegions.optJSONObject("effect_field")
            val beam = effectField
                ?: layoutRegions.optJSONObject("transporter_beam_envelope")
                ?: return null
            val messageBand = layoutRegions.optJSONObject("message_band")
            val boxW = layoutRegions.optJSONObject("paint_box")?.optDouble("width")?.toFloat()
                ?: paintBoxScreen.optDouble("width").toFloat()
            val boxH = layoutRegions.optJSONObject("paint_box")?.optDouble("height")?.toFloat()
                ?: paintBoxScreen.optDouble("height").toFloat()
            val localScaleX = if (boxW > 0f) {
                paintBoxScreen.optDouble("width").toFloat() / boxW
            } else {
                1f
            }
            val localScaleY = if (boxH > 0f) {
                paintBoxScreen.optDouble("height").toFloat() / boxH
            } else {
                1f
            }

            fun localX(value: Double): Float = paintBoxScreen.optDouble("left").toFloat() +
                value.toFloat() * localScaleX
            fun localY(value: Double): Float = paintBoxScreen.optDouble("top").toFloat() +
                value.toFloat() * localScaleY

            return PackageLayoutV2(
                packageSchemaVersion = packageSchemaVersion,
                referenceWidth = refW,
                referenceHeight = refH,
                paintBoxLeft = paintBoxScreen.optDouble("left").toFloat(),
                paintBoxTop = paintBoxScreen.optDouble("top").toFloat(),
                paintBoxWidth = paintBoxScreen.optDouble("width").toFloat(),
                paintBoxHeight = paintBoxScreen.optDouble("height").toFloat(),
                glyphCenterX = localX(glyphFocus.optDouble("center_x")),
                glyphCenterY = localY(glyphFocus.optDouble("center_y")),
                glyphWidth = glyphFocus.optDouble("width").toFloat() * localScaleX,
                glyphHeight = glyphFocus.optDouble("height").toFloat() * localScaleX,
                beamWidth = beam.optDouble("width").toFloat() * localScaleX,
                beamHeight = beam.optDouble("height").toFloat() * localScaleX,
                messageBandLeft = messageBand?.let { localX(it.optDouble("left")) }
                    ?: localX(glyphFocus.optDouble("left")),
                messageBandTop = messageBand?.let { localY(it.optDouble("top")) }
                    ?: localY(glyphFocus.optDouble("top") + glyphFocus.optDouble("height")),
                messageBandWidth = messageBand?.optDouble("width")?.toFloat()?.times(localScaleX)
                    ?: glyphFocus.optDouble("width").toFloat() * localScaleX,
                messageBandHeight = messageBand?.optDouble("height")?.toFloat()?.times(localScaleY)
                    ?: 48f,
                messageSidekick = MessageSidekickTiming.fromJson(
                    messageEntity,
                    stableHoldMs,
                    forceStablePhase = packageSchemaVersion >= 2,
                ),
            )
        }
    }

    fun scaleToScreen(screenWidthPx: Float, screenHeightPx: Float): PackageLayoutV2 {
        val scaleX = screenWidthPx / referenceWidth
        val scaleY = screenHeightPx / referenceHeight
        return copy(
            paintBoxLeft = paintBoxLeft * scaleX,
            paintBoxTop = paintBoxTop * scaleY,
            paintBoxWidth = paintBoxWidth * scaleX,
            paintBoxHeight = paintBoxHeight * scaleY,
            glyphCenterX = glyphCenterX * scaleX,
            glyphCenterY = glyphCenterY * scaleY,
            glyphWidth = glyphWidth * scaleX,
            glyphHeight = glyphHeight * scaleY,
            beamWidth = beamWidth * scaleX,
            beamHeight = beamHeight * scaleY,
            messageBandLeft = messageBandLeft * scaleX,
            messageBandTop = messageBandTop * scaleY,
            messageBandWidth = messageBandWidth * scaleX,
            messageBandHeight = messageBandHeight * scaleY,
        )
    }

    fun toPaintBoxRegions(tier: PaintBoxTier): PaintBoxLayout.Regions {
        val safeLeft = paintBoxLeft + paintBoxWidth * tier.safeZoneInsetFraction
        val safeTop = paintBoxTop + paintBoxHeight * tier.safeZoneInsetFraction
        val safeW = paintBoxWidth * (1f - tier.safeZoneInsetFraction * 2f)
        val safeH = paintBoxHeight * (1f - tier.safeZoneInsetFraction * 2f)
        val glyphH = safeH * tier.glyphFocusFraction
        val fallbackBeamH = minOf(safeH, glyphH * tier.transporterBeamHeightMultiplier)
        val fallbackBeamW = minOf(
            safeW * TransporterContract.BEAM_WIDTH_SAFE_ZONE_FRACTION,
            glyphWidth * TransporterContract.BEAM_WIDTH_GLYPH_FRACTION,
        )
        val resolvedBeamW = if (beamWidth >= 8f) beamWidth else fallbackBeamW
        val resolvedBeamH = if (beamHeight >= 8f) beamHeight else fallbackBeamH
        return PaintBoxLayout.Regions(
            paintBoxLeft = paintBoxLeft,
            paintBoxTop = paintBoxTop,
            paintBoxWidth = paintBoxWidth,
            paintBoxHeight = paintBoxHeight,
            safeZoneLeft = safeLeft,
            safeZoneTop = safeTop,
            safeZoneWidth = safeW,
            safeZoneHeight = safeH,
            glyphCenterX = glyphCenterX,
            glyphCenterY = glyphCenterY,
            beamWidth = resolvedBeamW,
            beamHeight = resolvedBeamH,
            glyphVisualSizePx = glyphHeight,
            glyphVisualTopY = glyphCenterY - glyphHeight / 2f,
            glyphVisualCenterY = glyphCenterY,
            contentFootY = messageBandTop + messageBandHeight,
            tier = tier,
        )
    }
}
