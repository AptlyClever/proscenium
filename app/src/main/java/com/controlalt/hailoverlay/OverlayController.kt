package com.controlalt.hailoverlay

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
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

class OverlayController(
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
    private var dismissRunnable: Runnable? = null

    val overlayState = mutableStateOf<OverlayState?>(null)

    data class OverlayState(
        val glyphId: String,
        val message: String,
        val paletteId: String,
        val placement: Placement.Resolved,
        val durationMs: Long,
        val sizeTier: PaintBoxTier,
        val transporterVariation: ResolvedTransporterVariation,
        val choreography: EffectChoreography,
        val proceduralGraph: ProceduralGraphSpec? = null,
        val packageLayout: PackageLayoutV2? = null,
    )

    init {
        savedStateRegistryController.performRestore(null)
        lifecycleRegistry.currentState = Lifecycle.State.CREATED
    }

    fun show(hail: HailRegistry.ValidatedHail) {
        mainHandler.post {
            dismissInternal(removeOnly = false)
            overlayState.value = OverlayState(
                glyphId = hail.glyphId,
                message = hail.message,
                paletteId = hail.paletteId,
                placement = hail.placement,
                durationMs = hail.durationMs,
                sizeTier = hail.sizeTier,
                transporterVariation = hail.transporterVariation,
                choreography = hail.choreography,
                proceduralGraph = hail.proceduralGraph,
                packageLayout = hail.packageLayout,
            )

            val view = ComposeView(context).apply {
                setViewTreeLifecycleOwner(this@OverlayController)
                setViewTreeSavedStateRegistryOwner(this@OverlayController)
                setViewTreeViewModelStoreOwner(this@OverlayController)
                setContent {
                    val state = overlayState.value
                    if (state != null) {
                        TransporterOverlay(
                            glyphId = state.glyphId,
                            message = state.message,
                            paletteId = state.paletteId,
                            placement = state.placement,
                            sizeTier = state.sizeTier,
                            transporterVariation = state.transporterVariation,
                            choreography = state.choreography,
                            proceduralGraph = state.proceduralGraph,
                            packageLayout = state.packageLayout,
                            stableHoldMs = state.durationMs,
                            onLifecycleComplete = { dismissInternal(removeOnly = true) },
                        )
                    }
                }
            }

            val layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                overlayWindowType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT,
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                title = "ControlAltHailOverlay"
            }

            windowManager.addView(view, layoutParams)
            composeView = view
            lifecycleRegistry.currentState = Lifecycle.State.RESUMED

            dismissRunnable = Runnable { dismissInternal(removeOnly = true) }
            val safetyMs = TransporterContract.totalLifecycleMs(hail.durationMs) + 500L
            mainHandler.postDelayed(dismissRunnable!!, safetyMs)
        }
    }

    fun dismiss() {
        mainHandler.post { dismissInternal(removeOnly = true) }
    }

    private fun dismissInternal(removeOnly: Boolean) {
        dismissRunnable?.let { mainHandler.removeCallbacks(it) }
        dismissRunnable = null

        composeView?.let { view ->
            runCatching { windowManager.removeView(view) }
            composeView = null
        }
        overlayState.value = null
        if (removeOnly) {
            lifecycleRegistry.currentState = Lifecycle.State.CREATED
            overlayViewModelStore.clear()
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
