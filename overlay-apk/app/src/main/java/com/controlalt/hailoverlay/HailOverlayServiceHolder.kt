package com.controlalt.hailoverlay

object HailOverlayServiceHolder {
    data class Readiness(
        val serviceRunning: Boolean = false,
        val listenerListening: Boolean = false,
        val port: Int = HailRegistry.HTTP_PORT,
        val lastStartupError: String? = null,
    )

    @Volatile
    var isRunning: Boolean = false
        internal set

    @Volatile
    private var readiness: Readiness = Readiness()

    fun snapshot(): Readiness = readiness

    internal fun markServiceStarting() {
        isRunning = true
        readiness = Readiness(
            serviceRunning = true,
            listenerListening = false,
            port = HailRegistry.HTTP_PORT,
            lastStartupError = null,
        )
    }

    internal fun markListenerListening() {
        readiness = readiness.copy(
            serviceRunning = true,
            listenerListening = true,
            lastStartupError = null,
        )
    }

    internal fun markListenerFailed(message: String) {
        readiness = readiness.copy(
            serviceRunning = true,
            listenerListening = false,
            lastStartupError = message,
        )
    }

    internal fun markStopped() {
        isRunning = false
        readiness = Readiness()
    }
}

object PreviewOverlayTrigger {
    private var controller: OverlayController? = null

    fun show(context: android.content.Context, hail: HailRegistry.ValidatedHail) {
        if (controller == null) {
            controller = OverlayController(context.applicationContext)
        }
        controller?.show(hail)
    }
}
