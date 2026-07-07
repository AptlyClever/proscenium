package com.controlalt.hailoverlay

import android.view.ViewGroup
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
                        // Keep navigation within the WebView
                    }
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.useWideViewPort = true
                    settings.loadWithOverviewMode = true
                    setBackgroundColor(0) // Set transparent background
                    loadUrl(httpUrl)
                }
            },
            modifier = Modifier.fillMaxSize()
        )
    }
}
