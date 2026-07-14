/**
 * Standards-promoted Hails Paint Box tokens (DTCG 2025.10 subset).
 * Source: vendor/standards-build-context/contracts/hails/hail-paintbox-tokens.v001.json
 */

import tokensDoc from "../../../vendor/standards-build-context/contracts/hails/hail-paintbox-tokens.v001.json";

// $type is left as plain string so imported JSON token objects match structurally.
type NumberToken = { $type: string; $value: number };
type DurationToken = { $type: string; $value: string };
type ColorToken = { $type: string; $value: string };

function readNumber(token: NumberToken): number {
  return token.$value;
}

function readDurationMs(token: DurationToken): number {
  const match = /^(\d+(?:\.\d+)?)ms$/.exec(token.$value.trim());
  if (!match) {
    throw new Error(`invalid duration token: ${token.$value}`);
  }
  return Number(match[1]);
}

function readColor(token: ColorToken): string {
  return token.$value;
}

export type PaintboxTierFractions = {
  widthFraction: number;
  heightFraction: number;
  glyphVisualFraction: number;
};

const tierBlock = tokensDoc.hail.paintbox.tier;

export function paintboxTierFractions(tierId: string): PaintboxTierFractions {
  const tier = tierBlock[tierId as keyof typeof tierBlock];
  if (!tier) {
    throw new Error(`unknown paintbox tier: ${tierId}`);
  }
  return {
    widthFraction: readNumber(tier.widthFraction),
    heightFraction: readNumber(tier.heightFraction),
    glyphVisualFraction: readNumber(tier.glyphVisualFraction),
  };
}

export const PAINTBOX_TIERS: Record<string, PaintboxTierFractions> = {
  small: paintboxTierFractions("small"),
  medium: paintboxTierFractions("medium"),
  large: paintboxTierFractions("large"),
};

export const HAIL_LIFECYCLE_MS = {
  entrance: readDurationMs(tokensDoc.hail.lifecycle.entrance),
  exit: readDurationMs(tokensDoc.hail.lifecycle.exit),
  glyphResolve: readDurationMs(tokensDoc.hail.lifecycle.glyphResolve),
  beamInSeed: readDurationMs(tokensDoc.hail.lifecycle.beamInSeed),
  beamOutSeed: readDurationMs(tokensDoc.hail.lifecycle.beamOutSeed),
} as const;

export const AUTHORING_DESIGN_GLYPH_SCALE = readNumber(
  tokensDoc.hail.authoring.delivery.designGlyphScale,
);
export const AUTHORING_DELIVERY_GLYPH_BOOST = readNumber(
  tokensDoc.hail.authoring.delivery.glyphBoost,
);
export const AUTHORING_DELIVERY_ENVELOPE_SCALE = readNumber(
  tokensDoc.hail.authoring.delivery.envelopeScale,
);

export type ChoreographyAnchors = {
  glyphResolveStart: number;
  glyphImpactPeak: number;
  glyphLockIn: number;
  messageRevealStart: number;
  stableReady: number;
};

type ChoreographyAnchorBlock = {
  glyphResolveStart: NumberToken;
  glyphImpactPeak: NumberToken;
  glyphLockIn: NumberToken;
  messageRevealStart: NumberToken;
  stableReady: NumberToken;
};

function readChoreographyAnchors(block: ChoreographyAnchorBlock): ChoreographyAnchors {
  return {
    glyphResolveStart: readNumber(block.glyphResolveStart),
    glyphImpactPeak: readNumber(block.glyphImpactPeak),
    glyphLockIn: readNumber(block.glyphLockIn),
    messageRevealStart: readNumber(block.messageRevealStart),
    stableReady: readNumber(block.stableReady),
  };
}

export function effectChoreographyAnchors(effectId: string): ChoreographyAnchors {
  const block = tokensDoc.hail.choreography.effect[effectId as keyof typeof tokensDoc.hail.choreography.effect];
  if (!block) {
    throw new Error(`unknown effect choreography: ${effectId}`);
  }
  return readChoreographyAnchors(block);
}

export function transporterVariationChoreographyAnchors(variationId: string): ChoreographyAnchors {
  const block =
    tokensDoc.hail.choreography.transporterVariation[
      variationId as keyof typeof tokensDoc.hail.choreography.transporterVariation
    ];
  if (!block) {
    throw new Error(`unknown transporter variation choreography: ${variationId}`);
  }
  return readChoreographyAnchors(block);
}

export const DEFAULT_PALETTE_ROLES = {
  beamBase: readColor(tokensDoc.hail.palette.role.beamBase),
  beamCyan: readColor(tokensDoc.hail.palette.role.beamCyan),
  beamWhite: readColor(tokensDoc.hail.palette.role.beamWhite),
  glyphGlow: readColor(tokensDoc.hail.palette.role.glyphGlow),
  messageColor: readColor(tokensDoc.hail.palette.role.messageColor),
  backdropTint: readColor(tokensDoc.hail.palette.role.backdropTint),
} as const;

export const HAIL_PAINTBOX_TOKENS_PATH =
  "vendor/standards-build-context/contracts/hails/hail-paintbox-tokens.v001.json";

export { tokensDoc as hailPaintboxTokensDoc };
