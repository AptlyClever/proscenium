package com.controlalt.hailoverlay

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PalettePresentationTest {

    @Test
    fun fromJson_parses_kit_modifiers() {
        val json = JSONObject(
            """
            {
              "palette_id": "axiom_dark_cyan",
              "backdrop_tint": "#0A2E24",
              "package_scrim_opacity": 0.26,
              "message_backing_opacity": 0.64,
              "package_shadow_alpha": 0.36,
              "rim_glow_alpha": 0.14
            }
            """.trimIndent(),
        )
        val pres = PalettePresentation.fromJson(json, "axiom_dark_cyan")
        assertEquals(0.26f, pres.packageScrimOpacity, 0.001f)
        assertEquals(0.64f, pres.messageBackingOpacity, 0.001f)
        assertEquals(0.36f, pres.packageShadowAlpha, 0.001f)
        assertEquals(0.14f, pres.rimGlowAlpha, 0.001f)
    }

    @Test
    fun scrimColor_uses_backdrop_and_scrim_opacity() {
        val pres = PalettePresentation.fromJson(
            JSONObject("""{ "package_scrim_opacity": 0.34, "backdrop_tint": "#0A2E24" }"""),
            "axiom_dark_cyan",
        )
        assertEquals(pres.packageScrimOpacity, pres.scrimColor().alpha, 0.01f)
        assertTrue(pres.scrimColor().red > 0f)
    }
}
