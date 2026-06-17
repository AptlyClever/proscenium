package com.controlalt.hailoverlay

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PackageLayoutV2Test {

    @Test
    fun fromJson_parses_v2_package_layout() {
        val layoutRegions = JSONObject(
            """
            {
              "paint_box": { "left": 0, "top": 0, "width": 614, "height": 367 },
              "glyph_focus": {
                "left": 68, "top": 45, "width": 478, "height": 235,
                "center_x": 307, "center_y": 162
              },
              "transporter_beam_envelope": {
                "width": 296, "height": 352
              },
              "message_band": {
                "left": 68, "top": 280, "width": 478, "height": 46
              }
            }
            """.trimIndent(),
        )
        val paintBoxScreen = JSONObject(
            """
            { "left": 653, "top": 173, "width": 614, "height": 367, "placement_id": "upper_center" }
            """.trimIndent(),
        )
        val messageEntity = JSONObject(
            """
            {
              "text": "Hello TV",
              "sidekick_id": "secondary_fade",
              "entrance_ms": 480,
              "exit_ms": 360,
              "opacity": 0.92,
              "exit_offset_ms": 4640,
              "stable_hold_ms": 5000
            }
            """.trimIndent(),
        )

        val parsed = PackageLayoutV2.fromJson(
            packageSchemaVersion = 2,
            referenceViewport = JSONObject("""{ "width": 1920, "height": 1080 }"""),
            paintBoxScreen = paintBoxScreen,
            layoutRegions = layoutRegions,
            messageEntity = messageEntity,
            stableHoldMs = 5000L,
        )

        assertNotNull(parsed)
        assertEquals(653f, parsed!!.paintBoxLeft)
        assertEquals(173f, parsed.paintBoxTop)
        assertTrue(parsed.messageSidekick.useStablePhase)
        assertEquals(480L, parsed.messageSidekick.entranceMs)
        assertEquals(0.92f, parsed.messageSidekick.targetOpacity, 0.001f)
        assertEquals(478f * (614f / 614f), parsed.messageBandWidth, 0.01f)
    }

    @Test
    fun fromJson_returns_null_for_v1_payload() {
        val parsed = PackageLayoutV2.fromJson(
            packageSchemaVersion = 1,
            referenceViewport = null,
            paintBoxScreen = null,
            layoutRegions = null,
            messageEntity = null,
        )
        assertEquals(null, parsed)
    }
}
