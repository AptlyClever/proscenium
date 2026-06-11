package com.controlalt.hailoverlay

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {

    private var overlayGranted by mutableStateOf(false)
    private var serviceRunning by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        refreshState()
        setContent {
            MaterialTheme {
                PocScreen(
                    overlayGranted = overlayGranted,
                    serviceRunning = serviceRunning,
                    onRefresh = { refreshState() },
                    onOpenOverlaySettings = { openOverlaySettings() },
                    onStartService = {
                        HailOverlayService.start(this)
                        refreshState()
                    },
                    onStopService = {
                        HailOverlayService.stop(this)
                        refreshState()
                    },
                    onPreviewOverlay = { previewOverlay() },
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        refreshState()
    }

    private fun refreshState() {
        overlayGranted = Settings.canDrawOverlays(this)
        serviceRunning = HailOverlayServiceHolder.isRunning
    }

    private fun openOverlaySettings() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:$packageName"),
        )
        startActivity(intent)
    }

    private fun previewOverlay() {
        if (!Settings.canDrawOverlays(this)) {
            return
        }
        HailAllowlist.validate(
            effectId = "transporter_beam",
            glyphId = "hail-sniffer",
            message = "What's sniffing?",
            durationMs = 5_500L,
        ).getOrNull()?.let { hail ->
            if (!serviceRunning) {
                HailOverlayService.start(this)
                refreshState()
            }
            PreviewOverlayTrigger.show(this, hail)
        }
    }
}

object HailOverlayServiceHolder {
    var isRunning: Boolean = false
}

object PreviewOverlayTrigger {
    private var controller: OverlayController? = null

    fun show(context: android.content.Context, hail: HailAllowlist.ValidatedHail) {
        if (controller == null) {
            controller = OverlayController(context.applicationContext)
        }
        controller?.show(hail)
    }
}

@Composable
private fun PocScreen(
    overlayGranted: Boolean,
    serviceRunning: Boolean,
    onRefresh: () -> Unit,
    onOpenOverlaySettings: () -> Unit,
    onStartService: () -> Unit,
    onStopService: () -> Unit,
    onPreviewOverlay: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B3D2E))
            .padding(48.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Control Alt Hail Overlay PoC",
            fontSize = 36.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFEAFBF4),
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Package: com.controlalt.hailoverlay\nHTTP: POST /hail/show on port ${HailAllowlist.HTTP_PORT}",
            fontSize = 20.sp,
            color = Color(0xFFB8EAD8),
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(32.dp))
        StatusLine("Overlay permission", if (overlayGranted) "granted" else "missing (use ADB on Google TV)")
        StatusLine("Listener service", if (serviceRunning) "running" else "stopped")
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = onStartService, modifier = Modifier.widthIn(min = 280.dp)) {
            Text("Start hail listener service")
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(onClick = onStopService, modifier = Modifier.widthIn(min = 280.dp)) {
            Text("Stop hail listener service")
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(onClick = onPreviewOverlay, modifier = Modifier.widthIn(min = 280.dp)) {
            Text("Preview overlay on device")
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(onClick = onOpenOverlaySettings, modifier = Modifier.widthIn(min = 280.dp)) {
            Text("Open overlay permission settings")
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(onClick = onRefresh, modifier = Modifier.widthIn(min = 280.dp)) {
            Text("Refresh status")
        }
    }
}

@Composable
private fun StatusLine(label: String, value: String) {
    Text(
        text = "$label: $value",
        fontSize = 22.sp,
        color = Color(0xFFEAFBF4),
        textAlign = TextAlign.Center,
        modifier = Modifier.padding(vertical = 4.dp),
    )
}
