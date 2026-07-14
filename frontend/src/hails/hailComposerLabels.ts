const PALETTE_LABELS: Record<string, string> = {
  axiom_dark_cyan: "Axiom Cyan",
  transporter_white: "Transporter White",
  cute_purple: "Soft Purple",
};

const EFFECT_LABELS: Record<string, string> = {
  none: "None (quiet)",
  pop: "Pop",
  burst: "Burst",
  transporter: "Transporter",
};

const SIZE_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const PLACEMENT_LABELS: Record<string, string> = {
  upper_center: "Upper Center",
};

export function humanizeId(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function titleFromId(id: string): string {
  return humanizeId(id);
}

export function displayPaletteId(paletteId: string): string {
  return PALETTE_LABELS[paletteId] ?? titleFromId(paletteId);
}

export function displayEffectId(effectId: string): string {
  return EFFECT_LABELS[effectId] ?? titleFromId(effectId);
}

export function displaySizeTier(scale: string): string {
  return SIZE_LABELS[scale] ?? titleFromId(scale);
}

export function displayPlacementId(placementId: string): string {
  return PLACEMENT_LABELS[placementId] ?? titleFromId(placementId);
}

/** Slot / compose family id for Forge glyph recipe label. */
export function displayGlyphFamilyId(familyId: string): string {
  if (familyId.startsWith("slot_")) {
    const tail = familyId.slice(5);
    const split = tail.indexOf("_");
    if (split > 0) {
      return `${titleFromId(tail.slice(0, split))} · ${titleFromId(tail.slice(split + 1))}`;
    }
  }
  return titleFromId(familyId);
}

/** Palettes tied to effect variations — not shown in operator Color loadout. */
const VARIATION_LINKED_PALETTE_IDS = new Set([
  "transporter_generation_next",
  "transporter_spoon",
]);

/** Operator Color row — generic palettes only; variations are a separate loadout dimension. */
export function loadoutPaletteIds(paletteIds: string[]): string[] {
  return paletteIds.filter((id) => !VARIATION_LINKED_PALETTE_IDS.has(id));
}

export function displayDurationMs(durationMs: string): string {
  const ms = Number(durationMs) || 0;
  if (ms >= 1000 && ms % 1000 === 0) {
    const sec = ms / 1000;
    return sec === 1 ? "1 second" : `${sec} seconds`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)} seconds`;
  }
  return `${ms} ms`;
}

export function visualPresentationSummary(visual: {
  effectId: string;
  paletteId: string;
  scale: string;
  durationMs: string;
}): string {
  return [
    displayEffectId(visual.effectId),
    displaySizeTier(visual.scale),
    displayPaletteId(visual.paletteId),
    displayDurationMs(visual.durationMs),
  ].join(" · ");
}
