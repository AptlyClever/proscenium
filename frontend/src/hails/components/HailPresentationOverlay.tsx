import type { PresentationOverlayPayload } from "./HailPresentationStage";

type HailPresentationOverlayProps = {
  overlay: PresentationOverlayPayload | null | undefined;
  previewPhase?: string;
  active?: boolean;
};

/**
 * Presentation overlay slot (6c framework) — CSS burst default; Lottie JSON optional.
 */
export function HailPresentationOverlay({
  overlay,
  previewPhase = "stable",
  active = true,
}: HailPresentationOverlayProps) {
  if (!overlay || !active) {
    return null;
  }
  const shouldPlay =
    previewPhase === "entrance" || previewPhase === "gap" || previewPhase === "stable";

  if (overlay.kind === "css_burst") {
    if (!shouldPlay) {
      return null;
    }
    return (
      <div
        className="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
        data-hail-presentation-overlay="css_burst"
        data-hail-presentation-overlay-profile={overlay.css_profile ?? "spark_radial_v1"}
        aria-hidden="true"
      >
        <span className="hail-presentation-spark-burst absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2" />
      </div>
    );
  }

  if (overlay.kind === "lottie" && overlay.asset_url) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        data-hail-presentation-overlay="lottie"
        data-hail-presentation-overlay-url={overlay.asset_url}
        data-hail-presentation-overlay-android={overlay.android ?? "deferred"}
        aria-hidden="true"
      />
    );
  }

  return null;
}
