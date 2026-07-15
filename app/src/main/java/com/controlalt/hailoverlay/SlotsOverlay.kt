package com.controlalt.hailoverlay

import android.util.Log
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView

@Composable
fun SlotsOverlay(
    wsUrlOverride: String?,
    onDismiss: () -> Unit,
) {
    val rawUrl = wsUrlOverride?.trim()?.ifBlank { null } ?: "ws://192.168.68.93:8766/api/games/slots/stream"

    val httpUrl = rawUrl
        .replace("ws://", "http://")
        .replace("wss://", "https://")
        .replace("/api/games/slots/stream", "/overlay?embed=apk")

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
    ) {
        AndroidView(
            factory = { context ->
                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView?, url: String?) {
                            Log.i(TAG, "Bandit overlay loaded: $url")
                            if (BuildConfig.DEBUG) {
                                view?.evaluateJavascript(
                                    """
                                    (() => {
                                      const video = document.querySelector("#presentation-vfx-video");
                                      if (!video || video.dataset.apkVfxProbe) return;
                                      video.dataset.apkVfxProbe = "true";
                                      video.addEventListener("playing", () => {
                                        console.info("Bandit APK VFX playing: " + video.currentSrc);
                                      });
                                      video.addEventListener("error", () => {
                                        console.error("Bandit APK VFX error: " + (video.error?.code || "unknown"));
                                      });
                                    })();
                                    """.trimIndent(),
                                    null,
                                )
                            }
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            error: WebResourceError?,
                        ) {
                            if (request?.isForMainFrame == true) {
                                Log.e(
                                    TAG,
                                    "Bandit overlay load failed: ${request.url} ${error?.description}",
                                )
                            }
                        }
                    }
                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(message: ConsoleMessage?): Boolean {
                            Log.i(TAG, "WebView: ${message?.message()}")
                            return true
                        }
                    }
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.useWideViewPort = true
                    settings.loadWithOverviewMode = true
                    settings.mediaPlaybackRequiresUserGesture = false
                    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
                    setBackgroundColor(0) // Set transparent background
                    loadUrl(httpUrl)
                }
            },
            modifier = Modifier.fillMaxSize()
        )
    }
}

private const val TAG = "SlotsOverlay"
