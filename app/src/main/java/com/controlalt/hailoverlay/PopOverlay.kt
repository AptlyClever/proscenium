package com.controlalt.hailoverlay

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.min
import kotlin.math.roundToInt
import com.controlalt.hailoverlay.PopCanvasRenderer.drawPopFrame
import com.controlalt.hailoverlay.PopCanvasRenderer.drawPopStableFrame

@Composable
fun PopOverlay(
    glyphId: String,
    message: String,
    paletteId: String,
    placement: Placement.Resolved,
    sizeTier: PaintBoxTier = PaintBoxTier.MEDIUM,
    choreography: EffectChoreography = EffectChoreography(),
    proceduralGraph: ProceduralGraphSpec? = null,
    imageGlyph: ImageGlyphSpec? = null,
    imageLayersGlyph: ImageLayersGlyphSpec? = null,
    presentationTemplate: PresentationTemplateSpec? = null,
    packageLayout: PackageLayoutV2? = null,
    palettePresentation: PalettePresentation? = null,
    lifecycleTiming: LifecycleTiming = LifecycleTiming(),
    stableHoldMs: Long,
    onLifecycleComplete: () -> Unit,
) {
    val presentation = palettePresentation ?: PalettePresentation.fromJson(null, paletteId)
    val resolvedTiming = remember(lifecycleTiming, stableHoldMs) {
        if (
            lifecycleTiming.entranceMs == TransporterContract.ENTRANCE_MS &&
            lifecycleTiming.exitMs == TransporterContract.EXIT_MS
        ) {
            PopContract.lifecycleTiming(stableHoldMs)
        } else {
            lifecycleTiming.copy(stableHoldMs = lifecycleTiming.stableHoldMs ?: stableHoldMs)
        }
    }
    var phase by remember { mutableStateOf(TransporterPhase.ENTRANCE) }
    var entranceT by remember { mutableFloatStateOf(0f) }
    var exitT by remember { mutableFloatStateOf(1f) }
    var stablePulse by remember { mutableFloatStateOf(0f) }
    var stableElapsedMs by remember { mutableStateOf(0L) }
    val messageSidekick = remember(packageLayout, stableHoldMs) {
        val base = packageLayout?.messageSidekick
            ?: MessageSidekickTiming.fromJson(null, stableHoldMs)
        // Pop uses quick_follow — message pops in with glyph during ingress, stays through hold.
        base.copy(useStablePhase = false)
    }

    LaunchedEffect(glyphId, message, stableHoldMs, resolvedTiming) {
        phase = TransporterPhase.ENTRANCE
        entranceT = 0f
        exitT = 1f
        stablePulse = 0f
        stableElapsedMs = 0L
        val entranceMs = resolvedTiming.entranceMs.toInt().coerceAtLeast(1)
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
        val exitMs = resolvedTiming.exitMs.toInt().coerceAtLeast(1)
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
        val defaultVariation = remember {
            ResolvedTransporterVariation(
                profile = TransporterVariationProfile.DEFAULT,
                beamScale = 1f,
                beamOpacity = 0f,
            )
        }
        val regions = remember(screenW, screenH, placement, sizeTier, scaledPackage) {
            if (scaledPackage != null) {
                scaledPackage.toPaintBoxRegions(sizeTier)
            } else {
                PaintBoxLayout.resolve(screenW, screenH, placement, sizeTier, defaultVariation)
            }
        }

        val frame = when (phase) {
            TransporterPhase.ENTRANCE -> PopLifecycle.computeEntranceFrame(
                entranceT = entranceT,
                choreography = choreography,
                messageSidekick = messageSidekick,
            )
            TransporterPhase.STABLE -> PopLifecycle.computeStableFrame(
                messageSidekick = messageSidekick,
                stableElapsedMs = stableElapsedMs,
                stablePulse = stablePulse,
            )
            TransporterPhase.EXIT -> PopLifecycle.computeExitFrame(
                exitElapsed = 1f - exitT,
                messageSidekick = messageSidekick,
                timing = resolvedTiming,
            )
            TransporterPhase.CLEARED -> PopLifecycle.computeStableFrame().copy(
                glyphAlpha = 0f,
                messageAlpha = 0f,
                scrimAlpha = 0f,
            )
        }

        val chromeAlpha = frame.scrimAlpha.coerceIn(0f, 1f)

        val boxWidthDp = with(density) { regions.paintBoxWidth.toDp() }
        val boxHeightDp = with(density) { regions.paintBoxHeight.toDp() }
        val glyphWidthPx = scaledPackage?.glyphWidth ?: regions.glyphVisualSizePx
        val glyphHeightPx = scaledPackage?.glyphHeight ?: regions.glyphVisualSizePx
        val glyphWidthDp = with(density) { glyphWidthPx.toDp() }
        val glyphHeightDp = with(density) { glyphHeightPx.toDp() }
        val glyphInkSizeDp = minOf(glyphWidthDp, glyphHeightDp)
        val fallbackGlyphSizeDp = with(density) { regions.glyphVisualSizePx.toDp() }
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

        val rimPulseAlpha = StableInterest.rimPulseAlpha(
            stableElapsedMs = stableElapsedMs,
            baseRimAlpha = presentation.rimGlowAlpha,
            interest = null,
        )

        // Praxis stack: Shell scrim → Effects canvas → Glyph → Message (siblings, not zIndex).
        Box(
            modifier = packageOffsetModifier,
            contentAlignment = if (scaledPackage != null) Alignment.TopStart else Alignment.TopCenter,
        ) {
            PackagePresentationShell.Scrim(
                presentation = presentation,
                rimPulseAlpha = rimPulseAlpha,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { alpha = chromeAlpha },
            )

            if (presentationTemplate != null) {
                PresentationStageDisplay(
                    template = presentationTemplate,
                    layer = PresentationStageLayer.BACK,
                    modifier = Modifier.fillMaxSize(),
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .drawBehind {
                        when (phase) {
                            TransporterPhase.ENTRANCE, TransporterPhase.EXIT -> drawPopFrame(
                                regions = effectRegions,
                                paletteId = paletteId,
                                frame = frame,
                            )
                            TransporterPhase.STABLE -> drawPopStableFrame(
                                regions = effectRegions,
                                paletteId = paletteId,
                                stablePulse = stablePulse,
                                glyphResidualIntensity = frame.glyphAlpha,
                            )
                            TransporterPhase.CLEARED -> Unit
                        }
                    },
            )

            if (scaledPackage != null) {
                Box(
                    modifier = Modifier
                        .offset(x = glyphOffsetX, y = glyphOffsetY)
                        .width(glyphWidthDp)
                        .height(glyphHeightDp)
                        .graphicsLayer {
                            alpha = frame.glyphAlpha.coerceIn(0f, 1f)
                            scaleX = frame.glyphScale
                            scaleY = frame.glyphScale
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    GlyphDisplay(
                        glyphId = glyphId,
                        alpha = frame.glyphAlpha.coerceIn(0f, 1f),
                        scale = frame.glyphScale,
                        size = glyphInkSizeDp.coerceAtLeast(48.dp),
                        proceduralGraph = proceduralGraph,
                        imageGlyph = imageGlyph,
                        imageLayersGlyph = imageLayersGlyph,
                        layerPhase = phase,
                        layerEntranceT = entranceT,
                        layerStablePulse = stablePulse,
                        layerChoreography = choreography,
                        paletteId = paletteId,
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
                        .graphicsLayer {
                            alpha = frame.messageAlpha.coerceIn(0f, 1f)
                            scaleX = frame.messageScale
                            scaleY = frame.messageScale
                        }
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
                        color = presentation.messageColor.copy(alpha = 0.9f),
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
                        .padding(horizontal = safePadH, vertical = safePadV)
                        .graphicsLayer { alpha = chromeAlpha },
                    contentAlignment = Alignment.TopCenter,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            modifier = Modifier.graphicsLayer {
                                alpha = frame.glyphAlpha.coerceIn(0f, 1f)
                                scaleX = frame.glyphScale
                                scaleY = frame.glyphScale
                            },
                        ) {
                            GlyphDisplay(
                                glyphId = glyphId,
                                alpha = frame.glyphAlpha.coerceIn(0f, 1f),
                                scale = frame.glyphScale,
                                size = fallbackGlyphSizeDp.coerceAtLeast(48.dp),
                                proceduralGraph = proceduralGraph,
                                imageGlyph = imageGlyph,
                                imageLayersGlyph = imageLayersGlyph,
                                layerPhase = phase,
                                layerEntranceT = entranceT,
                                layerStablePulse = stablePulse,
                                layerChoreography = choreography,
                                paletteId = paletteId,
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = message,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Normal,
                            lineHeight = 15.sp,
                            color = presentation.messageColor.copy(alpha = 0.9f),
                            textAlign = TextAlign.Center,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier
                                .graphicsLayer {
                                    alpha = frame.messageAlpha.coerceIn(0f, 1f)
                                    scaleX = frame.messageScale
                                    scaleY = frame.messageScale
                                }
                                .clip(RoundedCornerShape(plateRadiusDp))
                                .background(presentation.plateColor())
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                }
            }

            if (presentationTemplate != null) {
                PresentationStageDisplay(
                    template = presentationTemplate,
                    layer = PresentationStageLayer.FRONT,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
    }
}
