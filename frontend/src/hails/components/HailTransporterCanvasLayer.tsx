import { useEffect, useRef } from "react";
import type { RegistryPreviewPhase } from "../hailRegistryPreviewRenderer";
import { HAIL_PACKAGE_ANCHOR } from "../hailAuthoringPackage";
import {
  drawTransporterCanvasFrame,
  type TransporterVariationProfile,
} from "../hailTransporterCanvasPreview";
import type { TransporterChoreographyAnchors } from "../hailTransporterAuthoringLifecycle";

type HailTransporterCanvasLayerProps = {
  active: boolean;
  phase: RegistryPreviewPhase;
  loopGeneration: number;
  entranceMs: number;
  exitMs: number;
  variationProfile: TransporterVariationProfile;
  paletteId: string;
  beamIntensity: number;
  beamScale: number;
  sizeTier: string;
  choreographyAnchors?: TransporterChoreographyAnchors;
  /** Draw beam from package center (inset-0 on data-hail-package). */
  packageAnchor?: boolean;
  /** Normalized beam origin inside the package (overrides packageAnchor default). */
  beamAnchor?: { x: number; y: number };
};

export function HailTransporterCanvasLayer({
  active,
  phase,
  loopGeneration,
  entranceMs,
  exitMs,
  variationProfile,
  paletteId,
  beamIntensity,
  beamScale,
  sizeTier,
  choreographyAnchors,
  packageAnchor = false,
  beamAnchor,
}: HailTransporterCanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const beamAnchorX = beamAnchor?.x ?? (packageAnchor ? HAIL_PACKAGE_ANCHOR.x : 0.5);
  const beamAnchorY = beamAnchor?.y ?? (packageAnchor ? HAIL_PACKAGE_ANCHOR.y : 0.5);
  const glyphResolveStart = choreographyAnchors?.glyphResolveStart;
  const glyphLockIn = choreographyAnchors?.glyphLockIn;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) {
      return undefined;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return undefined;
    }

    let cancelled = false;

    const paintFrame = (phaseProgress: number) => {
      if (cancelled) {
        return;
      }
      drawTransporterCanvasFrame(ctx, canvas.clientWidth, canvas.clientHeight, {
        phaseProgress,
        lifecyclePhase: phase,
        dematerializing: phase === "exit",
        variationProfile,
        paletteId,
        beamIntensity,
        beamScale,
        sizeTier,
        choreographyAnchors,
        beamAnchorX,
        beamAnchorY,
      });
    };

    const resize = () => {
      const packageEl = canvas.closest("[data-hail-package]");
      const host = (canvas.parentElement ?? packageEl) as HTMLElement | null;
      if (!host) {
        return;
      }
      // Layout pixels — exclude ancestor transform scale so canvas matches glyph layer geometry.
      const w = Math.max(1, host.offsetWidth);
      const h = Math.max(1, host.offsetHeight);
      const dpr = window.devicePixelRatio || 1;
      const nextW = Math.floor(w * dpr);
      const nextH = Math.floor(h * dpr);
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(() => {
      resize();
    });
    const hostEl = canvas.parentElement ?? canvas.closest("[data-hail-package]");
    if (hostEl) {
      observer.observe(hostEl);
    }

    const animating = phase === "entrance" || phase === "exit";
    const phaseDuration = phase === "exit" ? exitMs : entranceMs;

    const draw = (now: number) => {
      if (cancelled) {
        return;
      }
      if (!startRef.current) {
        startRef.current = now;
      }
      const elapsed = now - startRef.current;
      const phaseProgress = Math.min(1, elapsed / Math.max(120, phaseDuration));
      paintFrame(phaseProgress);
      if (phaseProgress < 1) {
        rafRef.current = window.requestAnimationFrame(draw);
      }
    };

    if (animating) {
      startRef.current = 0;
      rafRef.current = window.requestAnimationFrame(draw);
    } else {
      // Stable / gap / static — clear the effect field (beam clears after lock-in; no frozen hold frame).
      paintFrame(0);
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [
    active,
    beamAnchorX,
    beamAnchorY,
    beamIntensity,
    beamScale,
    entranceMs,
    exitMs,
    glyphLockIn,
    glyphResolveStart,
    loopGeneration,
    paletteId,
    phase,
    sizeTier,
    variationProfile,
  ]);

  if (!active) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      data-hail-transporter-canvas
      aria-hidden="true"
    />
  );
}
