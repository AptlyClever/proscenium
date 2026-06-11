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
  contract.version === "v001-object-materialization-scale",
  "contract version should be v001-object-materialization-scale",
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

console.log("smoke: control-alt-hails web preview OK");
