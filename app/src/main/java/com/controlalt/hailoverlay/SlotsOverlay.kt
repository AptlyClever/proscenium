package com.controlalt.hailoverlay

import android.media.AudioManager
import android.media.ToneGenerator
import android.util.Log
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

private const val TAG = "SlotsOverlay"

// Symbol descriptors
private val SYMBOLS = mapOf(
    "STAR" to Pair("⭐", Color(0xFFFFD700)),  // Gold
    "ALT" to Pair("⚙️", Color(0xFF00FFFF)),   // Cyan
    "CTRL" to Pair("🖥️", Color(0xFFFF00FF)),  // Magenta
    "CHIP" to Pair("🪙", Color(0xFFFFCC00)),  // Yellow
    "FAIL" to Pair("❌", Color(0xFFFF4444))   // Red
)

@Composable
fun SlotsOverlay(
    state: OverlayController.OverlayState,
    onDismiss: () -> Unit,
) {
    val scope = rememberCoroutineScope()

    // Game state variables
    var balance by remember { mutableStateOf(100.0f) }
    var wager by remember { mutableStateOf(1.0f) }
    var winAmount by remember { mutableStateOf(0.0f) }
    var statusText by remember { mutableStateOf("Ready to Spin") }
    var connectionStatus by remember { mutableStateOf("Connecting...") }

    // Reel display symbols (3 rows x 3 columns)
    val reel1 = remember { mutableStateListOf("STAR", "ALT", "CTRL") }
    val reel2 = remember { mutableStateListOf("ALT", "CTRL", "STAR") }
    val reel3 = remember { mutableStateListOf("CTRL", "STAR", "ALT") }

    // Spinning flags
    var isSpinning1 by remember { mutableStateOf(false) }
    var isSpinning2 by remember { mutableStateOf(false) }
    var isSpinning3 by remember { mutableStateOf(false) }
    var isFlashWin by remember { mutableStateOf(false) }

    // Tone generator for retro synthesized audio
    val toneGen = remember {
        runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 100) }.getOrNull()
    }

    // WebSocket Reference
    val webSocketRef = remember { mutableStateOf<WebSocket?>(null) }

    // Sound helpers
    fun playReelStopSound() {
        toneGen?.startTone(ToneGenerator.TONE_PROP_BEEP2, 50)
    }

    fun playWinSound() {
        scope.launch(Dispatchers.Default) {
            toneGen?.startTone(ToneGenerator.TONE_CDMA_PIP, 150)
            delay(150)
            toneGen?.startTone(ToneGenerator.TONE_CDMA_PIP, 150)
            delay(150)
            toneGen?.startTone(ToneGenerator.TONE_CDMA_HIGH_L, 300)
        }
    }

    fun playLossSound() {
        toneGen?.startTone(ToneGenerator.TONE_SUP_ERROR, 250)
    }

    // Connect WebSocket
    DisposableEffect(Unit) {
        val wsUrl = state.message.trim().ifBlank {
            "ws://192.168.68.93:8766/api/games/slots/stream"
        }

        val client = OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build()

        val request = Request.Builder().url(wsUrl).build()

        val listener = object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                connectionStatus = "Connected"
                Log.d(TAG, "WS Connected to $wsUrl")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "WS Msg: $text")
                scope.launch(Dispatchers.Main) {
                    runCatching {
                        val json = JSONObject(text)
                        when (json.optString("event")) {
                            "session_started" -> {
                                val session = json.optJSONObject("session")
                                balance = session?.let { it.optDouble("balance", balance.toDouble()).toFloat() } ?: balance
                                statusText = "Session Active"
                            }
                            "spin_started" -> {
                                isFlashWin = false
                                winAmount = 0.0f
                                statusText = "Spinning..."
                                isSpinning1 = true
                                isSpinning2 = true
                                isSpinning3 = true
                            }
                            "spin_result" -> {
                                val pp = json.optJSONObject("presentation_payload")
                                val reelSymbols = pp?.optJSONArray("reels")
                                val outcome = pp?.optString("outcome_type") ?: ""
                                val won = pp?.let { it.optDouble("payout_amount", 0.0).toFloat() } ?: 0.0f
                                val endBalance = json.optDouble("balance", balance.toDouble()).toFloat()

                                if (reelSymbols != null && reelSymbols.length() >= 3) {
                                    val r1 = reelSymbols.getString(0)
                                    val r2 = reelSymbols.getString(1)
                                    val r3 = reelSymbols.getString(2)

                                    // Staggered reel landing animation sequence
                                    scope.launch {
                                        // Reel 1 stop
                                        delay(350)
                                        isSpinning1 = false
                                        reel1[1] = r1
                                        playReelStopSound()

                                        // Reel 2 stop
                                        delay(350)
                                        isSpinning2 = false
                                        reel2[1] = r2
                                        playReelStopSound()

                                        // Reel 3 stop
                                        delay(350)
                                        isSpinning3 = false
                                        reel3[1] = r3
                                        playReelStopSound()

                                        // Update status and play outcome sounds
                                        balance = endBalance
                                        winAmount = won
                                        if (won > 0) {
                                            statusText = "Winner: +${won.toString()} CC!"
                                            isFlashWin = true
                                            playWinSound()
                                        } else {
                                            statusText = outcome.uppercase().ifBlank { "Try Again" }
                                            playLossSound()
                                        }
                                    }
                                }
                            }
                            "spin_failed" -> {
                                isSpinning1 = false
                                isSpinning2 = false
                                isSpinning3 = false
                                statusText = "Spin Failed: " + json.optString("error")
                            }
                            "session_closed" -> {
                                statusText = "Session Closed"
                                delay(2000)
                                onDismiss()
                            }
                        }
                    }
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                connectionStatus = "Disconnected"
                Log.e(TAG, "WS Error", t)
            }
        }

        val ws = client.newWebSocket(request, listener)
        webSocketRef.value = ws

        onDispose {
            ws.close(1000, "Overlay dismissed")
            toneGen?.release()
        }
    }

    // Reel spinning tick effect
    LaunchedEffect(isSpinning1, isSpinning2, isSpinning3) {
        val allSymbols = SYMBOLS.keys.toList()
        while (isSpinning1 || isSpinning2 || isSpinning3) {
            delay(60)
            if (isSpinning1) {
                reel1[0] = allSymbols.random()
                reel1[1] = allSymbols.random()
                reel1[2] = allSymbols.random()
            }
            if (isSpinning2) {
                reel2[0] = allSymbols.random()
                reel2[1] = allSymbols.random()
                reel2[2] = allSymbols.random()
            }
            if (isSpinning3) {
                reel3[0] = allSymbols.random()
                reel3[1] = allSymbols.random()
                reel3[2] = allSymbols.random()
            }
        }
    }

    // Full screen overlay UI layout
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xE60A0A0C)), // Matte dark backdrop overlay
        contentAlignment = Alignment.Center
    ) {
        // Cabinet Box container
        Column(
            modifier = Modifier
                .width(550.dp)
                .wrapContentHeight()
                .clip(RoundedCornerShape(24.dp))
                .background(Color(0xFF141418))
                .border(2.dp, Color(0xFF2C2C35), RoundedCornerShape(24.dp))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header: Display title & connection status tag
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "MYSTERY REELS",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 2.sp
                )
                Text(
                    text = connectionStatus,
                    color = if (connectionStatus == "Connected") Color(0xFF00FFCC) else Color(0xFFFF3366),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Cabinet Screen: Reels Window
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFF070709))
                    .border(2.dp, Color(0xFF202026), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                // Background shadow gradients to simulate reel depth
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color(0xFF000000),
                                    Color.Transparent,
                                    Color(0xFF000000)
                                )
                            )
                        )
                )

                // Reel columns
                Row(
                    modifier = Modifier.fillMaxSize(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ReelColumnView(symbols = reel1, isSpinning = isSpinning1)
                    Box(modifier = Modifier.width(1.dp).fillMaxHeight().background(Color(0xFF1E1E24)))
                    ReelColumnView(symbols = reel2, isSpinning = isSpinning2)
                    Box(modifier = Modifier.width(1.dp).fillMaxHeight().background(Color(0xFF1E1E24)))
                    ReelColumnView(symbols = reel3, isSpinning = isSpinning3)
                }

                // Win flashing payline indicator
                val paylineColor = if (isFlashWin) {
                    val infiniteTransition = rememberInfiniteTransition(label = "flash")
                    val colorAlpha by infiniteTransition.animateFloat(
                        initialValue = 0.2f,
                        targetValue = 1.0f,
                        animationSpec = infiniteRepeatable(
                            animation = keyframes { durationMillis = 200 },
                            repeatMode = RepeatMode.Reverse
                        ),
                        label = "alpha"
                    )
                    Color(0xFFFFD700).copy(alpha = colorAlpha)
                } else {
                    Color(0xFFFF3366).copy(alpha = 0.6f)
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .background(paylineColor)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Payout Outcome message box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFF0A0A0C))
                    .border(1.dp, Color(0xFF22222A), RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = statusText.uppercase(),
                    color = if (isFlashWin) Color(0xFFFFD700) else Color(0xFFAAAAAA),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Bottom HUD: Credit balances & wager stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                HudItem(label = "WAGER", value = wager.toString() + " CC")
                HudItem(label = "PAID", value = winAmount.toString() + " CC")
                HudItem(label = "CREDITS", value = balance.toString() + " CC")
            }
        }
    }
}

@Composable
fun ReelColumnView(symbols: List<String>, isSpinning: Boolean) {
    Column(
        modifier = Modifier
            .width(120.dp)
            .fillMaxHeight(),
        verticalArrangement = Arrangement.SpaceAround,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        symbols.forEachIndexed { idx, symbol ->
            val isCenter = idx == 1
            val symData = SYMBOLS[symbol] ?: Pair("❓", Color.White)
            Text(
                text = symData.first,
                fontSize = if (isCenter && !isSpinning) 42.sp else 32.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .wrapContentSize()
                    .padding(vertical = 4.dp)
            )
        }
    }
}

@Composable
fun HudItem(label: String, value: String) {
    Column(
        modifier = Modifier
            .width(140.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFF09090C))
            .border(1.dp, Color(0xFF202028), RoundedCornerShape(8.dp))
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = label,
            color = Color(0xFF888899),
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace,
            letterSpacing = 1.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )
    }
}
