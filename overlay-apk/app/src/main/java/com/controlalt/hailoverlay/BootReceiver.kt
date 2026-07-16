package com.controlalt.hailoverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Starts the foreground adapter host after boot or package replace.
 *
 * Overlay permission is NOT required to bind the LAN listeners (8765/8767).
 * Drawing overlays still checks canDrawOverlays at show-time; gating boot on
 * that permission left the adapters dead after reboot until a manual launch.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        when (intent?.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> Unit
            else -> return
        }
        val pending = goAsync()
        try {
            HailOverlayService.start(context.applicationContext)
        } finally {
            pending.finish()
        }
    }
}
