import type { CSSProperties } from "react";
import type { RegistryPreviewPhase } from "../hailRegistryPreviewTypes";

export type PresentationTemplatePayload = {
  template_id?: string;
  label?: string;
  stage_asset_urls?: Record<string, string>;
  glyph_motion?: {
    profile?: string;
    resolve_style?: string;
  };
  choreography_anchors?: Record<string, number>;
  presentation_overlay?: PresentationOverlayPayload | null;
};

export type PresentationOverlayPayload = {
  kind?: "lottie" | "css_burst";
  anchor?: string;
  start_anchor?: string;
  asset_ref?: string;
  asset_url?: string;
  css_profile?: string;
  android?: string;
};

type HailPresentationStageProps = {
  template: PresentationTemplatePayload | null | undefined;
  motionProfile?: string;
  previewPhase?: RegistryPreviewPhase;
  className?: string;
};

function stageMotionClass(profile: string, previewPhase: RegistryPreviewPhase | undefined): string {
  if (profile !== "breakout_emerge" || !previewPhase) {
    return "";
  }
  if (previewPhase === "entrance") {
    return "hail-presentation-breakout-stage-emerge";
  }
  if (previewPhase === "exit") {
    return "hail-presentation-breakout-stage-exit";
  }
  return "";
}

/**
 * Fixed stage shell — back/front PNG layers inside the hail package.
 */
export function HailPresentationStage({
  template,
  motionProfile,
  previewPhase,
  className = "",
}: HailPresentationStageProps) {
  if (!template?.stage_asset_urls || !Object.keys(template.stage_asset_urls).length) {
    return null;
  }
  const profile = motionProfile ?? template.glyph_motion?.profile ?? "default";
  const motionClass = stageMotionClass(profile, previewPhase);
  const back = template.stage_asset_urls.back;
  const front = template.stage_asset_urls.front;

  return (
    <>
      {back ? (
        <div
          className={`pointer-events-none absolute inset-0 z-[1] ${motionClass} ${className}`.trim()}
          data-hail-presentation-stage-back
          data-hail-presentation-template={template.template_id}
          data-hail-presentation-motion={profile}
          aria-hidden="true"
        >
          <img src={back} alt="" className="h-full w-full object-contain" />
        </div>
      ) : null}
      {front ? (
        <div
          className={`pointer-events-none absolute inset-0 z-[3] ${motionClass} ${className}`.trim()}
          data-hail-presentation-stage-front
          data-hail-presentation-template={template.template_id}
          aria-hidden="true"
        >
          <img src={front} alt="" className="h-full w-full object-contain" />
        </div>
      ) : null}
    </>
  );
}

export function breakoutEmergenceStyle(active: boolean): CSSProperties | undefined {
  if (!active) {
    return undefined;
  }
  return {
    transformOrigin: "50% 70%",
  };
}
