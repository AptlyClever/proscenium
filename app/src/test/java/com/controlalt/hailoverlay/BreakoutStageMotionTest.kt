package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BreakoutStageMotionTest {

    @Test
    fun entrance_starts_small_and_fades_in() {
        val start = BreakoutStageMotion.frame(TransporterPhase.ENTRANCE, entranceT = 0f, exitElapsed = 0f)
        assertEquals(0f, start.alpha, 0.001f)
        assertTrue(start.scale < 0.75f)
    }

    @Test
    fun stable_is_full_opacity() {
        val stable = BreakoutStageMotion.frame(TransporterPhase.STABLE, entranceT = 1f, exitElapsed = 0f)
        assertEquals(1f, stable.alpha, 0.001f)
        assertEquals(1f, stable.scale, 0.001f)
    }

    @Test
    fun exit_fades_out() {
        val end = BreakoutStageMotion.frame(TransporterPhase.EXIT, entranceT = 1f, exitElapsed = 1f)
        assertEquals(0f, end.alpha, 0.001f)
        assertTrue(end.scale < 1f)
    }

    @Test
    fun exit_alpha_follows_glyph_during_dematerialize() {
        val mid = BreakoutStageMotion.frame(
            TransporterPhase.EXIT,
            entranceT = 1f,
            exitElapsed = 0.4f,
            glyphAlpha = 0.25f,
        )
        assertTrue(mid.alpha <= 0.25f)
    }

    @Test
    fun entrance_waits_for_resolve_start_anchor() {
        val early = BreakoutStageMotion.frame(
            TransporterPhase.ENTRANCE,
            entranceT = 0.2f,
            exitElapsed = 0f,
            glyphResolveStart = 0.28f,
        )
        assertEquals(0f, early.alpha, 0.001f)
        val late = BreakoutStageMotion.frame(
            TransporterPhase.ENTRANCE,
            entranceT = 0.6f,
            exitElapsed = 0f,
            glyphResolveStart = 0.28f,
        )
        assertTrue(late.alpha > 0.2f)
    }
}
