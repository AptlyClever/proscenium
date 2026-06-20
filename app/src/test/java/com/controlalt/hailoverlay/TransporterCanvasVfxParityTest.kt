package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TransporterCanvasVfxParityTest {

  private val choreography = EffectChoreography(
      glyphResolveStart = 0.42f,
      glyphImpactPeak = 0.74f,
      glyphLockIn = 0.9f,
      messageRevealStart = 0.82f,
      stableReady = 0.95f,
  )

  private fun voyagingVariation(): ResolvedTransporterVariation {
    return TransporterVariationProfile.resolve(
        variationId = "voyaging",
        beamIntensity = 0.78f,
        beamScale = 1f,
        particleStyleHint = null,
    )
  }

  @Test
  fun variationProfiles_route_particle_style_not_string_guess() {
    val spoon = TransporterVariationProfile.resolve("spoon", 0.78f, 1f, null)
    assertEquals(TransporterParticleStyle.SCANFALL_DENSE, spoon.profile.particleStyle)
    assertTrue(spoon.profile.vfxLayers.swirlField)

    val tng = TransporterVariationProfile.resolve("generation-next", 0.78f, 1f, null)
    assertEquals(TransporterParticleStyle.SPARKLE_RISE, tng.profile.particleStyle)
    assertTrue(tng.profile.vfxLayers.showerCurtain)
  }

  @Test
  fun stable_frame_suppresses_transport_beam() {
    val stable = TransporterLifecycle.computeStableFrame(
        stablePulse = 0.25f,
        stableElapsedMs = 1200L,
        messageSidekick = MessageSidekickTiming.fromJson(null, 5000L, forceStablePhase = true),
    )
    assertFalse(stable.beamActive)
    assertEquals(0f, stable.beamIntensity, 0.001f)
    assertTrue(stable.glyphAlpha in 0.92f..1f)
  }

  @Test
  fun shimmer_intensity_tracks_variation_profile() {
    val voyaging = TransporterVariationProfile.shimmerIntensity(
        TransporterVariationProfile.resolve("voyaging", null, null, null).profile,
    )
    val spoon = TransporterVariationProfile.shimmerIntensity(
        TransporterVariationProfile.resolve("spoon", null, null, null).profile,
    )
    val tng = TransporterVariationProfile.shimmerIntensity(
        TransporterVariationProfile.resolve("generation-next", null, null, null).profile,
    )
    assertTrue(voyaging < spoon)
    assertTrue(spoon < tng)
  }

  @Test
  fun resolveBeamBounds_uses_profile_geometry_multipliers() {
    val placement = Placement.resolve("upper_center", "preset", null, null).getOrThrow()
    val variation = voyagingVariation()
    val regions = PaintBoxLayout.resolve(
        1920f,
        1080f,
        placement,
        PaintBoxTier.MEDIUM,
        variation,
    )
    val voyaging = voyagingVariation().profile
    val spoon = TransporterVariationProfile.resolve("spoon", 1f, 1f, null).profile
    val voyagingBeam = TransporterCanvasRenderer.resolveBeamBounds(regions, voyaging, 1f, 1f, false)
    val spoonBeam = TransporterCanvasRenderer.resolveBeamBounds(regions, spoon, 1f, 1f, false)
    assertTrue(spoonBeam.bw > voyagingBeam.bw)
  }

  @Test
  fun entrance_end_clears_beam_before_stable_handoff() {
    val end = TransporterLifecycle.computeEntranceFrame(1f, choreography, 0.78f)
    assertTrue(end.beamClearT > 0.9f)
    assertTrue(end.beamIntensity < 0.08f)
  }

  @Test
  fun stage_floor_anchor_keeps_bottom_fixed_while_column_grows() {
    val placement = Placement.resolve("upper_center", "preset", null, null).getOrThrow()
    val regions = PaintBoxLayout.resolve(1920f, 1080f, placement, PaintBoxTier.MEDIUM, voyagingVariation())
        .toPackageLocal()
    val profile = voyagingVariation().profile
    val shortColumn = TransporterCanvasRenderer.resolveBeamBounds(
        regions,
        profile,
        1f,
        0.15f,
        dematerializing = false,
        stageFloorAnchored = true,
    )
    val tallColumn = TransporterCanvasRenderer.resolveBeamBounds(
        regions,
        profile,
        1f,
        1f,
        dematerializing = false,
        stageFloorAnchored = true,
    )
    assertEquals(shortColumn.bottom, tallColumn.bottom, 0.5f)
    assertTrue(shortColumn.top > tallColumn.top)
  }

  @Test
  fun impact_peak_flash_peaks_at_anchor() {
    assertEquals(1f, TransporterCanvasRenderer.impactPeakFlashIntensity(0.46f, 0.46f), 0.001f)
    assertEquals(0f, TransporterCanvasRenderer.impactPeakFlashIntensity(0.1f, 0.46f), 0.001f)
  }
}
