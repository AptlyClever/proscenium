package com.controlalt.hailoverlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class HailOverlayService : Service() {

    private var httpServer: HailHttpServer? = null
    private lateinit var overlayController: OverlayController

    override fun onCreate() {
        super.onCreate()
        HailOverlayServiceHolder.isRunning = true
        overlayController = OverlayController(applicationContext)
        startForeground(NOTIFICATION_ID, buildNotification())
        startHttpServer()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        HailOverlayServiceHolder.isRunning = false
        stopHttpServer()
        overlayController.dismiss()
        super.onDestroy()
    }

    private fun startHttpServer() {
        if (httpServer != null) {
            return
        }
        httpServer = HailHttpServer { hail ->
            overlayController.show(hail)
        }.also { server ->
            runCatching { server.start() }
                .onSuccess {
                    Log.i(TAG, "Hail HTTP server listening on port ${HailRegistry.HTTP_PORT}")
                }
                .onFailure { error ->
                    Log.e(TAG, "Failed to start hail HTTP server", error)
                }
        }
    }

    private fun stopHttpServer() {
        httpServer?.let { server ->
            runCatching { server.stop() }
            httpServer = null
        }
    }

    private fun buildNotification(): Notification {
        createNotificationChannel()

        val launchIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.service_notification_title))
            .setContentText(getString(R.string.service_notification_body))
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentIntent(launchIntent)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.service_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.service_channel_description)
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    companion object {
        private const val TAG = "HailOverlayService"
        private const val CHANNEL_ID = "hail_overlay_listener"
        private const val NOTIFICATION_ID = 1001

        fun start(context: Context) {
            val intent = Intent(context, HailOverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, HailOverlayService::class.java))
        }
    }
}
