import type { HailVisualFields } from "./hailVisualContract";
import { mixHexColors, type PalettePresentation } from "./hailPalettePresentation";

export type PackageAccentWash = {
  accent: string;
  scrimWeight: number;
  plateWeight: number;
  label?: string;
};

export function packageAccentWashFromRecord(
  visual: Record<string, unknown> | undefined,
): PackageAccentWash | null {
  if (!visual || typeof visual !== "object") {
    return null;
  }
  const raw = visual.accent_wash;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const accent = String(row.accent ?? "").trim();
  const scrimWeight = Number(row.scrim_weight);
  if (!accent || !Number.isFinite(scrimWeight) || scrimWeight <= 0) {
    return null;
  }
  const plateRaw = row.plate_weight;
  const plateWeight = Number.isFinite(Number(plateRaw)) ? Number(plateRaw) : scrimWeight;
  const label = String(row.label ?? "").trim();
  return {
    accent,
    scrimWeight: Math.max(0, Math.min(1, scrimWeight)),
    plateWeight: Math.max(0, Math.min(1, plateWeight)),
    ...(label ? { label } : {}),
  };
}

export function packageAccentWashFromVisual(visual: HailVisualFields): PackageAccentWash | null {
  const raw = visual.accentWash;
  if (!raw?.accent?.trim()) {
    return null;
  }
  const scrimWeight = Number(raw.scrim_weight);
  if (!Number.isFinite(scrimWeight) || scrimWeight <= 0) {
    return null;
  }
  const plateWeight =
    raw.plate_weight != null && Number.isFinite(Number(raw.plate_weight))
      ? Number(raw.plate_weight)
      : scrimWeight;
  const label = raw.label?.trim();
  return {
    accent: raw.accent.trim(),
    scrimWeight: Math.max(0, Math.min(1, scrimWeight)),
    plateWeight: Math.max(0, Math.min(1, plateWeight)),
    ...(label ? { label } : {}),
  };
}

export function packageAccentWashSpec(
  wash: PackageAccentWash | null | undefined,
): { accent: string; scrimWeight: number; plateWeight: number } | null {
  if (!wash?.accent?.trim()) {
    return null;
  }
  const scrimWeight = Number(wash.scrimWeight);
  if (!Number.isFinite(scrimWeight) || scrimWeight <= 0) {
    return null;
  }
  const plateWeight = Number.isFinite(Number(wash.plateWeight)) ? Number(wash.plateWeight) : scrimWeight;
  return {
    accent: wash.accent.trim(),
    scrimWeight: Math.max(0, Math.min(1, scrimWeight)),
    plateWeight: Math.max(0, Math.min(1, plateWeight)),
  };
}

export function applyPackageAccentWash(
  presentation: PalettePresentation,
  wash: PackageAccentWash | null | undefined,
): PalettePresentation {
  const spec = packageAccentWashSpec(wash);
  if (!spec) {
    return presentation;
  }
  return {
    ...presentation,
    backdropTint: mixHexColors(presentation.backdropTint, spec.accent, spec.scrimWeight),
    messageBacking: mixHexColors(presentation.messageBacking, spec.accent, spec.plateWeight),
  };
}
