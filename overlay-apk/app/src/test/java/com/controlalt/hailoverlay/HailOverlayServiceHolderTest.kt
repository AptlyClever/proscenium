package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HailOverlayServiceHolderTest {
    @Test
    fun readiness_transitions_track_listener_state() {
        HailOverlayServiceHolder.markStopped()
        assertFalse(HailOverlayServiceHolder.snapshot().serviceRunning)

        HailOverlayServiceHolder.markServiceStarting()
        assertTrue(HailOverlayServiceHolder.isRunning)
        assertTrue(HailOverlayServiceHolder.snapshot().serviceRunning)
        assertFalse(HailOverlayServiceHolder.snapshot().listenerListening)

        HailOverlayServiceHolder.markListenerListening()
        val listening = HailOverlayServiceHolder.snapshot()
        assertTrue(listening.listenerListening)
        assertEquals(HailRegistry.HTTP_PORT, listening.port)
        assertEquals(null, listening.lastStartupError)

        HailOverlayServiceHolder.markListenerFailed("port in use")
        val failed = HailOverlayServiceHolder.snapshot()
        assertFalse(failed.listenerListening)
        assertEquals("port in use", failed.lastStartupError)

        HailOverlayServiceHolder.markStopped()
        assertFalse(HailOverlayServiceHolder.isRunning)
        assertFalse(HailOverlayServiceHolder.snapshot().serviceRunning)
    }
}
