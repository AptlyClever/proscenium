package com.controlalt.hailoverlay

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * TV-visible transporter renderer — filament columns + animated particles.
 * Uses screen-space Paint Box anchors (glyph center + beam rect) proven on Arcade.
 */
object TransporterCanvasRenderer {

    private const val PARTICLE_SEED = 42
  /** Web-preview alphas are too faint on Android TV over live content. */
    private const val TV_ALPHA_BOOST = 6.5f
    private const val TV_PARTICLE_RADIUS_SCALE = 2.4f

    private data class PaletteRoles(
        val primary: Color,
        val accent: Color,
        val glow: Color,
        val particle: Color,
    )

    data class BeamBounds(
        val cx: Float,
        val cy: Float,
        val bw: Float,
        val bh: Float,
        val top: Float,
        val bottom: Float,
    )

    private fun rolesFor(paletteId: String): PaletteRoles {
        return when (paletteId) {
            "transporter_white" -> PaletteRoles(
                primary = Color(0xFF6A8A9A),
                accent = Color(0xFFE8F4FF),
                glow = Color(0xFFD0E8F8),
                particle = Color(0xFFF8FCFF),
            )
            "transporter_generation_next" -> PaletteRoles(
                primary = Color(0xFF4A8CC8),
                accent = Color(0xFFD8ECFF),
                glow = Color(0xFF6AAEE8),
                particle = Color(0xFFB8D8F8),
            )
            "transporter_spoon" -> PaletteRoles(
                primary = Color(0xFFB8923A),
                accent = Color(0xFFF5E6B8),
                glow = Color(0xFFD4A84A),
                particle = Color(0xFFF0D890),
            )
            "axiom_dark_cyan" -> PaletteRoles(
                primary = Color(0xFF32B5A0),
                accent = Color(0xFF7EE8D8),
                glow = Color(0xFF5FD4C4),
                particle = Color(0xFFA8F0E8),
            )
            "cute_purple" -> PaletteRoles(
                primary = Color(0xFF9B5A8C),
                accent = Color(0xFFC878A8),
                glow = Color(0xFFC878A8),
                particle = Color(0xFFE8B8D8),
            )
            else -> rolesFor("transporter_white")
        }
    }

    private fun particleBudget(sizeTier: PaintBoxTier, heavy: Boolean): Int {
        val base = when (sizeTier.tierId) {
            "small", "s" -> if (heavy) 18 else 6
            "large", "l" -> if (heavy) 40 else 12
            else -> if (heavy) 28 else 8
        }
        return base
    }

    fun resolveBeamBounds(
        regions: PaintBoxLayout.Regions,
        profile: TransporterVariationProfile,
        beamScale: Float,
        beamReveal: Float,
        dematerializing: Boolean,
    ): BeamBounds {
        val widthMul = profile.beamWidthMultiplier
        val heightMul = profile.beamHeightMultiplier
        val cx = regions.glyphCenterX
        val fullTop = regions.safeZoneTop - regions.beamHeight * 0.12f
        val fullBottom = regions.contentFootY + regions.beamHeight * 0.15f
        val span = (fullBottom - fullTop).coerceAtLeast(48f)
        val revealedBottom = fullTop + span * beamReveal.coerceIn(0.05f, 1f)
        val bw = regions.beamWidth * widthMul * beamScale
        val bh = regions.beamHeight * heightMul * beamScale
        val cy = regions.glyphVisualCenterY
        val top = if (dematerializing) {
            fullTop + span * (1f - beamReveal.coerceIn(0f, 1f)) * 0.35f
        } else {
            fullTop
        }
        val bottom = if (dematerializing) {
            min(revealedBottom, cy + bh * 0.35f)
        } else {
            max(revealedBottom, cy + bh * 0.2f)
        }
        return BeamBounds(cx, cy, bw, bh, top, bottom)
    }

    private class Mulberry32(seed: Int) {
        private var state = seed

        fun next(): Float {
            state += 0x6d2b79f5
            var t = state
            t = imul32(t xor (t ushr 15), t or 1)
            t = t xor (t + imul32(t xor (t ushr 7), t or 61))
            return ((t xor (t ushr 14)) ushr 0) / 4294967296f
        }

