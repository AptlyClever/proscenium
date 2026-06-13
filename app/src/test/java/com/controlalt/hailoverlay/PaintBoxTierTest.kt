package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Test

class PaintBoxTierTest {

    @Test
    fun resolves_named_tiers() {
        assertEquals(PaintBoxTier.SMALL, PaintBoxTier.resolve("small"))
        assertEquals(PaintBoxTier.MEDIUM, PaintBoxTier.resolve("medium"))
        assertEquals(PaintBoxTier.LARGE, PaintBoxTier.resolve("large"))
    }

    @Test
    fun resolves_size_codes() {
        assertEquals(PaintBoxTier.SMALL, PaintBoxTier.resolve("S"))
        assertEquals(PaintBoxTier.MEDIUM, PaintBoxTier.resolve("M"))
        assertEquals(PaintBoxTier.LARGE, PaintBoxTier.resolve("L"))
    }

    @Test
    fun unknown_or_missing_falls_back_to_medium() {
        assertEquals(PaintBoxTier.MEDIUM, PaintBoxTier.resolve(null))
        assertEquals(PaintBoxTier.MEDIUM, PaintBoxTier.resolve(""))
        assertEquals(PaintBoxTier.MEDIUM, PaintBoxTier.resolve("xl"))
    }
}
