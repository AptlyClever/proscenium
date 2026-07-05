package com.controlalt.hailoverlay

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object OverlayBrokerGate {
    const val ERROR_REQUIRED = "broker_proof_required"
    const val ERROR_INVALID = "broker_proof_invalid"
    const val DETAIL_REQUIRED = "Overlay render requires LCARD broker_proof"
    const val DETAIL_INVALID = "broker_proof does not match render payload"
    const val DETAIL_SECRET_NOT_CONFIGURED = "Overlay broker secret is not configured on device"

    private const val DEFAULT_PALETTE_ID = "axiom_dark_cyan"
    private val hailIdPattern = Regex("^hail\\.[a-z0-9_.-]{1,120}$")

    data class BrokerProofPayload(
        val hailId: String,
        val effectId: String,
        val glyphId: String,
        val paletteId: String,
        val message: String,
        val durationMs: Long,
        val placementId: String,
        val placementMode: String,
        val xPercent: Float?,
        val yPercent: Float?,
        val sizeTier: String,
    )

    fun validateHailId(hailId: String): Result<String> {
        val normalized = hailId.trim()
        if (normalized.isEmpty()) {
            return Result.failure(IllegalArgumentException("hail_id required"))
        }
        if (!hailIdPattern.matches(normalized)) {
            return Result.failure(IllegalArgumentException("hail_id invalid format"))
        }
        return Result.success(normalized)
    }

    fun validateBrokerProof(
        brokerProof: String?,
        payload: BrokerProofPayload,
    ): Result<Unit> {
        if (payload.effectId == "slots") {
            return Result.success(Unit)
        }
        return validateBrokerProofWithSecret(
            brokerProof = brokerProof,
            payload = payload,
            secret = resolveConfiguredSecret(),
        )
    }

    internal fun validateBrokerProofWithSecret(
        brokerProof: String?,
        payload: BrokerProofPayload,
        secret: String,
    ): Result<Unit> {
        val proof = brokerProof?.trim().orEmpty()
        if (proof.isEmpty()) {
            return Result.failure(IllegalArgumentException(ERROR_REQUIRED))
        }
        if (secret.trim().length < 16) {
            return Result.failure(IllegalArgumentException(ERROR_INVALID))
        }
        val expected = computeProof(secret.trim(), payload)
        if (!constantTimeEquals(proof.lowercase(), expected.lowercase())) {
            return Result.failure(IllegalArgumentException(ERROR_INVALID))
        }
        return Result.success(Unit)
    }

    internal fun resolveConfiguredSecret(): String {
        return BuildConfig.OVERLAY_BROKER_SECRET.trim()
    }

    fun canonicalProofInput(payload: BrokerProofPayload): String {
        val xPercent = if (payload.placementMode == Placement.MODE_CUSTOM) {
            formatProofNumber(payload.xPercent)
        } else {
            ""
        }
        val yPercent = if (payload.placementMode == Placement.MODE_CUSTOM) {
            formatProofNumber(payload.yPercent)
        } else {
            ""
        }

        return listOf(
            payload.hailId,
            payload.effectId,
            payload.glyphId,
            payload.paletteId,
            payload.message,
            payload.durationMs.toString(),
            payload.placementId,
            payload.placementMode,
            xPercent,
            yPercent,
            payload.sizeTier,
        ).joinToString("|")
    }

    fun computeProof(secret: String, payload: BrokerProofPayload): String {
        val canonical = canonicalProofInput(payload)
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(canonical.toByteArray(Charsets.UTF_8)).joinToString("") { byte ->
            "%02x".format(byte)
        }
    }

    fun brokerProofPayloadFromValidated(
        hailId: String,
        effectId: String,
        glyphId: String,
        paletteId: String,
        message: String,
        durationMs: Long,
        placement: Placement.Resolved,
        sizeTier: String? = null,
    ): BrokerProofPayload {
        return BrokerProofPayload(
            hailId = hailId,
            effectId = effectId,
            glyphId = glyphId,
            paletteId = paletteId.ifBlank { DEFAULT_PALETTE_ID },
            message = message,
            durationMs = durationMs,
            placementId = placement.placementId,
            placementMode = placement.placementMode,
            xPercent = placement.xPercent,
            yPercent = placement.yPercent,
            sizeTier = PaintBoxTier.resolve(sizeTier).tierId,
        )
    }

    private fun formatProofNumber(value: Float?): String {
        if (value == null) {
            return ""
        }
        val asLong = value.toLong()
        return if (value == asLong.toFloat()) {
            asLong.toString()
        } else {
            value.toString()
        }
    }

    private fun constantTimeEquals(left: String, right: String): Boolean {
        if (left.length != right.length) {
            return false
        }
        var diff = 0
        for (index in left.indices) {
            diff = diff or (left[index].code xor right[index].code)
        }
        return diff == 0
    }
}
