package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OverlayAppRoutingTest {
    @Test
    fun launcher_and_diagnostics_components_are_distinct() {
        assertFalse(OverlayAppRouting.isLauncherComponent(OverlayAppRouting.DIAGNOSTICS_ACTIVITY))
        assertFalse(OverlayAppRouting.isDiagnosticsComponent(OverlayAppRouting.LAUNCHER_ACTIVITY))
        assertTrue(OverlayAppRouting.isLauncherComponent(OverlayAppRouting.LAUNCHER_ACTIVITY))
        assertTrue(OverlayAppRouting.isDiagnosticsComponent(OverlayAppRouting.DIAGNOSTICS_ACTIVITY))
    }

    @Test
    fun diagnostics_action_is_explicit() {
        assertTrue(OverlayAppRouting.isDiagnosticsAction(OverlayAppRouting.ACTION_OPEN_DIAGNOSTICS))
        assertFalse(OverlayAppRouting.isDiagnosticsAction("android.intent.action.MAIN"))
        assertFalse(OverlayAppRouting.isDiagnosticsAction(null))
    }

    @Test
    fun launcher_exit_contract_returns_to_home() {
        assertEquals("android.intent.action.MAIN", OverlayAppRouting.LAUNCHER_EXIT_ACTION)
        assertEquals("android.intent.category.HOME", OverlayAppRouting.LAUNCHER_EXIT_CATEGORY)
        assertEquals(0x10000000, OverlayAppRouting.LAUNCHER_EXIT_FLAGS)
    }
}
