package com.controlalt.hailoverlay

object OverlayAppRouting {
    const val ACTION_OPEN_DIAGNOSTICS = "com.controlalt.hailoverlay.action.OPEN_DIAGNOSTICS"

    const val LAUNCHER_ACTIVITY = "com.controlalt.hailoverlay.LauncherStartActivity"
    const val DIAGNOSTICS_ACTIVITY = "com.controlalt.hailoverlay.DiagnosticsActivity"

    const val LAUNCHER_EXIT_ACTION = "android.intent.action.MAIN"
    const val LAUNCHER_EXIT_CATEGORY = "android.intent.category.HOME"
    const val LAUNCHER_EXIT_FLAGS = 0x10000000 // Intent.FLAG_ACTIVITY_NEW_TASK

    fun isDiagnosticsAction(action: String?): Boolean {
        return action == ACTION_OPEN_DIAGNOSTICS
    }

    fun isLauncherComponent(componentClassName: String?): Boolean {
        return componentClassName == LAUNCHER_ACTIVITY
    }

    fun isDiagnosticsComponent(componentClassName: String?): Boolean {
        return componentClassName == DIAGNOSTICS_ACTIVITY
    }
}
