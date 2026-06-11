"use strict";

const fs = require("fs");
const path = require("path");

const contractPath = path.join(__dirname, "..", "shared", "hail-render-contract.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));

const PRESENCE_TIER_FIELDS = [
  "content_scale",
  "message_scale",
  "transport_event_scale",
  "effect_field_scale",
  "beam_field_scale",
  "particle_travel_scale",
  "glow_radius_scale",
  "anchor_weight",
  "message_backing_emphasis",
];

const LIFECYCLE_PHASE_IDS = [
  "beam_in_seed",
  "materializing_object",
  "stable_object",
  "beam_out_seed",
  "dematerializing_object",
];

const EFFECT_PRESET_IDS = [
  "clean_hail",
  "transporter_soft",
  "transporter_dense",
  "subtle_ping",
  "high_attention",
];

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

assert(
  contract.version === "v001-safe-zone-glyph-focus",
  "contract version should be v001-safe-zone-glyph-focus",
);
assert(contract.placement.presetIds.length === 7, "expected 7 placement presets");
assert(contract.message.maxLength === 120, "message max length should be 120");
assert(contract.palettes.axiom_dark_cyan, "axiom_dark_cyan palette required");
assert(contract.previewDefaults.placement_id === "top_right", "preview default should be top_right");

const requiredFiles = [
  "index.html",
  "styles.css",
  "js/app.js",
  "js/placement.js",
  "js/renderer.js",
  "js/effect-config.js",
  "js/animation-profile.js",
  "js/named-effects.js",
  "js/message.js",
];
requiredFiles.forEach(function (file) {
  const full = path.join(__dirname, file);
  assert(fs.existsSync(full), "missing preview file: " + file);
});

const pv = contract.previewVisual;
assert(pv && pv.effectPresets, "previewVisual.effectPresets required");
assert(pv.scaleGrammar && pv.scaleGrammar.tiers.small, "scaleGrammar tiers required");
assert(
  pv.previewTiming && pv.previewTiming.presets["5s"] === 5000,
  "previewTiming presets required",
);
assert(
  pv.animationProfiles && pv.animationProfiles.transporter_soft,
  "animationProfiles required",
);

assert(pv.presenceGrammar && pv.presenceGrammar.fields, "presenceGrammar.fields required");
PRESENCE_TIER_FIELDS.forEach(function (field) {
  assert(pv.presenceGrammar.fields[field], "presenceGrammar documents field: " + field);
});

["small", "medium", "large"].forEach(function (tierId) {
  const tier = pv.scaleGrammar.tiers[tierId];
  assert(tier, "scaleGrammar tier required: " + tierId);
  PRESENCE_TIER_FIELDS.forEach(function (field) {
    assert(
      typeof tier[field] === "number",
      tierId + " tier missing presence field: " + field,
    );
  });
});

const large = pv.scaleGrammar.tiers.large;
assert(
  large.transport_event_scale >= 1.8,
  "large tier should expand transport event materially (>= 1.8)",
);
assert(
  large.transport_event_scale > large.content_scale,
  "large tier transport event should exceed object scale",
);
assert(
  large.particle_travel_scale >= 2,
  "large tier should expand particle travel materially",
);
assert(large.label === "Impact", "large tier label should be Impact");
assert(
  large.effect_field_scale === 1,
  "large tier effect_field_scale should be neutral stable residual (1.0)",
);

assert(pv.presetPresence, "presetPresence block required");
EFFECT_PRESET_IDS.forEach(function (presetId) {
  const entry = pv.presetPresence[presetId];
  assert(entry, "presetPresence entry required: " + presetId);
  assert(
    typeof entry.transport_event_scale === "number",
    presetId + " presetPresence.transport_event_scale required",
  );
});
assert(
  pv.presetPresence.transporter_dense.transport_event_scale >
    pv.presetPresence.transporter_soft.transport_event_scale,
  "dense preset should have stronger transport than soft",
);
assert(
  pv.presetPresence.clean_hail.transport_event_scale <
    pv.presetPresence.transporter_soft.transport_event_scale,
  "clean preset should be quieter than soft",
);

assert(pv.placementPresence && pv.placementPresence.placements, "placementPresence.placements required");
const placements = pv.placementPresence.placements;
["top_right", "bottom_right", "upper_center", "center_soft", "lower_center"].forEach(
  function (placementId) {
    const entry = placements[placementId];
    assert(entry, "placementPresence entry required: " + placementId);
    assert(
      typeof entry.effectFieldCapMul === "number",
      placementId + " placementPresence.effectFieldCapMul required",
    );
    assert(
      typeof entry.maxOverflowFraction === "number",
      placementId + " placementPresence.maxOverflowFraction required",
    );
  },
);
assert(
  placements.center_soft.effectFieldCapMul > placements.upper_center.effectFieldCapMul,
  "center_soft should allow larger field than upper_center",
);
assert(
  placements.upper_center.effectFieldCapMul > placements.top_right.effectFieldCapMul,
  "upper_center should allow larger field than top_right",
);
assert(
  placements.top_right.effectFieldCapMul > placements.lower_center.effectFieldCapMul,
  "top_right should allow larger field than lower_center",
);

/** Lane 7 — object materialization lifecycle contract + source vocabulary */
const MATERIALIZATION_PROFILE = "transporter_soft";
const softProfile =
  pv.animationProfiles && pv.animationProfiles[MATERIALIZATION_PROFILE];
assert(softProfile, "transporter_soft animation profile required for materialization");
assert(
  softProfile.entrance_style === "beam_materialize",
  "transporter_soft entrance_style should be beam_materialize",
);
assert(
  softProfile.particle_mode_enter === "materialize",
  "transporter_soft particle_mode_enter should be materialize",
);
assert(
  softProfile.exit_style === "beam_dematerialize",
  "transporter_soft exit_style should be beam_dematerialize",
);

const lifecyclePhases = pv.lifecyclePhases;
const matLifecycle = pv.materializationLifecycle;
assert(
  lifecyclePhases || matLifecycle,
  "previewVisual.lifecyclePhases or materializationLifecycle required",
);

if (lifecyclePhases && lifecyclePhases.reference) {
  const ref = lifecyclePhases.reference;
  assert(typeof ref.entrance_ms === "number", "lifecyclePhases.reference.entrance_ms required");
  assert(typeof ref.beam_in_seed_ms === "number", "lifecyclePhases.reference.beam_in_seed_ms required");
  assert(typeof ref.exit_ms === "number", "lifecyclePhases.reference.exit_ms required");
  assert(typeof ref.beam_out_seed_ms === "number", "lifecyclePhases.reference.beam_out_seed_ms required");
  assert(
    ref.beam_in_seed_ms < ref.entrance_ms,
    "beam_in_seed_ms should be shorter than entrance_ms",
  );
  assert(
    ref.beam_out_seed_ms < ref.exit_ms,
    "beam_out_seed_ms should be shorter than exit_ms",
  );
}

if (matLifecycle && matLifecycle.phases) {
  const phaseIds = Object.keys(matLifecycle.phases);
  ["beam", "materialize", "stable", "beam_out", "exit"].forEach(function (name) {
    assert(phaseIds.includes(name), "materializationLifecycle missing phase: " + name);
  });
  const stable = matLifecycle.phases.stable;
  assert(
    stable &&
      (stable.beam_suppressed === true ||
        stable.beam_suppress === true ||
        stable.suppress_beam === true),
    "materializationLifecycle.phases.stable should declare beam suppression",
  );
}

const animationProfileSrc = fs.readFileSync(
  path.join(__dirname, "js", "animation-profile.js"),
  "utf8",
);
const rendererSrc = fs.readFileSync(path.join(__dirname, "js", "renderer.js"), "utf8");

assert(
  animationProfileSrc.includes('case "beam_materialize"'),
  "animation-profile.js should implement beam_materialize entrance",
);
assert(
  animationProfileSrc.includes('case "beam_dematerialize"'),
  "animation-profile.js should implement beam_dematerialize exit",
);
LIFECYCLE_PHASE_IDS.forEach(function (phaseId) {
  assert(
    animationProfileSrc.includes('"' + phaseId + '"'),
    "animation-profile.js should reference lifecycle phase: " + phaseId,
  );
});
assert(
  animationProfileSrc.includes("LIFECYCLE_PHASES"),
  "animation-profile.js should export LIFECYCLE_PHASES",
);
assert(
  rendererSrc.includes('case "materialize"'),
  "renderer.js should implement materialize particle mode",
);
assert(
  rendererSrc.includes("isStableLifecyclePhase"),
  "renderer.js should gate stable phase separately from transport draw",
);
assert(
  rendererSrc.includes("beamIntensity") && rendererSrc.includes("presence <= 0.01"),
  "renderer.js should gate transport draw on beamIntensity / presence",
);

const stableBeamSuppressedInCode =
  /LIFECYCLE_PHASES\.STABLE[\s\S]*?beamIntensity\s*=\s*0/.test(animationProfileSrc) ||
  /stable_object[\s\S]*?beamIntensity\s*=\s*0/.test(animationProfileSrc);
assert(
  stableBeamSuppressedInCode,
  "stable_object phase should zero beamIntensity in animation-profile.js",
);
assert(
  /isStableLifecyclePhase[\s\S]*?return/.test(rendererSrc),
  "renderer should early-return during stable_object (no persistent transport beam)",
);

const beamOutBeforeObjectFade =
  animationProfileSrc.includes("computeBeamOutSeedFrame") &&
  /computeBeamOutSeedFrame[\s\S]*?glyphAlpha:\s*1/.test(animationProfileSrc) &&
  animationProfileSrc.includes("computeDematerializingFrame");
assert(
  beamOutBeforeObjectFade,
  "exit should split beam_out_seed (object locked) before dematerializing_object fade",
);

/** Lane 7 — Axiom Paint Box + Named Effects Team Pass acceptance */
const NAMED_EFFECT_IDS = ["none", "pop", "burst", "transporter"];
const PAINT_BOX_TIER_IDS = ["small", "medium", "large"];

function contractTextBlob(obj) {
  return JSON.stringify(obj || {});
}

function namedEffectEntry(pv, effectId) {
  if (!pv.namedEffects) {
    return null;
  }
  if (pv.namedEffects[effectId]) {
    return pv.namedEffects[effectId];
  }
  if (pv.namedEffects.effects && pv.namedEffects.effects[effectId]) {
    return pv.namedEffects.effects[effectId];
  }
  return null;
}

function resolveTransporterEntranceMs(contract, pv) {
  const named = namedEffectEntry(pv, "transporter");
  if (named && typeof named.entrance_ms === "number") {
    return named.entrance_ms;
  }
  if (
    named &&
    named.timingMs &&
    named.timingMs.entrance &&
    typeof named.timingMs.entrance.default === "number"
  ) {
    return named.timingMs.entrance.default;
  }
  const profileMatch = animationProfileSrc.match(
    /transporter:\s*\{[\s\S]*?entrance_ms:\s*(\d+)/,
  );
  if (profileMatch) {
    return Number(profileMatch[1]);
  }
  const legacyKey =
    (named && named.legacyPreset) ||
    (named && named.legacy_preset) ||
    "transporter_soft";
  const profile =
    (pv.animationProfiles && pv.animationProfiles[legacyKey]) ||
    (pv.animationProfiles && pv.animationProfiles.transporter);
  return profile && profile.entrance_ms;
}

function resolveParticleBudgetMax(contract, pv) {
  const budget = pv.effectsBudget || pv.particleBudget || contract.effectsBudget;
  if (!budget) {
    return null;
  }
  if (typeof budget.hardMaxActiveParticles === "number") {
    return budget.hardMaxActiveParticles;
  }
  if (typeof budget.maxActiveParticles === "number") {
    return budget.maxActiveParticles;
  }
  if (typeof budget.hardCap === "number") {
    return budget.hardCap;
  }
  if (typeof budget.max === "number") {
    return budget.max;
  }
  if (typeof budget.maxParticles === "number") {
    return budget.maxParticles;
  }
  return null;
}

const contractBlob = contractTextBlob(contract);
const description = contract.description || "";

assert(
  contract.ownership && contract.ownership.hails === "axiom",
  "contract.ownership.hails must be 'axiom'",
);
assert(
  Array.isArray(contract.ownership.consumers) &&
    contract.ownership.consumers.some(function (c) {
      return /lcard|preview/i.test(String(c));
    }),
  "contract.ownership.consumers must list LCARD/preview as consumer (not owner)",
);
assert(
  /axiom/i.test(description) && /own/i.test(description),
  "contract description should declare Axiom ownership of Hails",
);
assert(
  !/lcard owns|owned by lcard|lcard-owned hails|lcard owns hails/i.test(description),
  "contract description must not imply LCARD owns Hails",
);
assert(
  !/lcard owns|owned by lcard|lcard-owned hails/i.test(contractBlob),
  "contract JSON must not contain LCARD ownership language",
);

assert(pv.namedEffects, "previewVisual.namedEffects registry required");
assert(
  Array.isArray(pv.namedEffects.allowlist) &&
    NAMED_EFFECT_IDS.every(function (id) {
      return pv.namedEffects.allowlist.includes(id);
    }),
  "namedEffects.allowlist must include none, pop, burst, transporter",
);
NAMED_EFFECT_IDS.forEach(function (effectId) {
  const entry = namedEffectEntry(pv, effectId);
  assert(entry, "namedEffects entry required: " + effectId);
});

assert(pv.paintBox && pv.paintBox.tiers, "previewVisual.paintBox.tiers required");
assert(
  pv.paintBox.canon && pv.paintBox.canon.includes("Safe Effect Zone"),
  "paintBox canon should document Safe Effect Zone hierarchy",
);
PAINT_BOX_TIER_IDS.forEach(function (tierId) {
  const tier = pv.paintBox.tiers[tierId];
  assert(tier, "paintBox tier required: " + tierId);
  assert(
    typeof tier.safeZoneInsetFraction === "number",
    tierId + " paintBox safeZoneInsetFraction required",
  );
  assert(
    typeof tier.glyphFocusFraction === "number",
    tierId + " paintBox glyphFocusFraction required",
  );
  assert(typeof tier.messageWeight === "number", tierId + " paintBox messageWeight required");
  assert(
    typeof tier.transporterBeamHeightMultiplier === "number",
    tierId + " paintBox transporterBeamHeightMultiplier required",
  );
  const width =
    tier.widthFraction != null
      ? tier.widthFraction
      : tier.width_fraction != null
        ? tier.width_fraction
        : tier.width;
  const height =
    tier.heightFraction != null
      ? tier.heightFraction
      : tier.height_fraction != null
        ? tier.height_fraction
        : tier.height;
  assert(typeof width === "number", tierId + " paintBox width fraction required");
  assert(typeof height === "number", tierId + " paintBox height fraction required");
  assert(
    typeof tier.glyphScale === "number" || typeof tier.glyph_scale === "number",
    tierId + " paintBox glyph scale required",
  );
  assert(
    typeof tier.messageScale === "number" || typeof tier.message_scale === "number",
    tierId + " paintBox message scale required",
  );
});

const smallBox = pv.paintBox.tiers.small;
const largeBox = pv.paintBox.tiers.large;
const smallW =
  smallBox.widthFraction != null ? smallBox.widthFraction : smallBox.width;
const largeW = largeBox.widthFraction != null ? largeBox.widthFraction : largeBox.width;
assert(
  largeW > smallW,
  "large paintBox width should exceed small (S/M/L footprint ladder)",
);

const transporterEntranceMs = resolveTransporterEntranceMs(contract, pv);
assert(
  typeof transporterEntranceMs === "number" && transporterEntranceMs >= 1200,
  "transporter entrance_ms must be >= 1200 (got " + transporterEntranceMs + ")",
);

const particleBudgetMax = resolveParticleBudgetMax(contract, pv);
assert(
  typeof particleBudgetMax === "number" && particleBudgetMax <= 60,
  "particle budget hard max must be <= 60 (got " + particleBudgetMax + ")",
);

const namedEffectsPath = path.join(__dirname, "js", "named-effects.js");
const effectConfigSrc = fs.readFileSync(
  path.join(__dirname, "js", "effect-config.js"),
  "utf8",
);
const placementSrc = fs.readFileSync(path.join(__dirname, "js", "placement.js"), "utf8");

assert(
  fs.existsSync(namedEffectsPath) ||
    (effectConfigSrc.includes("getNamedEffect") &&
      effectConfigSrc.includes("NAMED_EFFECT_LABELS")),
  "named effect registry required (js/named-effects.js or effect-config exports)",
);
assert(
  effectConfigSrc.includes("resolvePaintBox"),
  "effect-config.js should export resolvePaintBox for Paint Box tiers",
);
assert(
  placementSrc.includes("resolvePaintBoxRect"),
  "placement.js should resolve Paint Box rect for composition bounds",
);
assert(
  placementSrc.includes("computeHailLayoutRegions") && placementSrc.includes("safeZone"),
  "placement.js should compute Safe Effect Zone layout regions",
);
assert(
  effectConfigSrc.includes("computeHailLayoutRegions"),
  "effect-config.js should export computeHailLayoutRegions",
);

function assertLayoutRegionMath() {
  const refW = 480;
  ["small", "medium", "large"].forEach(function (tierId) {
    const tier = pv.paintBox.tiers[tierId];
    const refH = Math.round(refW * (tier.heightFraction / tier.widthFraction));
    const insetX = refW * tier.safeZoneInsetFraction;
    const insetY = refH * tier.safeZoneInsetFraction;
    const safeH = refH - insetY * 2;
    const glyphH = safeH * tier.glyphFocusFraction;
    const beamH = Math.min(safeH, glyphH * tier.transporterBeamHeightMultiplier);
    assert(beamH < refH, tierId + " transporter beam height must be less than Paint Box height");
    assert(beamH <= safeH, tierId + " transporter beam must fit inside Safe Effect Zone");
  });
}
assertLayoutRegionMath();

assert(
  rendererSrc.includes("particleCountForBudget") ||
    /Math\.min\(\s*60/.test(rendererSrc),
  "renderer.js should enforce particle budget cap (particleCountForBudget or hard max 60)",
);

const appSrc = fs.readFileSync(path.join(__dirname, "js", "app.js"), "utf8");
assert(
  appSrc.includes("namedEffectId") || appSrc.includes("namedEffect"),
  "app.js should wire named effect selection state",
);

const indexHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
assert(
  /Hail Effects|named-effect|data-named-effect/i.test(indexHtml),
  "index.html should expose named Hail Effects selector (not transporter-first UI)",
);
assert(
  /Show Paint Box|show-paint-box|paint-box-outline/i.test(indexHtml),
  "index.html should expose Show Paint Box debug toggle",
);
assert(
  /safe-zone-outline|glyph-focus-outline/i.test(indexHtml),
  "index.html should expose safe zone and glyph focus debug outlines",
);
assert(
  rendererSrc.includes("beginEffectClip") || rendererSrc.includes("safeZone"),
  "renderer.js should clip/fade effects to Safe Effect Zone",
);
assert(
  rendererSrc.includes("const bh = beam.bh"),
  "renderer drawParticles must define bh from resolveBeamBounds",
);

console.log("smoke: control-alt-hails web preview OK");
