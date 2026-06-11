"use strict";

const fs = require("fs");
const path = require("path");

const contractPath = path.join(__dirname, "..", "shared", "hail-render-contract.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));

const PRESENCE_TIER_FIELDS = [
  "content_scale",
  "message_scale",
  "effect_field_scale",
  "beam_field_scale",
  "particle_travel_scale",
  "glow_radius_scale",
  "anchor_weight",
  "message_backing_emphasis",
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
  contract.version === "v001-composition-presence-impact",
  "contract version should be v001-composition-presence-impact",
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
  large.effect_field_scale >= 1.8,
  "large tier should expand effect field materially (>= 1.8)",
);
assert(
  large.effect_field_scale > large.content_scale,
  "large tier effect field should exceed content scale",
);
assert(
  large.particle_travel_scale >= 2,
  "large tier should expand particle travel materially",
);
assert(large.label === "Impact", "large tier label should be Impact");

assert(pv.presetPresence, "presetPresence block required");
EFFECT_PRESET_IDS.forEach(function (presetId) {
  const entry = pv.presetPresence[presetId];
  assert(entry, "presetPresence entry required: " + presetId);
  assert(
    typeof entry.effect_field_scale === "number",
    presetId + " presetPresence.effect_field_scale required",
  );
});
assert(
  pv.presetPresence.transporter_dense.effect_field_scale >
    pv.presetPresence.transporter_soft.effect_field_scale,
  "dense preset should have stronger field than soft",
);
assert(
  pv.presetPresence.clean_hail.effect_field_scale <
    pv.presetPresence.transporter_soft.effect_field_scale,
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

console.log("smoke: control-alt-hails web preview OK");
