package com.controlalt.hailoverlay

/**
 * Pop effect lifecycle — TV-tuned between harness (400ms) and transporter (1900ms).
 * Authority: hail-render-contract pop timingMs (device revision 2026-06-18).
 */
object PopContract {
    const val ENTRANCE_MS = 900L
    const val EXIT_MS = 480L

    fun totalLifecycleMs(stableHoldMs: Long): Long {
        return ENTRANCE_MS + stableHoldMs + EXIT_MS
    }

    fun lifecycleTiming(stableHoldMs: Long): LifecycleTiming {
        return LifecycleTiming(
            entranceMs = ENTRANCE_MS,
            exitMs = EXIT_MS,
            beamInSeedMs = 0L,
            beamOutSeedMs = 0L,
            stableHoldMs = stableHoldMs,
        )
    }
}
