package com.controlalt.hailoverlay

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object OverlayBrokerGate {
    const val ERROR_REQUIRED = "broker_proof_required"
    const val ERROR_INVALID = "broker_proof_invalid"

    private val hailIdPattern = Regex("^hail\\.[a-z0-9_.-]{1,120}$")

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
        hailId: String,
        effectId: String,
        glyphId: String,
        durationMs: Long,
    ): Result<Unit> {
        val proof = brokerProof?.trim().orEmpty()
        if (proof.isEmpty()) {
            return Result.failure(IllegalArgumentException(ERROR_REQUIRED))
        }
        val secret = BuildConfig.OVERLAY_BROKER_SECRET.trim()
        if (secret.length < 16) {
            return Result.failure(IllegalArgumentException(ERROR_INVALID))
        }
        val expected = computeProof(secret, hailId, effectId, glyphId, durationMs)
        if (!constantTimeEquals(proof.lowercase(), expected.lowercase())) {
            return Result.failure(IllegalArgumentException(ERROR_INVALID))
        }
        return Result.success(Unit)
    }

    fun computeProof(
        secret: String,
        hailId: String,
        effectId: String,
        glyphId: String,
        durationMs: Long,
    ): String {
        val canonical = listOf(hailId, effectId, glyphId, durationMs.toString()).joinToString("|")
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(canonical.toByteArray(Charsets.UTF_8)).joinToString("") { byte ->
            "%02x".format(byte)
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
