package com.controlalt.hailoverlay

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

class MessageBandLayoutTest {

    @Test
    fun packageLayout_messageBand_offsets_within_paint_box() {
        val layoutRegions = JSONObject(
            """
            {
              "paint_box": { "left": 0, "top": 0, "width": 614, "height": 367 },
              "glyph_focus": {
                "left": 68, "top": 45, "width": 478, "height": 235,
                "center_x": 307, "center_y": 162
              },
              "transporter_beam_envelope": { "width": 296, "height": 352 },
              "message_band": { "left": 68, "top": 280, "width": 478, "height": 46 }
            }
            """.trimIndent(),
        )
        val paintBoxScreen = JSONObject(
            """{ "left": 653, "top": 173, "width": 614, "height": 367 }""",
        )
        val parsed = PackageLayoutV2.fromJson(
            packageSchemaVersion = 2,
            referenceViewport = JSONObject("""{ "width": 1920, "height": 1080 }"""),
            paintBoxScreen = paintBoxScreen,
            layoutRegions = layoutRegions,
            messageEntity = JSONObject("""{ "text": "Hello", "sidekick_id": "secondary_fade" }"""),
            stableHoldMs = 5000L,
        )!!

        val scaled = parsed.scaleToScreen(1920f, 1080f)
        val regions = scaled.toPaintBoxRegions(PaintBoxTier.MEDIUM)

        val offsetX = scaled.messageBandLeft - regions.paintBoxLeft
        val offsetY = scaled.messageBandTop - regions.paintBoxTop

        assertEquals(68f, offsetX, 0.5f)
        assertEquals(280f, offsetY, 0.5f)
        assertEquals(478f, scaled.messageBandWidth, 0.5f)
        assertEquals(46f, scaled.messageBandHeight, 0.5f)
    }
}
