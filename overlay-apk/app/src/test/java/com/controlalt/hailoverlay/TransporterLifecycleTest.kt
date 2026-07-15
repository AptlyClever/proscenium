package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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

  @Test
  fun stable_frame_beam_off_with_breathe() {
    val interest = StableInterest(
        glyphBreatheAmplitude = 0.06f,
        glyphShimmerIntensity = 0.32f,
        stableResidual = "optional_glyph_local",
    )
    val frame = TransporterLifecycle.computeStableFrame(
        stablePulse = 0.25f,
        stableInterest = interest,
    )
    assertEquals(0f, frame.beamIntensity, 0.001f)
    assertFalse(frame.beamActive)
    assertTrue(frame.glyphAlpha in 0.92f..1f)
    assertTrue(frame.glyphScale in 0.98f..1.02f)
  }

  @Test
  fun stable_message_hidden_until_sidekick_entrance() {
    val timing = MessageSidekickTiming(
        entranceMs = 480L,
        exitMs = 360L,
        targetOpacity = 0.92f,
        exitOffsetMs = 4640L,
        stableHoldMs = 5000L,
        useStablePhase = true,
    )
    val early = TransporterLifecycle.computeStableFrame(
        stablePulse = 0f,
        stableElapsedMs = 0L,
        messageSidekick = timing,
    )
    assertEquals(0f, early.messageAlpha, 0.02f)
    val mid = TransporterLifecycle.computeStableFrame(
        stablePulse = 0.5f,
        stableElapsedMs = 600L,
        messageSidekick = timing,
    )
    assertTrue(mid.messageAlpha > 0.85f)
  }
}
