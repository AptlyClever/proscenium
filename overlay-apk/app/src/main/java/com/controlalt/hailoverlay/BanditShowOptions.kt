package com.controlalt.hailoverlay

/**
 * Optional Bandit show parameters forwarded from Proscenium/LCARD into the
 * Overlay WebView URL query string.
 */
data class BanditShowOptions(
    val wsUrlOverride: String? = null,
    val audioOutput: String? = null,
    val anchor: String? = null,
    val size: String? = null,
    val revision: String? = null,
)
