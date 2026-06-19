package com.controlalt.hailoverlay

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
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
    val presentation = palettePresentation ?: PalettePresentation.fromJson(null, paletteId)
    var phase by remember { mutableStateOf(TransporterPhase.ENTRANCE) }
    var entranceT by remember { mutableFloatStateOf(0f) }
    var exitT by remember { mutableFloatStateOf(1f) }
    var stablePulse by remember { mutableFloatStateOf(0f) }
    var stableElapsedMs by remember { mutableStateOf(0L) }
    val messageSidekick = remember(packageLayout, stableHoldMs) {
        packageLayout?.messageSidekick
            ?: MessageSidekickTiming.fromJson(null, stableHoldMs)
    }

    LaunchedEffect(glyphId, message, stableHoldMs, lifecycleTiming) {
        phase = TransporterPhase.ENTRANCE
        entranceT = 0f
        exitT = 1f
        stableElapsedMs = 0L
        val entranceMs = lifecycleTiming.entranceMs.toInt().coerceAtLeast(1)
        val entranceStart = System.currentTimeMillis()
        while (true) {
            val elapsed = System.currentTimeMillis() - entranceStart
            if (elapsed >= entranceMs) {
                break
            }
            entranceT = elapsed.toFloat() / entranceMs.toFloat()
            kotlinx.coroutines.delay(16)
        }
        entranceT = 1f
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
        val exitMs = lifecycleTiming.exitMs.toInt().coerceAtLeast(1)
        val exitStart = System.currentTimeMillis()
        while (true) {
            val elapsed = System.currentTimeMillis() - exitStart
            if (elapsed >= exitMs) {
                break
            }
            exitT = 1f - (elapsed.toFloat() / exitMs.toFloat())
            kotlinx.coroutines.delay(16)
        }
        exitT = 0f
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

        val frame = when (phase) {
            TransporterPhase.ENTRANCE -> TransporterLifecycle.computeEntranceFrame(
                entranceT = entranceT,
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
                exitElapsed = 1f - exitT,
                beamPresence = beamPresence,
                messageSidekick = messageSidekick,
                timing = lifecycleTiming,
            )
            TransporterPhase.CLEARED -> TransporterLifecycle.computeStableFrame(0f).copy(
                glyphAlpha = 0f,
                messageAlpha = 0f,
            )
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
        val messageHorizontalPadPx = with(density) { 6.dp.toPx() }
        val messageVerticalPadPx = with(density) { 2.dp.toPx() }
        val messageBandHeightPx = scaledPackage?.messageBandHeight ?: 0f
        val messageBandWidthPx = scaledPackage?.messageBandWidth ?: 0f
        val messageFontSize = MessageTypography.fontSizeSp(
            screenHeightPx = screenH,
            bandHeightPx = messageBandHeightPx.takeIf { it > 0f },
            bandWidthPx = messageBandWidthPx.takeIf { it > 0f },
            textLength = message.length,
            tier = sizeTier,
            density = density,
            horizontalPaddingPx = messageHorizontalPadPx * 2f,
            verticalPaddingPx = messageVerticalPadPx * 2f,
        )
        val plateRadiusDp = with(density) { presentation.messagePlateRadiusPx.toDp() }
        val effectRegions = remember(regions) { regions.toPackageLocal() }
        val packageOffsetModifier = Modifier
            .offset {
                IntOffset(
                    regions.paintBoxLeft.roundToInt(),
                    regions.paintBoxTop.roundToInt(),
                )
            }
            .width(boxWidthDp)
            .height(boxHeightDp)

        // Praxis stack in one package tree: Shell scrim → Effects canvas → Glyph → Message.
        // Siblings (not full-screen zIndex) — required for reliable overlay compositing on Google TV.
        Box(
            modifier = packageOffsetModifier,
            contentAlignment = if (scaledPackage != null) Alignment.TopStart else Alignment.TopCenter,
        ) {
            PackagePresentationShell.Scrim(
                presentation = presentation,
                modifier = Modifier.fillMaxSize(),
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .drawBehind {
                        when (phase) {
                            TransporterPhase.ENTRANCE, TransporterPhase.EXIT -> drawTransporterFrame(
                                regions = effectRegions,
                                paletteId = paletteId,
                                variation = transporterVariation,
                                frame = frame,
                            )
                            TransporterPhase.STABLE -> drawTransporterStableFrame(
                                regions = effectRegions,
                                paletteId = paletteId,
                                variation = transporterVariation,
                                stablePulse = stablePulse,
                                glyphResidualIntensity = frame.glyphAlpha,
                            )
                            TransporterPhase.CLEARED -> Unit
                        }
                    },
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
                        .height(messageHeightDp ?: 48.dp)
                        .clip(RoundedCornerShape(plateRadiusDp))
                        .then(PackagePresentationShell.messagePlateBorderModifier(RoundedCornerShape(plateRadiusDp)))
                        .background(presentation.plateColor())
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = message,
                        fontSize = messageFontSize,
                        fontWeight = FontWeight.Normal,
                        lineHeight = messageFontSize * MessageTypography.LINE_HEIGHT_MULTIPLIER,
                        color = presentation.messageColor.copy(
                            alpha = frame.messageAlpha.coerceIn(0f, 1f) * 0.9f,
                        ),
                        textAlign = TextAlign.Center,
                        maxLines = MessageTypography.MAX_LINES,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.fillMaxWidth(),
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
