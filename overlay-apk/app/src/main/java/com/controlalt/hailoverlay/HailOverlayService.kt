package com.controlalt.hailoverlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

class HailOverlayService : Service() {

    private var httpServer: HailHttpServer? = null
    private lateinit var overlayController: OverlayController

    private var banditHttpServer: BanditHttpServer? = null
    private lateinit var banditOverlayController: BanditOverlayController

    private val watchdog = Handler(Looper.getMainLooper())
    private val watchdogTick = object : Runnable {
        override fun run() {
            ensureHttpServer()
            ensureBanditHttpServer()
            updateNotification()
            watchdog.postDelayed(this, WATCHDOG_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        HailOverlayServiceHolder.markServiceStarting()
        overlayController = OverlayController(applicationContext)
        banditOverlayController = BanditOverlayController(applicationContext)
        startForegroundNotification()
        ensureHttpServer()
        ensureBanditHttpServer()
        watchdog.postDelayed(watchdogTick, WATCHDOG_INTERVAL_MS)
    }

    private fun startForegroundNotification() {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE or
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        ensureHttpServer()
        ensureBanditHttpServer()
        updateNotification()
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        watchdog.removeCallbacks(watchdogTick)
        HailOverlayServiceHolder.markStopped()
        stopHttpServer()
        stopBanditHttpServer()
        overlayController.dismiss()
        banditOverlayController.dismiss()
        super.onDestroy()
    }

    private fun ensureHttpServer() {
        if (httpServer != null && HailOverlayServiceHolder.snapshot().listenerListening) {
            return
        }
        if (httpServer != null) {
            stopHttpServer()
        }
        httpServer = HailHttpServer { hail ->
            overlayController.show(hail)
        }.also { server ->
            runCatching { server.start() }
                .onSuccess {
                    HailOverlayServiceHolder.markListenerListening()
                    Log.i(TAG, "Hail HTTP server listening on port ${HailRegistry.HTTP_PORT}")
                    updateNotification()
                }
                .onFailure { error ->
                    val message = error.message ?: "listener startup failed"
                    HailOverlayServiceHolder.markListenerFailed(message)
                    Log.e(TAG, "Failed to start hail HTTP server", error)
                    updateNotification()
                }
        }
    }

    private fun stopHttpServer() {
        httpServer?.let { server ->
            runCatching { server.stop() }
            httpServer = null
        }
        if (HailOverlayServiceHolder.isRunning) {
            HailOverlayServiceHolder.markListenerFailed("stopped")
        }
    }

    private fun ensureBanditHttpServer() {
        if (banditHttpServer != null &&
            banditHttpServer!!.wasStarted() &&
            HailOverlayServiceHolder.snapshot().banditListening
        ) {
            return
        }
        if (banditHttpServer != null) {
            stopBanditHttpServer()
        }
        banditHttpServer = BanditHttpServer(
            onShow = { wsUrlOverride -> banditOverlayController.show(wsUrlOverride) },
            onDismiss = { banditOverlayController.dismiss() },
        ).also { server ->
            runCatching { server.start() }
                .onSuccess {
                    HailOverlayServiceHolder.markBanditListening()
                    Log.i(TAG, "Bandit HTTP server listening on port ${BanditHttpServer.HTTP_PORT}")
                    updateNotification()
                }
                .onFailure { error ->
                    val message = error.message ?: "bandit listener startup failed"
                    HailOverlayServiceHolder.markBanditFailed(message)
                    Log.e(TAG, "Failed to start bandit HTTP server", error)
                    updateNotification()
                }
        }
    }

    private fun stopBanditHttpServer() {
        banditHttpServer?.let { server ->
            runCatching { server.stop() }
            banditHttpServer = null
        }
        if (HailOverlayServiceHolder.isRunning) {
            HailOverlayServiceHolder.markBanditFailed("stopped")
        }
    }

    private fun buildNotification(): Notification {
        createNotificationChannel()

        val launchIntent = PendingIntent.getActivity(
            this,
            0,
            DiagnosticsActivity.openIntent(this),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        val readiness = HailOverlayServiceHolder.snapshot()
        val body = when {
            readiness.listenerListening && readiness.banditListening ->
                getString(R.string.service_notification_body)
            readiness.lastStartupError != null || readiness.lastBanditError != null ->
                getString(R.string.service_notification_listener_error)
            else -> getString(R.string.service_notification_starting)
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.service_notification_title))
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentIntent(launchIntent)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
    }

    private fun updateNotification() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification())
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
        private const val WATCHDOG_INTERVAL_MS = 60_000L

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
