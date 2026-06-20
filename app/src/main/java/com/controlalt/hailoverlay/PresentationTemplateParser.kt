package com.controlalt.hailoverlay

import org.json.JSONObject

data class PresentationStageAssetSpec(
    val role: String,
    val bitmapBase64: String,
    val mediaType: String,
)

data class PresentationTemplateSpec(
    val templateId: String,
    val label: String,
    val stageAssets: Map<String, PresentationStageAssetSpec>,
    val glyphMotionProfile: String,
    val glyphResolveStyle: String,
    val choreographyAnchors: Map<String, Float>,
)

object PresentationTemplateParser {
    fun parse(json: JSONObject?): PresentationTemplateSpec? {
        if (json == null) {
            return null
        }
        val templateId = json.optString("template_id").trim()
        if (templateId.isEmpty()) {
            return null
        }
        val stageAssets = parseStageAssets(json.optJSONObject("stage_assets"))
        if (stageAssets.isEmpty()) {
            return null
        }
        val glyphMotion = json.optJSONObject("glyph_motion")
        val anchorsJson = json.optJSONObject("choreography_anchors")
        val anchors = mutableMapOf<String, Float>()
        if (anchorsJson != null) {
            for (key in listOf(
                    "glyphResolveStart",
                    "glyphImpactPeak",
                    "glyphLockIn",
                    "messageRevealStart",
                )
            ) {
                if (anchorsJson.has(key)) {
                    anchors[key] = anchorsJson.optDouble(key).toFloat()
                }
            }
        }
        return PresentationTemplateSpec(
            templateId = templateId,
            label = json.optString("label", templateId),
            stageAssets = stageAssets,
            glyphMotionProfile = glyphMotion?.optString("profile")?.ifBlank { "default" } ?: "default",
            glyphResolveStyle = glyphMotion?.optString("resolve_style")?.ifBlank { "center_snap" } ?: "center_snap",
            choreographyAnchors = anchors,
        )
    }

    fun mergeChoreographyIntoIdentity(
        effectIdentity: JSONObject?,
        template: PresentationTemplateSpec?,
    ): JSONObject? {
        if (template == null || template.choreographyAnchors.isEmpty()) {
            return effectIdentity
        }
        val out = effectIdentity ?: JSONObject()
        val anchors = out.optJSONObject("choreography_anchors") ?: JSONObject()
        template.choreographyAnchors.forEach { (key, value) ->
            anchors.put(key, value.toDouble())
        }
        out.put("choreography_anchors", anchors)
        return out
    }

    private fun parseStageAssets(json: JSONObject?): Map<String, PresentationStageAssetSpec> {
        if (json == null) {
            return emptyMap()
        }
        val assets = linkedMapOf<String, PresentationStageAssetSpec>()
        val keys = json.keys()
        while (keys.hasNext()) {
            val role = keys.next()
            val row = json.optJSONObject(role) ?: continue
            val bitmapBase64 = row.optString("image_base64").trim()
            if (bitmapBase64.isEmpty()) {
                continue
            }
            val mediaType = row.optString("image_media_type", "image/png").ifBlank { "image/png" }
            assets[role] = PresentationStageAssetSpec(
                role = role,
                bitmapBase64 = bitmapBase64,
                mediaType = mediaType,
            )
        }
        return assets
    }
}
