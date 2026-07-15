package com.controlalt.hailoverlay

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class ProceduralGlyphParserTest {
    @Test
    fun parseGraph_reads_fill_stroke_caps_and_circles() {
        val json = JSONObject(
            """
            {
              "version": 1,
              "signature": "probe-circles-v1",
              "paths": [
                {
                  "d": "M14 34 L24 12 L34 34 Z",
                  "stroke_width": 2.0,
                  "opacity": 0.35,
                  "fill": "currentColor",
                  "stroke_linecap": "round",
                  "stroke_linejoin": "round"
                },
                {
                  "d": "M14 24 L34 24",
                  "stroke_width": 4.0,
                  "opacity": 1.0,
                  "fill": "none",
                  "stroke_linecap": "butt"
                }
              ],
              "circles": [
                { "cx": 20, "cy": 22, "r": 2.5, "fill": "currentColor", "opacity": 0.9 }
              ]
            }
            """.trimIndent(),
        )

        val graph = ProceduralGlyphParser.parseGraph(json)
        assertNotNull(graph)
        requireNotNull(graph)

        assertEquals("probe-circles-v1", graph.signature)
        assertEquals(2, graph.paths.size)
        assertEquals(ProceduralFillMode.CURRENT_COLOR, graph.paths[0].fill)
        assertEquals(ProceduralStrokeLineCap.ROUND, graph.paths[0].strokeLineCap)
        assertEquals(ProceduralFillMode.NONE, graph.paths[1].fill)
        assertEquals(ProceduralStrokeLineCap.BUTT, graph.paths[1].strokeLineCap)

        assertEquals(1, graph.circles.size)
        assertEquals(20f, graph.circles[0].cx)
        assertEquals(22f, graph.circles[0].cy)
        assertEquals(2.5f, graph.circles[0].r)
        assertEquals(0.9f, graph.circles[0].opacity)
    }

    @Test
    fun parseGraph_accepts_circles_only_graph() {
        val json = JSONObject(
            """
            {
              "version": 1,
              "paths": [],
              "circles": [
                { "cx": 24, "cy": 24, "r": 3, "opacity": 1.0 }
              ]
            }
            """.trimIndent(),
        )

        val graph = ProceduralGlyphParser.parseGraph(json)
        assertNotNull(graph)
        assertEquals(0, graph!!.paths.size)
        assertEquals(1, graph.circles.size)
    }

    @Test
    fun parseGraph_rejects_empty_graph() {
        val json = JSONObject("""{"version":1,"paths":[],"circles":[]}""")
        assertNull(ProceduralGlyphParser.parseGraph(json))
    }

    @Test
    fun parseFillMode_treats_none_as_no_fill() {
        assertEquals(ProceduralFillMode.NONE, ProceduralGlyphParser.parseFillMode("none"))
        assertEquals(ProceduralFillMode.CURRENT_COLOR, ProceduralGlyphParser.parseFillMode("currentColor"))
    }

    @Test
    fun parseImageLayersGlyphRender_reads_roles_and_pulse_anchor() {
        val json = JSONObject(
            """
            {
              "kind": "image_layers",
              "layers": [
                {
                  "role": "mass",
                  "path": "mass.png",
                  "z_index": 0,
                  "image_base64": "aW1hZ2U=",
                  "image_media_type": "image/png"
                },
                {
                  "role": "accent",
                  "path": "accent.png",
                  "z_index": 1,
                  "pulse_anchor": "glyphImpactPeak",
                  "image_base64": "aW1hZ2Uy"
                }
              ]
            }
            """.trimIndent(),
        )

        val layers = ProceduralGlyphParser.parseImageLayersGlyphRender(json)
        assertNotNull(layers)
        requireNotNull(layers)
        assertEquals(2, layers.layers.size)
        assertEquals("mass", layers.layers[0].role)
        assertEquals("accent", layers.layers[1].role)
        assertEquals("glyphImpactPeak", layers.layers[1].pulseAnchor)
    }

    @Test
    fun parseImageLayersGlyphRender_rejects_empty_layers() {
        val json = JSONObject("""{"kind":"image_layers","layers":[]}""")
        assertNull(ProceduralGlyphParser.parseImageLayersGlyphRender(json))
    }
}
