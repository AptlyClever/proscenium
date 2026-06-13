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
        window.setBackgroundDrawableResource(android.R.color.black)
        super.onCreate(savedInstanceState)

        if (!shouldShowDiagnostics(intent)) {
            HailOverlayService.start(this)
            finish()
            return
        }

        refreshState()
        setContent {
            MaterialTheme {
                DiagnosticsScreen(
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

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (!shouldShowDiagnostics(intent)) {
            HailOverlayService.start(this)
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        if (shouldShowDiagnostics(intent)) {
            refreshState()
        }
    }

    private fun refreshState() {
        overlayGranted = Settings.canDrawOverlays(this)
        serviceRunning = HailOverlayServiceHolder.isRunning
    }

    private fun openOverlaySettings() {
        val settingsIntent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:$packageName"),
        )
        startActivity(settingsIntent)
    }

    private fun previewOverlay() {
        if (!Settings.canDrawOverlays(this)) {
            return
        }
        val hail = buildPreviewHail() ?: return
        if (!serviceRunning) {
            HailOverlayService.start(this)
            refreshState()
        }
        PreviewOverlayTrigger.show(this, hail)
    }

    private fun buildPreviewHail(): HailRegistry.ValidatedHail? {
        val hailId = "hail.sniffer.001"
        val effectId = "transporter_beam"
        val glyphId = "hail-sniffer"
        val paletteId = "axiom_dark_cyan"
        val message = "What's sniffing?"
        val durationMs = 5_500L
        val placement = Placement.resolve("upper_center", Placement.MODE_PRESET, null, null).getOrNull()
            ?: return null
        val proofPayload = OverlayBrokerGate.brokerProofPayloadFromValidated(
            hailId = hailId,
            effectId = effectId,
            glyphId = glyphId,
            paletteId = paletteId,
            message = message,
            durationMs = durationMs,
            placement = placement,
        )
        val brokerProof = OverlayBrokerGate.computeProof(
            OverlayBrokerGate.resolveConfiguredSecret(),
            proofPayload,
        )
        return HailRegistry.validate(
            hailId = hailId,
            effectId = effectId,
            glyphId = glyphId,
            paletteId = paletteId,
            message = message,
            durationMs = durationMs,
            placementId = "upper_center",
            placementMode = Placement.MODE_PRESET,
            xPercent = null,
            yPercent = null,
            brokerProof = brokerProof,
        ).getOrNull()
    }

    companion object {
        const val EXTRA_SHOW_DIAGNOSTICS = "show_diagnostics"

        fun diagnosticsIntent(context: android.content.Context): Intent {
            return Intent(context, MainActivity::class.java).putExtra(EXTRA_SHOW_DIAGNOSTICS, true)
        }

        private fun shouldShowDiagnostics(intent: Intent?): Boolean {
            return intent?.getBooleanExtra(EXTRA_SHOW_DIAGNOSTICS, false) == true
        }
    }
}

object HailOverlayServiceHolder {
    var isRunning: Boolean = false
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

@Composable
private fun DiagnosticsScreen(
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
            .background(Color.Black)
            .padding(48.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Control Alt Hails — Diagnostics",
            fontSize = 36.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFE6E6E6),
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Package: com.controlalt.hailoverlay\nHTTP: POST /hail/show on port ${HailRegistry.HTTP_PORT}",
            fontSize = 20.sp,
            color = Color(0xFF9A9A9A),
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
        color = Color(0xFFE6E6E6),
        textAlign = TextAlign.Center,
        modifier = Modifier.padding(vertical = 4.dp),
    )
}
