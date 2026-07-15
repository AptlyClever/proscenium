package com.controlalt.hailoverlay

import androidx.compose.ui.graphics.Color
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

internal fun parseHexColor(hex: String?, fallback: Color = Color.White): Color {
    if (hex.isNullOrBlank()) return fallback
    return runCatching {
        val clean = hex.removePrefix("#")
        val argb = if (clean.length == 6) "FF$clean" else clean
        Color(argb.toLong(16).toInt())
    }.getOrDefault(fallback)
}

internal fun parseSymbolIcons(json: JSONObject?): Map<String, Pair<ProceduralGraphSpec, Color>> {
    if (json == null) return emptyMap()
    val result = mutableMapOf<String, Pair<ProceduralGraphSpec, Color>>()
    val keys = json.keys()
    while (keys.hasNext()) {
        val symbolId = keys.next()
        val iconJson = json.optJSONObject(symbolId) ?: continue
        val graph = ProceduralGlyphParser.parseGraph(iconJson) ?: continue
        result[symbolId] = graph to parseHexColor(iconJson.optString("tint"))
    }
    return result
}

class SlotsOverlaySymbolIconsTest {
    // Matches Bandit's real SlotGame.symbol_icons response shape
    // (backend/bandit_slots_domain.py's SymbolGlyphSpec), not a synthetic
    // fixture -- catches drift if either side's field names change.
    private val realCatFixture = """
        {
          "cat": {
            "version": 1,
            "tint": "#F6F1E8",
            "paths": [
              {"d": "M6 10l2-6 3 5z", "fill": "currentColor", "stroke_width": 2.5, "opacity": 1.0, "stroke_linecap": "round", "stroke_linejoin": "round"},
              {"d": "M18 10l-2-6-3 5z", "fill": "currentColor", "stroke_width": 2.5, "opacity": 1.0, "stroke_linecap": "round", "stroke_linejoin": "round"}
            ],
            "circles": [
              {"cx": 12.0, "cy": 14.0, "r": 6.0, "fill": "currentColor", "opacity": 0.9}
            ]
          },
          "bar": {
            "version": 1,
            "tint": "#C9CCD6",
            "paths": [
              {"d": "M3 10a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z", "fill": "currentColor", "stroke_width": 2.5, "opacity": 1.0, "stroke_linecap": "round", "stroke_linejoin": "round"}
            ],
            "circles": []
          }
        }
    """.trimIndent()

    @Test
    fun parses_every_symbol_and_its_paths_circles_tint() {
        val icons = parseSymbolIcons(JSONObject(realCatFixture))
        assertEquals(setOf("cat", "bar"), icons.keys)

        val (catGraph, catTint) = icons.getValue("cat")
        assertEquals(2, catGraph.paths.size)
        assertEquals(1, catGraph.circles.size)
        assertEquals(0xFFF6F1E8.toInt(), catTint.toArgb())

        val (barGraph, barTint) = icons.getValue("bar")
        assertEquals(1, barGraph.paths.size)
        assertEquals(0, barGraph.circles.size)
        assertEquals(0xFFC9CCD6.toInt(), barTint.toArgb())
    }

    @Test
    fun returns_empty_map_for_null_or_missing_symbol_icons() {
        assertTrue(parseSymbolIcons(null).isEmpty())
        assertTrue(parseSymbolIcons(JSONObject("{}")).isEmpty())
    }

    @Test
    fun skips_entries_that_fail_to_parse_as_a_graph_without_crashing() {
        val icons = parseSymbolIcons(JSONObject("""{"broken": {"not_a_graph": true}}"""))
        assertTrue(icons.isEmpty())
    }

    @Test
    fun parseHexColor_handles_hash_prefix_and_missing_alpha() {
        assertEquals(0xFFFFD700.toInt(), parseHexColor("#FFD700").toArgb())
        assertEquals(0xFFFFD700.toInt(), parseHexColor("FFD700").toArgb())
    }

    @Test
    fun parseHexColor_falls_back_on_garbage_input() {
        val fallback = Color.Red
        assertEquals(fallback, parseHexColor("not-a-color", fallback))
        assertEquals(fallback, parseHexColor(null, fallback))
        assertEquals(fallback, parseHexColor("", fallback))
    }
}

// Plain Kotlin math on Compose Color's own float components -- deliberately
// avoids android.graphics.Color, which isn't mocked/available in these plain
// JVM unit tests (no Robolectric configured here).
private fun Color.toArgb(): Int {
    fun component(v: Float) = (v * 255f + 0.5f).toInt().coerceIn(0, 255)
    return (component(alpha) shl 24) or (component(red) shl 16) or (component(green) shl 8) or component(blue)
}
