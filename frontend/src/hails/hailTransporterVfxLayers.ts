/** Slice 4 — per-variation VFX toggles (transporter-variation-vfx-definitions-v001). */

export type TransporterVfxLayers = {
  showerCurtain: boolean;
  scanPulseCount: number;
  powerPellet: boolean;
  swirlField: boolean;
};

const DEFAULT_VFX: TransporterVfxLayers = {
  showerCurtain: false,
  scanPulseCount: 0,
  powerPellet: false,
  swirlField: false,
};

const VFX_BY_VARIATION: Record<string, TransporterVfxLayers> = {
  voyaging: {
    showerCurtain: false,
    scanPulseCount: 3,
    powerPellet: true,
    swirlField: false,
  },
  "generation-next": {
    showerCurtain: true,
    scanPulseCount: 0,
    powerPellet: true,
    swirlField: false,
  },
  spoon: {
    showerCurtain: true,
    scanPulseCount: 0,
    powerPellet: true,
    swirlField: true,
  },
};

export function resolveTransporterVfxLayers(
  variationId: string | null | undefined,
): TransporterVfxLayers {
  const key = (variationId ?? "").trim();
  return VFX_BY_VARIATION[key] ?? DEFAULT_VFX;
}
