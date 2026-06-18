package com.controlalt.hailoverlay

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt
import com.controlalt.hailoverlay.TransporterCanvasRenderer.drawTransporterFrame
import com.controlalt.hailoverlay.TransporterCanvasRenderer.drawTransporterStableFrame

@Composable
fun TransporterOverlay(
    glyphId: String,
    message: String,
    paletteId: String,
    placement: Placement.Resolved,
    sizeTier: PaintBoxTier = PaintBoxTier.MEDIUM,
    transporterVariation: ResolvedTransporterVariation = ResolvedTransporterVariation(
        profile = TransporterVariationProfile.DEFAULT,
        beamScale = 1f,
        beamOpacity = 0.78f,
    ),
    choreography: EffectChoreography = EffectChoreography(),
    proceduralGraph: ProceduralGraphSpec? = null,
    packageLayout: PackageLayoutV2? = null,
    palettePresentation: PalettePresentation? = null,
    lifecycleTiming: LifecycleTiming = LifecycleTiming(),
    stableHoldMs: Long,
    onLifecycleComplete: () -> Unit,
) {
    val palette = paletteFor(paletteId)
    val presentation = palettePresentation ?: PalettePresentation.fromJson(null, paletteId)
    var phase by remember { mutableStateOf(TransporterPhase.ENTRANCE) }
    val entranceProgress = remember { Animatable(0f) }
    val exitProgress = remember { Animatable(1f) }
    var stablePulse by remember { mutableStateOf(0f) }
    var stableElapsedMs by remember { mutableStateOf(0L) }
    val messageSidekick = remember(packageLayout, stableHoldMs) {
        packageLayout?.messageSidekick
            ?: MessageSidekickTiming.fromJson(null, stableHoldMs)
    }

    LaunchedEffect(glyphId, message, stableHoldMs, lifecycleTiming) {
        phase = TransporterPhase.ENTRANCE
        entranceProgress.snapTo(0f)
        stableElapsedMs = 0L
        entranceProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(
                durationMillis = lifecycleTiming.entranceMs.toInt().coerceAtLeast(1),
                easing = LinearEasing,
            ),
        )
        phase = TransporterPhase.STABLE
        val stableStart = System.currentTimeMillis()
        val stableEnd = stableStart + stableHoldMs
        while (System.currentTimeMillis() < stableEnd) {
            val now = System.currentTimeMillis()
            stableElapsedMs = now - stableStart
            stablePulse = ((now % 2400L) / 2400f)
            kotlinx.coroutines.delay(16)
        }
        stableElapsedMs = stableHoldMs
        phase = TransporterPhase.EXIT
        exitProgress.snapTo(1f)
        exitProgress.animateTo(
            targetValue = 0f,
            animationSpec = tween(
                durationMillis = lifecycleTiming.exitMs.toInt().coerceAtLeast(1),
                easing = LinearEasing,
            ),
        )
        phase = TransporterPhase.CLEARED
        onLifecycleComplete()
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val density = LocalDensity.current
        val screenW = with(density) { maxWidth.toPx() }
        val screenH = with(density) { maxHeight.toPx() }
        val scaledPackage = remember(screenW, screenH, packageLayout) {
            packageLayout?.scaleToScreen(screenW, screenH)
        }
        val regions = remember(screenW, screenH, placement, sizeTier, transporterVariation, scaledPackage) {
            if (scaledPackage != null) {
                scaledPackage.toPaintBoxRegions(sizeTier)
            } else {
                PaintBoxLayout.resolve(screenW, screenH, placement, sizeTier, transporterVariation)
            }
        }
        val beamPresence = transporterVariation.beamOpacity

        val entrance = entranceProgress.value
        val exit = exitProgress.value
        val frame = when (phase) {
            TransporterPhase.ENTRANCE -> TransporterLifecycle.computeEntranceFrame(
                entranceT = entrance,
                choreography = choreography,
                beamPresence = beamPresence,
                messageSidekick = messageSidekick,
                timing = lifecycleTiming,
            )
            TransporterPhase.STABLE -> TransporterLifecycle.computeStableFrame(
                stablePulse = stablePulse,
                stableElapsedMs = stableElapsedMs,
                messageSidekick = messageSidekick,
            )
            TransporterPhase.EXIT -> TransporterLifecycle.computeExitFrame(
                exitElapsed = 1f - exit,
                beamPresence = beamPresence,
                messageSidekick = messageSidekick,
                timing = lifecycleTiming,
            )
            TransporterPhase.CLEARED -> TransporterLifecycle.computeStableFrame(0f).copy(
                glyphAlpha = 0f,
                messageAlpha = 0f,
            )
        }

        Canvas(modifier = Modifier.fillMaxSize()) {
            when (phase) {
                TransporterPhase.ENTRANCE, TransporterPhase.EXIT -> drawTransporterFrame(
                    regions = regions,
                    paletteId = paletteId,
                    variation = transporterVariation,
                    frame = frame,
                )
                TransporterPhase.STABLE -> drawTransporterStableFrame(
                    regions = regions,
                    paletteId = paletteId,
                    variation = transporterVariation,
                    stablePulse = stablePulse,
                    glyphResidualIntensity = frame.glyphAlpha,
                )
                TransporterPhase.CLEARED -> Unit
            }
        }

        val glyphSizeDp = with(density) {
            (scaledPackage?.glyphHeight ?: regions.glyphVisualSizePx).toDp()
        }
        val boxWidthDp = with(density) { regions.paintBoxWidth.toDp() }
        val boxHeightDp = with(density) { regions.paintBoxHeight.toDp() }
        val glyphWidthPx = scaledPackage?.glyphWidth ?: regions.glyphVisualSizePx
        val glyphHeightPx = scaledPackage?.glyphHeight ?: regions.glyphVisualSizePx
        val glyphOffsetX = with(density) {
            ((regions.glyphCenterX - regions.paintBoxLeft) - glyphWidthPx / 2f).toDp()
        }
        val glyphOffsetY = with(density) {
            ((regions.glyphCenterY - regions.paintBoxTop) - glyphHeightPx / 2f).toDp()
        }
        val messageOffsetX = scaledPackage?.let { layout ->
            with(density) { (layout.messageBandLeft - regions.paintBoxLeft).toDp() }
        }
        val messageOffsetY = scaledPackage?.let { layout ->
            with(density) { (layout.messageBandTop - regions.paintBoxTop).toDp() }
        }
        val messageWidthDp = scaledPackage?.let { layout ->
            with(density) { layout.messageBandWidth.toDp() }
        }
        val messageHeightDp = scaledPackage?.let { layout ->
            with(density) { layout.messageBandHeight.toDp() }
        }
        val messageFontSize = MessageTypography.fontSizeSp(screenH, sizeTier, density)
        val scrimRadiusDp = with(density) { presentation.packageCornerRadiusPx.toDp() }
        val plateRadiusDp = with(density) { presentation.messagePlateRadiusPx.toDp() }
        Box(
            modifier = Modifier
                .offset {
                    IntOffset(
                        regions.paintBoxLeft.roundToInt(),
                        regions.paintBoxTop.roundToInt(),
                    )
                }
                .width(boxWidthDp)
                .height(boxHeightDp),
            contentAlignment = if (scaledPackage != null) Alignment.TopStart else Alignment.TopCenter,
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .shadow(
                        elevation = 8.dp,
                        shape = RoundedCornerShape(scrimRadiusDp),
                        ambientColor = androidx.compose.ui.graphics.Color.Black.copy(
                            alpha = presentation.packageShadowAlpha,
                        ),
                        spotColor = androidx.compose.ui.graphics.Color.Black.copy(
                            alpha = presentation.packageShadowAlpha,
                        ),
                    )
                    .clip(RoundedCornerShape(scrimRadiusDp))
                    .background(presentation.scrimColor())
                    .then(
                        if (presentation.rimGlowAlpha > 0.02f) {
                            Modifier.shadow(
                                elevation = 12.dp,
                                shape = RoundedCornerShape(scrimRadiusDp),
                                ambientColor = androidx.compose.ui.graphics.Color.White.copy(
                                    alpha = presentation.rimGlowAlpha * 0.55f,
                                ),
                                spotColor = androidx.compose.ui.graphics.Color.White.copy(
                                    alpha = presentation.rimGlowAlpha,
                                ),
                            )
                        } else {
                            Modifier
                        },
                    ),
            )
            if (scaledPackage != null) {
                Box(modifier = Modifier.offset(x = glyphOffsetX, y = glyphOffsetY)) {
                    GlyphDisplay(
                        glyphId = glyphId,
                        alpha = frame.glyphAlpha.coerceIn(0f, 1f),
                        size = glyphSizeDp.coerceAtLeast(48.dp),
                        proceduralGraph = proceduralGraph,
                    )
                }
                Box(
                    modifier = Modifier
                        .offset(
                            x = messageOffsetX ?: 0.dp,
                            y = messageOffsetY ?: 0.dp,
                        )
                        .width(messageWidthDp ?: boxWidthDp)
                        .height(messageHeightDp ?: 48.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = message,
                        fontSize = messageFontSize,
                        fontWeight = FontWeight.Normal,
                        lineHeight = messageFontSize * 1.25f,
                        color = presentation.messageColor.copy(
                            alpha = frame.messageAlpha.coerceIn(0f, 1f) * 0.9f,
                        ),
                        textAlign = TextAlign.Center,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(plateRadiusDp))
                            .background(presentation.plateColor())
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                }
            } else {
                val safePadH = with(density) { (regions.safeZoneLeft - regions.paintBoxLeft).toDp() }
                val safePadV = with(density) { (regions.safeZoneTop - regions.paintBoxTop).toDp() }
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = safePadH, vertical = safePadV),
                    contentAlignment = Alignment.TopCenter,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        GlyphDisplay(
                            glyphId = glyphId,
                            alpha = frame.glyphAlpha.coerceIn(0f, 1f),
                            size = glyphSizeDp.coerceAtLeast(48.dp),
                            proceduralGraph = proceduralGraph,
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = message,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Normal,
                            lineHeight = 15.sp,
                            color = presentation.messageColor.copy(
                                alpha = frame.messageAlpha.coerceIn(0f, 1f) * 0.9f,
                            ),
                            textAlign = TextAlign.Center,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier
                                .clip(RoundedCornerShape(plateRadiusDp))
                                .background(presentation.plateColor())
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                }
            }
        }
    }
}
