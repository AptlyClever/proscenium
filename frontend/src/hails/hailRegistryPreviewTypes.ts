/** Shared registry preview types — isolated to break renderer ↔ modules circular imports. */

export type RegistryPreviewPhase = "static" | "entrance" | "stable" | "exit" | "gap";

export type RegistryPreviewModuleRender = {
  moduleId: string;
  particleStyle: string;
  messageRevealStyle: string;
  /** Fraction of entrance_ms when message becomes visible (from choreographyAnchors.messageRevealStart). */
  messageRevealDelayMs: number;
  glyphResolveDelayMs: number;
  glyphResolveDurationMs: number;
  particleCount: number;
  cssVars: Record<string, string>;
};

export type RegistryPreviewIdentity = {
  glyphResolveStyle: string;
  fieldStyle: string;
  particleStyle: string;
  messageRevealStyle: string;
  choreographyAnchors: Record<string, number>;
  lifecycleTiming: {
    entrance_animation_ms: number;
    exit_animation_ms: number;
  };
  stableResidual: string;
};

export type RegistryPreviewPlan = {
  effectId: string;
  label: string;
  identity: RegistryPreviewIdentity;
  variationId: string;
  previewProfile: string;
  entranceMs: number;
  exitMs: number;
  stableHoldMs: number;
  static: boolean;
  moduleRender: RegistryPreviewModuleRender | null;
};
