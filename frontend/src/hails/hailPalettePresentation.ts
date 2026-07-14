import type { CSSProperties } from "react";
import contract from "../../../config/hails/hail-render-contract.v002-beta.json";

export type PalettePresentation = {
  paletteId: string;
  backdropTint: string;
  packageScrimOpacity: number;
  packageCornerRadiusPx: number;
  messageBacking: string;
  messageBackingOpacity: number;
  messagePlateRadiusPx: number;
  messageColor: string;
  packageShadowAlpha: number;
  rimGlowAlpha?: number;
  entrancePresenceScale?: number;
};

const DEFAULT_PALETTE_ID = "axiom_dark_cyan";

const PACKAGE_SCRIM_OPACITY = 0.2;
const PACKAGE_CORNER_RADIUS_PX = 12;
const MESSAGE_PLATE_RADIUS_PX = 6;
const PACKAGE_SHADOW_ALPHA = 0.28;

/** Neutral Grid chrome for authoring previews — not tied to effect Color loadout (Phase A). */
export const AUTHORING_NEUTRAL_GRID_PRESENTATION: PalettePresentation = {
  paletteId: "neutral_grid",
  backdropTint: "#14181c",
  packageScrimOpacity: PACKAGE_SCRIM_OPACITY,
  packageCornerRadiusPx: PACKAGE_CORNER_RADIUS_PX,
  messageBacking: "#14181c",
  messageBackingOpacity: 0.45,
  messagePlateRadiusPx: MESSAGE_PLATE_RADIUS_PX,
  messageColor: "#9aa3ad",
  packageShadowAlpha: PACKAGE_SHADOW_ALPHA,
  rimGlowAlpha: 0,
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamped})`;
}

/** Linear RGB mix — weight 0 keeps base, 1 becomes accent. */
export function mixHexColors(base: string, accent: string, weight: number): string {
  const baseRgb = hexToRgb(base);
  const accentRgb = hexToRgb(accent);
  if (!baseRgb || !accentRgb) {
    return base.trim() || accent.trim();
  }
  const w = Math.max(0, Math.min(1, weight));
  const r = Math.round(baseRgb.r * (1 - w) + accentRgb.r * w);
  const g = Math.round(baseRgb.g * (1 - w) + accentRgb.g * w);
  const b = Math.round(baseRgb.b * (1 - w) + accentRgb.b * w);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

type ContractPalette = {
  backdropTint?: string;
  messageColor?: string;
  roles?: {
    messageBacking?: string;
    messageBackingOpacity?: number;
    text?: string;
  };
};

export function resolvePalettePresentation(paletteId: string): PalettePresentation {
  const palettes = contract.palettes as Record<string, ContractPalette>;
  const key = paletteId.trim() || DEFAULT_PALETTE_ID;
  const entry = palettes[key] ?? palettes[DEFAULT_PALETTE_ID];
  const roles = entry?.roles ?? {};
  const messageBackingOpacity = Math.max(
    0.2,
    Math.min(1, Number(roles.messageBackingOpacity ?? 0.5)),
  );

  return {
    paletteId: key,
    backdropTint: entry?.backdropTint ?? "#0A2E24",
    packageScrimOpacity: PACKAGE_SCRIM_OPACITY,
    packageCornerRadiusPx: PACKAGE_CORNER_RADIUS_PX,
    messageBacking: roles.messageBacking ?? "#121618",
    messageBackingOpacity,
    messagePlateRadiusPx: MESSAGE_PLATE_RADIUS_PX,
    messageColor: entry?.messageColor ?? roles.text ?? "#F0FAF6",
    packageShadowAlpha: PACKAGE_SHADOW_ALPHA,
  };
}

export function palettePresentationFromPayload(
  payload: Record<string, unknown> | null | undefined,
): PalettePresentation | null {
  const raw = payload?.palette_presentation;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const paletteId = String(row.palette_id ?? DEFAULT_PALETTE_ID);
  const fallback = resolvePalettePresentation(paletteId);
  return {
    paletteId,
    backdropTint: String(row.backdrop_tint ?? fallback.backdropTint),
    packageScrimOpacity: Number(row.package_scrim_opacity ?? fallback.packageScrimOpacity),
    packageCornerRadiusPx: Number(row.package_corner_radius_px ?? fallback.packageCornerRadiusPx),
    messageBacking: String(row.message_backing ?? fallback.messageBacking),
    messageBackingOpacity: Number(row.message_backing_opacity ?? fallback.messageBackingOpacity),
    messagePlateRadiusPx: Number(row.message_plate_radius_px ?? fallback.messagePlateRadiusPx),
    messageColor: String(row.message_color ?? fallback.messageColor),
    packageShadowAlpha: Number(row.package_shadow_alpha ?? fallback.packageShadowAlpha),
  };
}

export function packageScrimStyle(presentation: PalettePresentation): CSSProperties {
  const rim = presentation.rimGlowAlpha ?? 0;
  const rimShadow =
    rim > 0.02
      ? `, 0 0 0 1px rgba(255, 255, 255, ${rim}), 0 0 28px rgba(255, 255, 255, ${rim * 0.55})`
      : "";
  return {
    backgroundColor: hexWithAlpha(presentation.backdropTint, presentation.packageScrimOpacity),
    borderRadius: `${presentation.packageCornerRadiusPx}px`,
    boxShadow: `0 4px 24px rgba(0, 0, 0, ${presentation.packageShadowAlpha})${rimShadow}`,
  };
}

export function messagePlateStyle(presentation: PalettePresentation): CSSProperties {
  return {
    backgroundColor: hexWithAlpha(presentation.messageBacking, presentation.messageBackingOpacity),
    borderRadius: `${presentation.messagePlateRadiusPx}px`,
    border: "1px solid rgba(255, 255, 255, 0.04)",
    boxShadow: `0 1px 5px rgba(0, 0, 0, 0.28)`,
    backdropFilter: "blur(5px)",
    WebkitBackdropFilter: "blur(5px)",
    color: presentation.messageColor,
  };
}
