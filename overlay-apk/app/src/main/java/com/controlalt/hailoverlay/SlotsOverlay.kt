package com.controlalt.hailoverlay

import android.util.Log
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView

@Composable
fun SlotsOverlay(
    options: BanditShowOptions = BanditShowOptions(),
    onDismiss: () -> Unit,
) {
    val rawUrl = options.wsUrlOverride?.trim()?.ifBlank { null }
        ?: "ws://192.168.68.93:8766/api/games/slots/stream"

    val baseHttpUrl = rawUrl
        .replace("ws://", "http://")
        .replace("wss://", "https://")
        .replace("/api/games/slots/stream", "/overlay?embed=apk")

    // Cache-bust so Bandit redeploys reach the TV WebView without a manual
    // DevTools reload. Server also sends no-cache headers for HTML/JS/CSS.
    val query = linkedMapOf<String, String>()
    options.audioOutput?.takeIf { it.isNotBlank() }?.let { query["audio_output"] = it }
    options.anchor?.takeIf { it.isNotBlank() }?.let { query["anchor"] = it }
    options.size?.takeIf { it.isNotBlank() }?.let { query["size"] = it }
    options.revision?.takeIf { it.isNotBlank() }?.let { query["revision"] = it }
    query["_cb"] = System.currentTimeMillis().toString()
    val sep = if (baseHttpUrl.contains("?")) "&" else "?"
    val httpUrl = baseHttpUrl + sep + query.entries.joinToString("&") { (k, v) ->
        "$k=${java.net.URLEncoder.encode(v, "UTF-8")}"
    }
    Log.i(TAG, "Bandit overlay URL prepared: $httpUrl")

    // Keep an explicit handle so dismiss / composition disposal always destroys
    // the Chromium target. Without this, show/dismiss stacks live WebViews that
    // keep consuming the Bandit session stream and layer stop audio.
    val webViewRef = remember { arrayOfNulls<WebView>(1) }

    DisposableEffect(Unit) {
        onDispose {
            destroyBanditWebView(webViewRef[0])
            webViewRef[0] = null
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
    ) {
        AndroidView(
            factory = { context ->
                WebView(context).apply {
                    webViewRef[0] = this
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
                                      const videos = document.querySelectorAll("#presentation-vfx-video, #presentation-vfx-tv-video");
                                      videos.forEach((video) => {
                                        if (!video || video.dataset.apkVfxProbe) return;
                                        video.dataset.apkVfxProbe = "true";
                                        video.addEventListener("playing", () => {
                                          console.info("Bandit APK VFX playing: " + video.currentSrc);
                                        });
                                        video.addEventListener("error", () => {
                                          console.error("Bandit APK VFX error: " + (video.error?.code || "unknown"));
                                        });
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
                                    "Bandit overlay load failed: ${request.url} ${error?.description}; retrying in ${RETRY_DELAY_MS}ms",
                                )
                                // Never park Chrome's opaque error page over live
                                // TV content: go transparent and retry until the
                                // Bandit server is reachable again.
                                view?.loadUrl("about:blank")
                                view?.postDelayed({
                                    if (view === webViewRef[0]) {
                                        view.loadUrl(httpUrl)
                                    }
                                }, RETRY_DELAY_MS)
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
                    settings.cacheMode = WebSettings.LOAD_NO_CACHE
                    clearCache(true)
                    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
                    setBackgroundColor(0) // Set transparent background
                    loadUrl(httpUrl)
                }
            },
            modifier = Modifier.fillMaxSize(),
            onRelease = { webView ->
                if (webViewRef[0] === webView) {
                    webViewRef[0] = null
                }
                destroyBanditWebView(webView)
            },
        )
    }
}

internal fun destroyBanditWebView(webView: WebView?) {
    if (webView == null) return
    if (webView.tag == DESTROYED_TAG) return
    webView.tag = DESTROYED_TAG
    runCatching {
        webView.stopLoading()
        webView.handler?.removeCallbacksAndMessages(null)
        webView.loadUrl("about:blank")
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.removeAllViews()
        webView.destroy()
        Log.i(TAG, "Bandit WebView destroyed")
    }.onFailure { error ->
        Log.w(TAG, "Bandit WebView destroy failed: ${error.message}")
    }
}

private const val TAG = "SlotsOverlay"
private const val DESTROYED_TAG = "bandit-webview-destroyed"
private const val RETRY_DELAY_MS = 3_000L
