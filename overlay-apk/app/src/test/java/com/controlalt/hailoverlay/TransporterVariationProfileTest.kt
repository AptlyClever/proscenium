package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TransporterVariationProfileTest {

    @Test
    fun resolve_defaults_to_voyaging() {
        val resolved = TransporterVariationProfile.resolve(null, null, null, null)
        assertEquals("voyaging", resolved.profile.variationId)
        assertEquals(TransporterParticleStyle.SCANFALL, resolved.profile.particleStyle)
    }

    @Test
    fun resolve_generation_next_geometry() {
        val resolved = TransporterVariationProfile.resolve("generation-next", 0.78f, 1f, "sparkle_rise")
        assertEquals("generation-next", resolved.profile.variationId)
        assertTrue(resolved.profile.shimmerBeam)
        assertEquals(TransporterParticleStyle.SPARKLE_RISE, resolved.profile.particleStyle)
        assertTrue(resolved.profile.beamWidthMultiplier > 1.5f)
    }

    @Test
    fun resolve_spoon_uses_dense_particles_and_opacity_bias() {
        val resolved = TransporterVariationProfile.resolve("spoon", 0.78f, 1f, "scanfall_dense")
        assertEquals("spoon", resolved.profile.variationId)
        assertEquals(TransporterParticleStyle.SCANFALL_DENSE, resolved.profile.particleStyle)
        assertTrue(resolved.beamOpacity > 0.85f)
    }

    @Test
    fun resolve_applies_beam_scale() {
        val resolved = TransporterVariationProfile.resolve("voyaging", null, 1.2f, null)
        assertEquals(1.2f, resolved.beamScale)
    }

    @Test
    fun vfx_layers_match_slice4_contract() {
        val voyaging = TransporterVfxLayers.forVariation("voyaging")
        assertEquals(3, voyaging.scanPulseCount)
        assertTrue(voyaging.powerPellet)
        assertTrue(!voyaging.showerCurtain)

        val tng = TransporterVfxLayers.forVariation("generation-next")
        assertTrue(tng.showerCurtain)
        assertTrue(tng.powerPellet)
        assertEquals(0, tng.scanPulseCount)

        val spoon = TransporterVfxLayers.forVariation("spoon")
        assertTrue(spoon.showerCurtain)
        assertTrue(spoon.swirlField)
    }
}
