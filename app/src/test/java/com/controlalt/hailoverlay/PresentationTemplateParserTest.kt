package com.controlalt.hailoverlay

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class PresentationTemplateParserTest {
    @Test
    fun parse_delivery_template_with_inline_stage_assets() {
        val json = JSONObject(
            """
            {
              "template_id": "stage-breakout-v1",
              "label": "Breakout card stage",
              "stage_assets": {
                "back": {
                  "image_base64": "aW1hZ2U=",
                  "image_media_type": "image/png"
                },
                "front": {
                  "image_base64": "ZnJvbnQ=",
                  "image_media_type": "image/png"
                }
              },
              "glyph_motion": {
                "profile": "breakout_emerge",
                "resolve_style": "overshoot_pop"
              },
              "choreography_anchors": {
                "glyphResolveStart": 0.28,
                "glyphImpactPeak": 0.46,
                "glyphLockIn": 0.64,
                "messageRevealStart": 0.66
              }
            }
            """.trimIndent(),
        )
        val template = PresentationTemplateParser.parse(json)
        assertNotNull(template)
        assertEquals("stage-breakout-v1", template?.templateId)
        assertEquals("breakout_emerge", template?.glyphMotionProfile)
        assertEquals(0.46f, template?.choreographyAnchors?.get("glyphImpactPeak"))
        assertEquals("aW1hZ2U=", template?.stageAssets?.get("back")?.bitmapBase64)
        assertEquals("ZnJvbnQ=", template?.stageAssets?.get("front")?.bitmapBase64)
    }

    @Test
    fun parse_rejects_template_without_stage_assets() {
        val json = JSONObject("""{"template_id":"stage-empty-v1","stage_assets":{}}""")
        assertNull(PresentationTemplateParser.parse(json))
    }

    @Test
    fun merge_choreography_into_effect_identity() {
        val effectIdentity = JSONObject()
        val template = PresentationTemplateSpec(
            templateId = "stage-breakout-v1",
            label = "Breakout",
            stageAssets = mapOf(
                "back" to PresentationStageAssetSpec(
                    role = "back",
                    bitmapBase64 = "aW1hZ2U=",
                    mediaType = "image/png",
                ),
            ),
            glyphMotionProfile = "breakout_emerge",
            glyphResolveStyle = "overshoot_pop",
            choreographyAnchors = mapOf(
                "glyphImpactPeak" to 0.46f,
                "messageRevealStart" to 0.66f,
            ),
        )
        val merged = PresentationTemplateParser.mergeChoreographyIntoIdentity(effectIdentity, template)
        val anchors = merged?.getJSONObject("choreography_anchors")
        assertEquals(0.46, anchors?.getDouble("glyphImpactPeak") ?: 0.0, 0.001)
        assertEquals(0.66, anchors?.getDouble("messageRevealStart") ?: 0.0, 0.001)
    }

    @Test
    fun hail_show_request_parses_presentation_template() {
        val json = """
            {
              "hail_id": "hail.fleet_beacon.001",
              "effect_id": "transporter_beam",
              "glyph_id": "custom-fleet-beacon",
              "palette_id": "axiom_dark_cyan",
              "message": "Achievement unlocked",
              "duration_ms": 5000,
              "placement_id": "upper_center",
              "placement_mode": "preset",
              "broker_proof": "unused",
              "presentation_template": {
                "template_id": "stage-breakout-v1",
                "stage_assets": {
                  "back": {"image_base64": "aW1hZ2U="}
                },
                "choreography_anchors": {
                  "glyphImpactPeak": 0.46
                }
              },
              "effect_identity": {
                "choreography_anchors": {
                  "glyphImpactPeak": 0.74
                }
              },
              "glyph_render": {
                "kind": "image_layers",
                "layers": [
                  {"role": "mass", "image_base64": "aW1hZ2U=", "z_index": 0}
                ]
              }
            }
        """.trimIndent()
        val request = HailShowRequest.fromJson(json).getOrThrow()
        assertEquals("stage-breakout-v1", request.presentationTemplate?.templateId)
        assertEquals(0.46f, request.choreography.glyphImpactPeak)
    }
}
