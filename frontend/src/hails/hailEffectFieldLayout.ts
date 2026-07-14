/** Hero-centric effect field sizing — imprint-hail-hero-centric-effect-field E1 */

export const TRANSPORTER_FOOTPRINT_FRACTIONS: Record<string, { width: number; height: number }> = {
  compact: { width: 0.3, height: 0.7 },
  standard: { width: 0.58, height: 0.88 },
  dramatic: { width: 0.52, height: 0.94 },
};

const FOOTPRINT_GLYPH_FLOOR: Record<EffectFootprintProfile, { width: number; height: number }> = {
  compact: { width: 1.04, height: 1.2 },
  standard: { width: 1.08, height: 1.3 },
  dramatic: { width: 1.12, height: 1.4 },
};

export const EFFECT_FOOTPRINT_PROFILES = [
  { id: "compact" as const, hint: "Tight column — minimal safe-zone breakout" },
  { id: "standard" as const, hint: "Default hero-centric footprint" },
  { id: "dramatic" as const, hint: "Widest column still clipped at safe zone" },
];

export type EffectFootprintProfile = "compact" | "standard" | "dramatic";

export type EffectFieldRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
  center_x: number;
  center_y: number;
  bottom: number;
  shape: "column" | "rect" | "radial";
  anchor: "glyph_optical_center";
  effect_field_fraction: {
    width_of_safe_zone: number;
    height_of_safe_zone: number;
  };
  effect_footprint_profile: EffectFootprintProfile;
  glyph_optical_center: { x: number; y: number };
};

function clamp(value: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(lo, Math.min(hi, value));
}

export function resolveEffectFootprintProfile(value: unknown): EffectFootprintProfile {
  const profile = String(value ?? "standard").trim().toLowerCase();
  if (profile === "compact" || profile === "dramatic" || profile === "standard") {
    return profile;
  }
  return "standard";
}

export const normalizeEffectFootprintProfile = resolveEffectFootprintProfile;

const FOOTPRINT_LABELS: Record<EffectFootprintProfile, string> = {
  compact: "Compact",
  standard: "Standard",
  dramatic: "Dramatic",
};

export function displayEffectFootprintProfile(profile: string): string {
  const resolved = resolveEffectFootprintProfile(profile);
  return FOOTPRINT_LABELS[resolved];
}

export function computeEffectFieldRegion(input: {
  safeZone: { left: number; top: number; width: number; height: number };
  glyphVisualSizePx: number;
  effectId?: string;
  effectFootprintProfile?: string;
  footprintScale?: number;
}): EffectFieldRegion {
  const profile = resolveEffectFootprintProfile(input.effectFootprintProfile);
  const effectId = input.effectId ?? "transporter";
  const fractions =
    effectId === "transporter"
      ? TRANSPORTER_FOOTPRINT_FRACTIONS[profile] ?? TRANSPORTER_FOOTPRINT_FRACTIONS.standard
      : TRANSPORTER_FOOTPRINT_FRACTIONS.standard;
  const scale = clamp(input.footprintScale ?? 1, 0.85, 1.25, 1);

  const opticalCx = input.safeZone.left + input.safeZone.width / 2;
  const opticalCy = input.safeZone.top + input.safeZone.height / 2;

  let fieldW = input.safeZone.width * fractions.width * scale;
  let fieldH = input.safeZone.height * fractions.height * scale;
  const floors = FOOTPRINT_GLYPH_FLOOR[profile];
  fieldW = Math.max(fieldW, input.glyphVisualSizePx * floors.width);
  fieldH = Math.max(fieldH, input.glyphVisualSizePx * floors.height);
  fieldW = Math.min(fieldW, input.safeZone.width);
  fieldH = Math.min(fieldH, input.safeZone.height);

  let left = opticalCx - fieldW / 2;
  let top = opticalCy - fieldH / 2;
  left = Math.max(input.safeZone.left, Math.min(left, input.safeZone.left + input.safeZone.width - fieldW));
  top = Math.max(input.safeZone.top, Math.min(top, input.safeZone.top + input.safeZone.height - fieldH));

  return {
    left,
    top,
    width: fieldW,
    height: fieldH,
    center_x: opticalCx,
    center_y: opticalCy,
    bottom: top + fieldH,
    shape: effectId === "transporter" ? "column" : "rect",
    anchor: "glyph_optical_center",
    effect_field_fraction: {
      width_of_safe_zone: input.safeZone.width ? fieldW / input.safeZone.width : 0,
      height_of_safe_zone: input.safeZone.height ? fieldH / input.safeZone.height : 0,
    },
    effect_footprint_profile: profile,
    glyph_optical_center: { x: opticalCx, y: opticalCy },
  };
}
