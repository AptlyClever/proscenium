package com.controlalt.hailoverlay

import androidx.compose.ui.graphics.Color

enum class TransporterPhase {
    ENTRANCE,
    STABLE,
    EXIT,
    CLEARED,
}

data class HailPalette(
    val beamCyan: Color,
    val beamWhite: Color,
    val beamBase: Color,
    val messageColor: Color,
    val backdropTint: Color,
    val messageBacking: Color,
    val messageBackingOpacity: Float,
)

fun paletteFor(paletteId: String): HailPalette {
    return when (paletteId) {
        "cute_purple" -> HailPalette(
            beamCyan = Color(0xFFF472B6),
            beamWhite = Color(0xFFFFF1FA),
            beamBase = Color(0xFF4C1D95),
            messageColor = Color(0xFFFFF1FA),
            backdropTint = Color(0xFF2E1048),
            messageBacking = Color(0xFF140A1C),
            messageBackingOpacity = 0.5f,
        )
        "transporter_white" -> HailPalette(
            beamCyan = Color(0xFFE8FFFF),
            beamWhite = Color(0xFFFFFFFF),
            beamBase = Color(0xFF1F2937),
            messageColor = Color(0xFFFFFFFF),
            backdropTint = Color(0xFF161E28),
            messageBacking = Color(0xFF101820),
            messageBackingOpacity = 0.5f,
        )
        "transporter_generation_next" -> HailPalette(
            beamCyan = Color(0xFF4A8CC8),
            beamWhite = Color(0xFFB8D8F8),
            beamBase = Color(0xFF1A2A3D),
            messageColor = Color(0xFFE8F4FF),
            backdropTint = Color(0xFF101C30),
            messageBacking = Color(0xFF101820),
            messageBackingOpacity = 0.5f,
        )
        "transporter_spoon" -> HailPalette(
            beamCyan = Color(0xFFB8923A),
            beamWhite = Color(0xFFF0D890),
            beamBase = Color(0xFF3D2E14),
            messageColor = Color(0xFFFFF4D8),
            backdropTint = Color(0xFF241A0A),
            messageBacking = Color(0xFF1A1408),
            messageBackingOpacity = 0.52f,
        )
        else -> HailPalette(
            beamCyan = Color(0xFF4AF2C5),
            beamWhite = Color(0xFFE8FFFF),
            beamBase = Color(0xFF0B3D2E),
            messageColor = Color(0xFFEAFBF4),
            backdropTint = Color(0xFF0A2E24),
            messageBacking = Color(0xFF121618),
            messageBackingOpacity = 0.5f,
        )
    }
}
