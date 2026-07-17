package com.controlalt.hailoverlay

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner

/**
 * Bandit/Slots is a persistent, stateful game session, not a brief Hail
 * impression -- it gets its own controller with its own lifecycle (no timed
 * auto-dismiss; the game session ends itself) rather than being dispatched
 * through [OverlayController]/[HailRegistry]'s Hail-only trigger pipeline.
 *
 * It reuses the same rendering toolkit Hails use (GlyphDisplay and friends)
 * once wired up (see control-alt-lcard#193) -- what it does not share is the
 * Hail trigger/broker/allowlist/dismiss-timer machinery, since a game session
 * has a fundamentally different lifecycle than a fire-and-forget effect.
 */
class BanditOverlayController(
    private val context: Context,
) : LifecycleOwner, SavedStateRegistryOwner, ViewModelStoreOwner {

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val mainHandler = Handler(Looper.getMainLooper())
    private val lifecycleRegistry = LifecycleRegistry(this)
    private val savedStateRegistryController = SavedStateRegistryController.create(this)
    private val overlayViewModelStore = ViewModelStore()

    override val lifecycle: Lifecycle
        get() = lifecycleRegistry

    override val savedStateRegistry: SavedStateRegistry
        get() = savedStateRegistryController.savedStateRegistry

    override val viewModelStore: ViewModelStore
        get() = overlayViewModelStore

    private var composeView: ComposeView? = null

    val isShowing = mutableStateOf(false)

    init {
        savedStateRegistryController.performRestore(null)
        lifecycleRegistry.currentState = Lifecycle.State.CREATED
    }

    fun show(options: BanditShowOptions = BanditShowOptions()) {
        mainHandler.post {
            // Always fully tear down the prior Bandit surface first. A soft
            // removeView without WebView.destroy left Chromium targets alive,
            // stacking session listeners and stop audio across show cycles.
            dismissInternal()
            isShowing.value = true

            val view = ComposeView(context).apply {
                setLayerType(View.LAYER_TYPE_HARDWARE, null)
                setViewTreeLifecycleOwner(this@BanditOverlayController)
                setViewTreeSavedStateRegistryOwner(this@BanditOverlayController)
                setViewTreeViewModelStoreOwner(this@BanditOverlayController)
                setContent {
                    SlotsOverlay(
                        options = options,
                        onDismiss = { dismissInternal() },
                    )
                }
            }

            val layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                overlayWindowType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                PixelFormat.TRANSLUCENT,
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                title = "ControlAltBanditOverlay"
            }

            windowManager.addView(view, layoutParams)
            composeView = view
            lifecycleRegistry.currentState = Lifecycle.State.RESUMED

            // No auto-dismiss timer: unlike a Hail, a game session ends itself
            // (session_closed over its own WebSocket) or via explicit dismiss().
        }
    }

    fun dismiss() {
        mainHandler.post { dismissInternal() }
    }

    private fun dismissInternal() {
        composeView?.let { view ->
            destroyWebViewsIn(view)
            runCatching { view.disposeComposition() }
            runCatching { windowManager.removeView(view) }
            composeView = null
        }
        isShowing.value = false
        if (lifecycleRegistry.currentState != Lifecycle.State.INITIALIZED) {
            lifecycleRegistry.currentState = Lifecycle.State.CREATED
        }
        overlayViewModelStore.clear()
    }

    private fun destroyWebViewsIn(root: View) {
        if (root is WebView) {
            destroyBanditWebView(root)
            return
        }
        if (root is ViewGroup) {
            val children = ArrayList<View>(root.childCount)
            for (i in 0 until root.childCount) {
                children.add(root.getChildAt(i))
            }
            children.forEach { destroyWebViewsIn(it) }
        }
    }

    private fun overlayWindowType(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
    }
}
