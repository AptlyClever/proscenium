/**
 * LCARD stable visual harness preview — read-only new-tab navigation from Hails management.
 *
 * LCARD stable preview accepts `axiomBaseUrl` query param (see LCARD contract-loader).
 * Per-hail deep-link params are not consumed by stable preview yet; hail context stays in Axiom UI.
 */

const DEFAULT_STABLE_PREVIEW_BASE = "http://192.168.68.93:8196";
const DEFAULT_AXIOM_PUBLIC_BASE = "http://192.168.68.93:7895";

export type HailStablePreviewContext = {
  hailId?: string;
  visual?: {
    effect_id?: string;
    scale?: string;
    placement_id?: string;
    palette_id?: string;
  };
  route?: {
    launchRoomId: string;
    destinationRoomId: string;
    routeId?: string;
  };
};

export function resolveStablePreviewBaseUrl(): string {
  const configured = import.meta.env.VITE_LCARD_HAIL_PREVIEW_BASE_URL?.trim();
  const base = (configured || DEFAULT_STABLE_PREVIEW_BASE).replace(/\/+$/, "");
  return base + "/";
}

export function resolveAxiomPublicBaseUrl(): string {
  const configured = import.meta.env.VITE_AXIOM_PUBLIC_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return DEFAULT_AXIOM_PUBLIC_BASE;
}

/** Build read-only stable preview URL. Context is for caller diagnostics only until LCARD deep-link lands. */
export function buildStableHailPreviewUrl(_context?: HailStablePreviewContext): string {
  const url = new URL(resolveStablePreviewBaseUrl());
  url.searchParams.set("axiomBaseUrl", resolveAxiomPublicBaseUrl());
  return url.toString();
}

/** Open stable preview in a new tab — never triggers production send. */
export function openStableHailPreview(context?: HailStablePreviewContext): void {
  const target = buildStableHailPreviewUrl(context);
  window.open(target, "_blank", "noopener,noreferrer");
}
