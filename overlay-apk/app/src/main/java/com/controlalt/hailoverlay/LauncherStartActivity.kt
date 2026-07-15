package com.controlalt.hailoverlay

import android.app.Activity
import android.os.Bundle

class LauncherStartActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        HailOverlayService.start(applicationContext)
        startActivity(LauncherTrampolineExit.homeIntent())
        moveTaskToBack(true)
        finish()
    }
}
