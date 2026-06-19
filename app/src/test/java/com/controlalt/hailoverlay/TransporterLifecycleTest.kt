package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TransporterLifecycleTest {

  private val choreography = EffectChoreography(
      effectStart = 0.05f,
      glyphResolveStart = 0.42f,
      glyphImpactPeak = 0.74f,
      glyphLockIn = 0.9f,
      glyphLockInOvershoot = 0.04f,
      messageRevealStart = 0.82f,
      stableReady = 0.95f,
  )

  @Test
  fun glyphScale_peaks_at_lock_in_overshoot() {
    val atLockIn = TransporterLifecycle.computeEntranceFrame(0.9f, choreography, 1f)
    assertEquals(1.04f, atLockIn.glyphScale, 0.02f)
  }

  @Test
  fun glyphScale_settles_to_one_by_stable_ready() {
    val atStable = TransporterLifecycle.computeEntranceFrame(0.95f, choreography, 1f)
    assertEquals(1f, atStable.glyphScale, 0.02f)
  }

  @Test
  fun beamClear_is_identity_at_start() {
    val before = TransporterLifecycle.computeEntranceFrame(0.899f, choreography, 1f)
    val atClear = TransporterLifecycle.computeEntranceFrame(0.9f, choreography, 1f)
    assertTrue(atClear.beamClearT >= 0f)
    assertTrue(atClear.beamIntensity <= before.beamIntensity + 0.02f)
  }

  @Test
  fun beamClear_fades_to_inactive_at_entrance_end() {
    val end = TransporterLifecycle.computeEntranceFrame(1f, choreography, 1f)
    assertTrue(end.beamClearT > 0.9f)
    assertTrue(end.beamIntensity < 0.08f)
    assertTrue(end.beamReveal < 0.2f)
  }

  @Test
  fun exit_beamOut_seed_matches_dematerialize_start() {
    val beamOutEnd = TransporterContract.BEAM_OUT_SEED_MS.toFloat() / TransporterContract.EXIT_MS.toFloat()
    val seedEnd = TransporterLifecycle.computeExitFrame(beamOutEnd - 0.001f, 1f)
    val dematStart = TransporterLifecycle.computeExitFrame(beamOutEnd, 1f)
    assertEquals(seedEnd.beamIntensity, dematStart.beamIntensity, 0.08f)
    assertEquals(seedEnd.beamScale, dematStart.beamScale, 0.08f)
  }

  @Test
  fun applyBeamClearHandoff_preserves_values_at_zero() {
    val result = TransporterLifecycle.applyBeamClearHandoff(0.92f, 0.88f, 1f, 0f)
    assertEquals(0.92f, result.first, 0.001f)
    assertEquals(0.88f, result.second, 0.001f)
    assertEquals(1f, result.third, 0.001f)
  }
}
