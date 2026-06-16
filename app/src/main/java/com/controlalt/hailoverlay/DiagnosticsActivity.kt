package com.controlalt.hailoverlay

import android.content.Context
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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

class DiagnosticsActivity : ComponentActivity() {

    private var overlayGranted by mutableStateOf(false)
    private var readiness by mutableStateOf(HailOverlayServiceHolder.snapshot())

    override fun onCreate(savedInstanceState: Bundle?) {
        window.setBackgroundDrawableResource(android.R.color.black)
        super.onCreate(savedInstanceState)
        refreshState()
        setContent {
            MaterialTheme {
                DiagnosticsScreen(
                    overlayGranted = overlayGranted,
                    readiness = readiness,
                    onRefresh = { refreshState() },
                    onOpenOverlaySettings = { openOverlaySettings() },
                    onStartService = {
                        HailOverlayService.start(applicationContext)
                        refreshState()
                    },
                    onStopService = {
                        HailOverlayService.stop(applicationContext)
                        refreshState()
                    },
                    onTriggerPreset = { preset -> triggerPreset(preset) },
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
        readiness = HailOverlayServiceHolder.snapshot()
    }

    private fun openOverlaySettings() {
        startActivity(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName"),
            ),
        )
    }

    private fun triggerPreset(preset: DiagnosticsTransporterPresets.Preset) {
        if (!Settings.canDrawOverlays(this)) {
            return
        }
        val hail = DiagnosticsTransporterPresets.buildValidatedHail(preset) ?: return
        if (!readiness.serviceRunning) {
            HailOverlayService.start(applicationContext)
            refreshState()
        }
        PreviewOverlayTrigger.show(this, hail)
    }

    companion object {
        fun openIntent(context: Context): Intent {
            return Intent(context, DiagnosticsActivity::class.java).apply {
                action = OverlayAppRouting.ACTION_OPEN_DIAGNOSTICS
            }
        }
    }
}

@Composable
private fun DiagnosticsScreen(
    overlayGranted: Boolean,
    readiness: HailOverlayServiceHolder.Readiness,
    onRefresh: () -> Unit,
    onOpenOverlaySettings: () -> Unit,
    onStartService: () -> Unit,
    onStopService: () -> Unit,
    onTriggerPreset: (DiagnosticsTransporterPresets.Preset) -> Unit,
) {
    val scrollState = rememberScrollState()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .verticalScroll(scrollState)
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
        StatusLine("Service", if (readiness.serviceRunning) "running" else "stopped")
        StatusLine(
            "Listener",
            when {
                readiness.listenerListening -> "listening on port ${readiness.port}"
                readiness.lastStartupError != null -> "not ready — ${readiness.lastStartupError}"
                readiness.serviceRunning -> "starting"
                else -> "stopped"
            },
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "Trigger transporter (full lifecycle)\nNothing plays until you press a button below.",
            fontSize = 22.sp,
            color = Color(0xFFB8B8B8),
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(16.dp))
        DiagnosticsTransporterPresets.parityPresets.forEach { preset ->
            Button(
                onClick = { onTriggerPreset(preset) },
                enabled = overlayGranted,
                modifier = Modifier.widthIn(min = 360.dp),
            ) {
                Text(preset.buttonLabel)
            }
            Spacer(modifier = Modifier.height(12.dp))
        }
        Text(
            text = "~8.8s total — entrance, 5.5s stable hold, exit",
            fontSize = 18.sp,
            color = Color(0xFF7A7A7A),
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = onStartService, modifier = Modifier.widthIn(min = 360.dp)) {
            Text(if (readiness.listenerListening) "Restart hail listener" else "Start / retry hail listener")
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(onClick = onStopService, modifier = Modifier.widthIn(min = 360.dp)) {
            Text("Stop hail listener service")
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(onClick = onOpenOverlaySettings, modifier = Modifier.widthIn(min = 360.dp)) {
            Text("Open overlay permission settings")
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(onClick = onRefresh, modifier = Modifier.widthIn(min = 360.dp)) {
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