        private fun imul32(a: Int, b: Int): Int = (a.toLong() * b).toInt()
    }

    private fun alphaTv(value: Float): Float = (value * TV_ALPHA_BOOST).coerceIn(0f, 1f)

    private fun DrawScope.drawSoftFilamentColumn(
        beam: BeamBounds,
        roles: PaletteRoles,
        beamOp: Float,
        glowMul: Float,
        shimmer: Float,
        widthScale: Float = 0.34f,
        opScale: Float = 1f,
    ) {
        val span = beam.bottom - beam.top
        if (span <= 1f) {
            return
        }
        val baseWidth = max(beam.bw * widthScale, 6f)
        val filaments = 4
        for (i in 0 until filaments) {
            val offset = (i - (filaments - 1) / 2f) * baseWidth * 0.22f
            val lineW = max(2f, baseWidth * (0.32f + i * 0.08f))
            val peak = alphaTv((0.42f + shimmer * if (i == 1 || i == 2) 1f else 0.6f) * beamOp * glowMul * opScale)
            val x = beam.cx + offset
            drawRect(
                brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                    colorStops = arrayOf(
                        0f to roles.primary.copy(alpha = alphaTv(0.08f * beamOp)),
                        0.28f to roles.accent.copy(alpha = peak * 0.65f),
                        0.55f to roles.accent.copy(alpha = peak),
                        0.82f to roles.glow.copy(alpha = peak * 0.45f),
                        1f to Color.Transparent,
                    ),
                    startY = beam.bottom,
                    endY = beam.top,
                ),
                topLeft = Offset(x - lineW / 2f, beam.top),
                size = Size(lineW, span),
            )
        }
    }

    private fun DrawScope.drawBeamColumn(
        beam: BeamBounds,
        roles: PaletteRoles,
        beamOp: Float,
        glowMul: Float,
        shimmer: Float,
    ) {
        val rx = max(beam.bw * 0.42f, 18f)
        val ry = max(beam.bh * 0.38f, 24f)
        drawCircle(
            brush = androidx.compose.ui.graphics.Brush.radialGradient(
                colors = listOf(
                    roles.accent.copy(alpha = alphaTv((0.38f + shimmer) * beamOp * glowMul)),
                    roles.primary.copy(alpha = alphaTv(0.22f * beamOp * glowMul)),
                    Color.Transparent,
                ),
                center = Offset(beam.cx, beam.cy),
                radius = max(rx, ry),
            ),
            radius = max(rx, ry),
            center = Offset(beam.cx, beam.cy),
        )
        drawSoftFilamentColumn(beam, roles, beamOp, glowMul, shimmer, widthScale = 0.36f, opScale = 0.9f)
    }

    private fun DrawScope.drawBeamShimmer(
        beam: BeamBounds,
        roles: PaletteRoles,
        beamOp: Float,
        glowMul: Float,
        shimmer: Float,
    ) {
        drawSoftFilamentColumn(beam, roles, beamOp * 0.9f, glowMul, shimmer, widthScale = 0.22f)
        drawSoftFilamentColumn(beam, roles, beamOp * 0.55f, glowMul * 0.85f, shimmer * 0.65f, widthScale = 0.34f)
        drawCircle(
            brush = androidx.compose.ui.graphics.Brush.radialGradient(
                colors = listOf(
                    roles.glow.copy(alpha = alphaTv(0.35f * beamOp * glowMul)),
                    roles.accent.copy(alpha = alphaTv(0.18f * beamOp)),
                    Color.Transparent,
                ),
                center = Offset(beam.cx, beam.cy),
                radius = max(beam.bw * 0.55f, 28f),
            ),
            radius = max(beam.bw * 0.55f, 28f),
            center = Offset(beam.cx, beam.cy),
        )
    }

    private fun DrawScope.drawScanfallParticles(
        beam: BeamBounds,
        roles: PaletteRoles,
        phase: Float,
        presence: Float,
        sizeTier: PaintBoxTier,
        dense: Boolean,
        heavy: Boolean,
    ) {
        val rand = Mulberry32(PARTICLE_SEED)
        val count = particleBudget(sizeTier, heavy)
        val spread = if (dense) 0.55f else 0.35f
        val speed = if (dense) 0.14f else 0.12f * 0.95f
        repeat(count) { i ->
            rand.next()
            val seed = rand.next()
            val travel = ((i / count.toFloat()) + phase * speed) % 1f
            val baseY = beam.bottom - (beam.bottom - beam.top) * travel
            val wobble = sin((i + phase * 3.5f) * 0.45f) * beam.bw * 0.1f * spread
            val x = beam.cx + wobble
            val alpha = alphaTv(
                (if (dense) 0.08f + seed * 0.12f else 0.06f + seed * 0.08f) * presence * 0.9f,
            )
            val radius = max(
                2f,
                (if (dense) 0.9f + seed * 1.4f else 0.7f + seed * 1.2f) *
                    TV_PARTICLE_RADIUS_SCALE * (if (dense) 1.15f else 1f),
            )
            drawCircle(
                color = roles.particle.copy(alpha = alpha),
                radius = radius,
                center = Offset(x, baseY),
            )
        }
    }

    private fun easeOutCubic(t: Float): Float = 1f - (1f - t) * (1f - t) * (1f - t)

    private fun DrawScope.drawSparkleRise(
        beam: BeamBounds,
        roles: PaletteRoles,
        phase: Float,
        presence: Float,
        sizeTier: PaintBoxTier,
    ) {
        val rand = Mulberry32(PARTICLE_SEED + 7)
        val count = max(14, particleBudget(sizeTier, heavy = true) - 6)
        repeat(count) { i ->
            val seed = rand.next()
            val travel = ((i / count.toFloat()) + phase * 0.1f) % 1f
            val rise = easeOutCubic(travel)
            val x = beam.cx + sin(i * 1.7f + phase * 2.2f) * beam.bw * 0.24f * (0.35f + seed)
            val y = beam.bottom - (beam.bottom - beam.top) * rise
            val alpha = alphaTv((0.16f + seed * 0.32f) * presence * (1f - rise * 0.3f))
            val radius = max(2f, (1.2f + seed * 2.4f) * TV_PARTICLE_RADIUS_SCALE * (1.05f - rise * 0.2f))
            drawCircle(
                color = roles.accent.copy(alpha = alpha),
                radius = radius,
                center = Offset(x, y),
            )
        }
    }

    private fun DrawScope.drawShowerCurtain(
        beam: BeamBounds,
        roles: PaletteRoles,
        wipeT: Float,
        beamOp: Float,
    ) {
        val progress = wipeT.coerceIn(0f, 1f)
        if (progress <= 0.02f) {
            return
        }
        val front = beam.top + (beam.bottom - beam.top) * progress
        val streaks = 14
        repeat(streaks) { i ->
            val seed = (i + 1) * 0.17f
            val x = beam.cx + sin(i * 1.3f) * beam.bw * 0.42f
            val alpha = alphaTv((0.08f + seed * 0.12f) * beamOp * progress)
            drawLine(
                color = roles.accent.copy(alpha = alpha),
                start = Offset(x, beam.top - beam.bh * 0.05f),
                end = Offset(x + sin(i.toFloat()) * 4f, front),
                strokeWidth = max(1.5f, beam.bw * 0.035f),
            )
        }
    }

    private fun DrawScope.drawScanPulses(
        beam: BeamBounds,
        roles: PaletteRoles,
        phase: Float,
        count: Int,
        beamOp: Float,
    ) {
        if (count <= 0) {
            return
        }
        repeat(count) { i ->
            val travel = ((phase + i * 0.22f) % 1f)
            val y = beam.bottom - (beam.bottom - beam.top) * travel
            val pulse = 0.5f + sin((phase + i) * Math.PI.toFloat() * 2f) * 0.5f
            val radius = max(6f, beam.bw * 0.14f * pulse)
            drawCircle(
                brush = androidx.compose.ui.graphics.Brush.radialGradient(
                    colors = listOf(
                        roles.glow.copy(alpha = alphaTv(0.35f * beamOp * pulse)),
                        roles.accent.copy(alpha = alphaTv(0.12f * beamOp)),
                        Color.Transparent,
                    ),
                    center = Offset(beam.cx, y),
                    radius = radius,
                ),
                radius = radius,
                center = Offset(beam.cx, y),
            )
        }
    }

    private fun DrawScope.drawPowerPellet(
        beam: BeamBounds,
        roles: PaletteRoles,
        strength: Float,
        beamOp: Float,
    ) {
        val s = strength.coerceIn(0f, 1f)
        if (s <= 0.02f) {
            return
        }
        val radius = max(beam.bw * 0.28f, 14f)
        drawCircle(
            brush = androidx.compose.ui.graphics.Brush.radialGradient(
                colors = listOf(
                    roles.accent.copy(alpha = alphaTv(0.55f * s * beamOp)),
                    roles.glow.copy(alpha = alphaTv(0.22f * s * beamOp)),
                    Color.Transparent,
                ),
                center = Offset(beam.cx, beam.cy),
                radius = radius,
            ),
            radius = radius,
            center = Offset(beam.cx, beam.cy),
        )
    }

    private fun DrawScope.drawSwirlParticles(
        beam: BeamBounds,
        roles: PaletteRoles,
        phase: Float,
        presence: Float,
        sizeTier: PaintBoxTier,
    ) {
        val rand = Mulberry32(PARTICLE_SEED + 19)
        val count = max(10, particleBudget(sizeTier, heavy = true) / 2)
        repeat(count) { i ->
            val seed = rand.next()
            val angle = phase * Math.PI.toFloat() * 2f + i * 0.9f
            val radius = beam.bw * (0.18f + seed * 0.28f)
            val y = beam.cy + sin(phase * 3f + i) * beam.bh * 0.12f
            val x = beam.cx + kotlin.math.cos(angle) * radius
            val alpha = alphaTv((0.14f + seed * 0.2f) * presence)
            drawCircle(
                color = roles.particle.copy(alpha = alpha),
                radius = max(2f, (1.4f + seed * 2f) * TV_PARTICLE_RADIUS_SCALE),
                center = Offset(x, y),
            )
        }
    }

    private fun DrawScope.drawGlyphLocalResidual(
        cx: Float,
        cy: Float,
        stablePulse: Float,
        roles: PaletteRoles,
        shimmerIntensity: Float,
        intensity: Float,
        layoutSizePx: Float,
    ) {
        if (shimmerIntensity < 0.2f || intensity <= 0.01f) {
            return
        }
        val pulse = 0.5f + sin(stablePulse * Math.PI.toFloat() * 2f) * 0.5f
        val baseR = layoutSizePx.coerceAtLeast(48f)
        val radius = baseR * (0.045f + shimmerIntensity * 0.028f)
        drawCircle(
            brush = androidx.compose.ui.graphics.Brush.radialGradient(
                colors = listOf(
                    roles.accent.copy(
                        alpha = alphaTv(0.1f * shimmerIntensity * intensity * (0.65f + pulse * 0.35f)),
                    ),
                    roles.glow.copy(alpha = alphaTv(0.04f * shimmerIntensity * intensity)),
                    Color.Transparent,
                ),
                center = Offset(cx, cy),
                radius = radius,
            ),
            radius = radius,
            center = Offset(cx, cy),
        )
        val sparkCount = when {
            shimmerIntensity > 0.45f -> 3
            shimmerIntensity > 0.28f -> 2
            else -> 1
        }
        repeat(sparkCount) { i ->
            val angle = stablePulse * Math.PI.toFloat() * 2f +
                (i / sparkCount.toFloat()) * Math.PI.toFloat() * 2f
            val dist = radius * (0.32f + sin(stablePulse * 3.2f + i * 1.7f) * 0.12f)
            val sx = cx + kotlin.math.cos(angle) * dist
            val sy = cy + sin(angle) * dist * 0.55f
            val sparkAlpha = alphaTv(0.07f * shimmerIntensity * intensity * (0.55f + pulse * 0.45f))
            if (sparkAlpha <= 0.01f) {
                return@repeat
            }
            drawCircle(
                color = roles.particle.copy(alpha = sparkAlpha),
                radius = 0.65f + shimmerIntensity * 0.45f,
                center = Offset(sx, sy),
            )
        }
    }

    fun DrawScope.drawTransporterFrame(
        regions: PaintBoxLayout.Regions,
        paletteId: String,
        variation: ResolvedTransporterVariation,
        frame: TransporterLifecycle.Frame,
    ) {
        if (regions.paintBoxWidth < 8f || !frame.beamActive) {
            return
        }

        val profile = variation.profile
        val roles = rolesFor(paletteId)
        val presence = (variation.beamOpacity * frame.beamIntensity).coerceIn(0f, 1f)
        val glowMul = 0.85f + presence * 0.25f
        val beamOp = frame.beamIntensity * (0.45f + presence * 0.5f) * (1f - frame.beamClearT * 0.65f)
        val shimmer = sin(frame.particlePhase * Math.PI.toFloat() * 2f) * 0.1f
        val scaledBeam = variation.beamScale * frame.beamScale

        if (beamOp <= 0.02f) {
            return
        }

        val beam = resolveBeamBounds(
            regions,
            profile,
            scaledBeam,
            frame.beamReveal,
            frame.dematerializing,
        )
        val phase = frame.particlePhase
        val vfx = profile.vfxLayers
        val wipeT = if (frame.dematerializing) {
            1f - phase
        } else {
            frame.beamReveal
        }
        val pelletStrength = if (frame.dematerializing) {
            (1f - phase).coerceIn(0f, 1f) * 0.65f
        } else {
            (frame.particlePhase * (1f - frame.beamClearT)).coerceIn(0f, 1f)
        }

        if (vfx.showerCurtain) {
            drawShowerCurtain(beam, roles, wipeT, beamOp)
        }
        if (vfx.scanPulseCount > 0) {
            drawScanPulses(beam, roles, phase, vfx.scanPulseCount, beamOp)
        }

        when (profile.particleStyle) {
            TransporterParticleStyle.SPARKLE_RISE -> {
                drawBeamShimmer(beam, roles, beamOp, glowMul, shimmer)
                drawSparkleRise(beam, roles, phase, presence, regions.tier)
            }
            TransporterParticleStyle.SCANFALL_DENSE -> {
                drawBeamColumn(beam, roles, beamOp, glowMul, shimmer)
                drawScanfallParticles(
                    beam,
                    roles,
                    phase,
                    presence,
                    regions.tier,
                    dense = true,
                    heavy = !frame.dematerializing,
                )
            }
            TransporterParticleStyle.SCANFALL -> {
                drawBeamColumn(beam, roles, beamOp, glowMul, shimmer)
                drawScanfallParticles(
                    beam,
                    roles,
                    phase,
                    presence,
                    regions.tier,
                    dense = false,
                    heavy = !frame.dematerializing,
                )
            }
        }

        if (vfx.swirlField) {
            drawSwirlParticles(beam, roles, phase, presence, regions.tier)
        }
        if (vfx.powerPellet) {
            drawPowerPellet(beam, roles, pelletStrength, beamOp)
        }
    }

    fun DrawScope.drawTransporterStableFrame(
        regions: PaintBoxLayout.Regions,
        paletteId: String,
        variation: ResolvedTransporterVariation,
        stablePulse: Float,
        glyphResidualIntensity: Float = 1f,
        stableInterest: StableInterest? = null,
    ) {
        if (regions.paintBoxWidth < 8f) {
            return
        }
        val interest = stableInterest?.takeIf { it.glyphLocalResidual }
        if (interest == null) {
            return
        }
        val shimmer = interest.glyphShimmerIntensity.coerceIn(0.18f, 0.55f)
        val layoutSize = min(regions.paintBoxWidth, regions.paintBoxHeight)
        drawGlyphLocalResidual(
            cx = regions.glyphCenterX,
            cy = regions.glyphVisualCenterY,
            stablePulse = stablePulse,
            roles = rolesFor(paletteId),
            shimmerIntensity = shimmer,
            intensity = glyphResidualIntensity.coerceIn(0f, 1f),
            layoutSizePx = layoutSize,
        )
    }
}
