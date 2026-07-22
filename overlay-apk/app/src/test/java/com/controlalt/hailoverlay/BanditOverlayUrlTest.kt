package com.controlalt.hailoverlay

import org.junit.Assert.assertTrue
import org.junit.Test

class BanditOverlayUrlTest {
    @Test
    fun selected_game_is_pinned_in_overlay_url() {
        val url = buildBanditOverlayUrl(
            "ws://bandit/api/games/slots/stream",
            BanditShowOptions(
                audioOutput = "tv",
                size = "expanded",
                gameId = "factory_prove_hold_001",
            ),
            1234L,
        )

        assertTrue(url.startsWith("http://bandit/overlay?embed=apk&"))
        assertTrue(url.contains("game_id=factory_prove_hold_001"))
        assertTrue(url.contains("audio_output=tv"))
        assertTrue(url.contains("size=expanded"))
        assertTrue(url.contains("_cb=1234"))
    }
}
