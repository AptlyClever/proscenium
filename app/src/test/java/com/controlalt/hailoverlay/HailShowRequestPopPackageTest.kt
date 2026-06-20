package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HailShowRequestPopPackageTest {

    @Test
    fun fromJson_parses_pop_package_v2_layout() {
        val json = """
            {
              "hail_id": "hail.variety.pop.messagefix.001",
              "effect_id": "pop",
              "glyph_id": "default",
              "palette_id": "axiom_dark_cyan",
              "message": "POP - glyph message hold 5s",
              "duration_ms": 5000,
              "placement_id": "upper_center",
              "placement_mode": "preset",
              "size_tier": "medium",
              "broker_proof": "placeholder",
              "package_schema_version": 2,
              "reference_viewport": { "width": 1920, "height": 1080 },
              "paint_box_screen": {
                "left": 633.6, "top": 129.6, "width": 652.8, "height": 453.6,
                "placement_id": "upper_center", "paint_box_tier": "medium"
              },
              "layout_regions": {
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
              },
              "message_entity": {
                "text": "POP - glyph message hold 5s",
                "sidekick_id": "message_band_fade",
                "entrance_ms": 480,
                "exit_ms": 360,
                "opacity": 0.92,
                "entrance_offset_ms": 0,
                "exit_offset_ms": 4640,
                "stable_hold_ms": 5000
              },
              "palette_presentation": {
                "palette_id": "axiom_dark_cyan",
                "package_scrim_opacity": 0.2,
                "message_backing_opacity": 0.5,
                "message_color": "#F0FAF6",
                "message_backing": "#121618"
              },
              "lifecycle_timing": {
                "entrance_animation_ms": 680,
                "exit_animation_ms": 400,
                "stable_hold_ms": 5000
              },
              "effect_identity": {
                "glyph_resolve_style": "overshoot_pop",
                "field_style": "micro_flash",
                "particle_style": "tiny_sparks",
                "choreography_anchors": {
                  "effectStart": 0,
                  "glyphImpactPeak": 0.4,
                  "glyphLockIn": 0.6,
                  "glyphResolveStart": 0.08,
                  "messageRevealStart": 0.58,
                  "stableReady": 0.75
                }
              }
            }
        """.trimIndent()

        val request = HailShowRequest.fromJson(json).getOrThrow()
        assertNotNull(request.packageLayout)
        assertEquals(680L, request.lifecycleTiming.entranceMs)
        assertTrue(request.packageLayout!!.messageSidekick.useStablePhase)
        val stableFrame = PopLifecycle.computeStableFrame(
            messageSidekick = request.packageLayout!!.messageSidekick,
            stableElapsedMs = 2000L,
            stablePulse = 0.5f,
        )
        assertTrue(stableFrame.glyphAlpha > 0.9f)
        assertTrue(stableFrame.messageAlpha > 0.5f)
    }
}
