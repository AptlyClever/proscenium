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
    fun fromJson_prefers_glyph_art_for_draw_dimensions() {
        val layoutRegions = JSONObject(
            """
            {
              "paint_box": { "left": 0, "top": 0, "width": 614, "height": 367 },
              "glyph_focus": {
                "left": 210, "top": 91, "width": 192, "height": 183,
                "center_x": 307, "center_y": 183
              },
              "glyph_art": {
                "left": 226, "top": 102, "width": 161, "height": 161,
                "center_x": 307, "center_y": 183
              },
              "effect_field": {
                "left": 203, "top": 58, "width": 208, "height": 250,
                "center_x": 307, "center_y": 183
              },
              "transporter_beam_envelope": {
                "left": 203, "top": 58, "width": 208, "height": 250,
                "center_x": 307, "center_y": 183
              },
              "message_band": {
                "left": 210, "top": 275, "width": 192, "height": 36
              }
            }
            """.trimIndent(),
        )
        val paintBoxScreen = JSONObject(
            """
            { "left": 653, "top": 173, "width": 614, "height": 367, "placement_id": "upper_center" }
            """.trimIndent(),
        )

        val parsed = PackageLayoutV2.fromJson(
            packageSchemaVersion = 2,
            referenceViewport = JSONObject("""{ "width": 1920, "height": 1080 }"""),
            paintBoxScreen = paintBoxScreen,
            layoutRegions = layoutRegions,
            messageEntity = null,
        )

        assertNotNull(parsed)
        assertEquals(161f, parsed!!.glyphWidth, 0.01f)
        assertEquals(161f, parsed.glyphHeight, 0.01f)
        assertEquals(208f, parsed.beamWidth, 0.01f)
    }

    @Test
    fun fromJson_parses_stick_oled_glyph_focus_dimensions() {
        val layoutRegions = JSONObject(
            """
            {
              "paint_box": { "left": 0, "top": 0, "width": 652.8, "height": 453.6 },
              "glyph_focus": {
                "left": 169.728, "top": 110.6784, "width": 313.344, "height": 232.2432,
                "center_x": 326.4, "center_y": 226.8
              },
              "effect_field": {
                "left": 157.19424, "top": 45.36, "width": 338.41152, "height": 362.88,
                "center_x": 326.4, "center_y": 226.8
              },
              "message_band": {
                "left": 169.728, "top": 342.9216, "width": 313.344, "height": 44.4528
              }
            }
            """.trimIndent(),
        )
        val paintBoxScreen = JSONObject(
            """
            { "left": 633.6, "top": 129.6, "width": 652.8, "height": 453.6, "placement_id": "upper_center" }
            """.trimIndent(),
        )

        val parsed = PackageLayoutV2.fromJson(
            packageSchemaVersion = 2,
            referenceViewport = JSONObject("""{ "width": 1920, "height": 1080 }"""),
            paintBoxScreen = paintBoxScreen,
            layoutRegions = layoutRegions,
            messageEntity = null,
        )

        assertNotNull(parsed)
        assertEquals(313.344f, parsed!!.glyphWidth, 0.01f)
        assertEquals(232.2432f, parsed.glyphHeight, 0.01f)
        assertEquals(960f, parsed.glyphCenterX, 0.01f)
        assertEquals(
            parsed.glyphCenterX,
            parsed.messageBandLeft + parsed.messageBandWidth / 2f,
            0.01f,
        )
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
