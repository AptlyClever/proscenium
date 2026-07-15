package com.controlalt.hailoverlay

import android.content.Intent

object LauncherTrampolineExit {
    fun homeIntent(): Intent {
        return Intent(OverlayAppRouting.LAUNCHER_EXIT_ACTION).apply {
            addCategory(OverlayAppRouting.LAUNCHER_EXIT_CATEGORY)
            flags = OverlayAppRouting.LAUNCHER_EXIT_FLAGS
        }
    }
}
