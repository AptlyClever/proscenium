package com.controlalt.hailoverlay

import org.json.JSONObject

/**
 * Named-effect lifecycle from Axiom `lifecycle_timing` (entrance / stable / exit).
 * Defaults match [TransporterContract] when payload omits fields.
 */
data class LifecycleTiming(
    val entranceMs: Long = TransporterContract.ENTRANCE_MS,
    val exitMs: Long = TransporterContract.EXIT_MS,
    val beamInSeedMs: Long = TransporterContract.BEAM_IN_SEED_MS,
    val beamOutSeedMs: Long = TransporterContract.BEAM_OUT_SEED_MS,
    val stableHoldMs: Long? = null,
) {
    fun totalLifecycleMs(fallbackHoldMs: Long): Long {
        val hold = stableHoldMs ?: fallbackHoldMs
        return entranceMs + hold + exitMs
    }

    companion object {
        fun fromJson(json: JSONObject?, fallbackHoldMs: Long): LifecycleTiming {
            if (json == null) {
                return LifecycleTiming(stableHoldMs = fallbackHoldMs)
            }
            fun longField(key: String, default: Long): Long {
                val raw = json.optLong(key, default)
                return if (raw > 0L) raw else default
            }
            val hold = json.optLong("stable_hold_ms", fallbackHoldMs).takeIf { it > 0L }
                ?: fallbackHoldMs
            return LifecycleTiming(
                entranceMs = longField("entrance_animation_ms", TransporterContract.ENTRANCE_MS),
                exitMs = longField("exit_animation_ms", TransporterContract.EXIT_MS),
                beamInSeedMs = longField("beam_in_seed_ms", TransporterContract.BEAM_IN_SEED_MS),
                beamOutSeedMs = longField("beam_out_seed_ms", TransporterContract.BEAM_OUT_SEED_MS),
                stableHoldMs = hold,
            )
        }
    }
}
