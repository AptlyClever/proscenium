"use strict";

const fs = require("fs");
const path = require("path");

const contractPath = path.join(__dirname, "..", "shared", "hail-render-contract.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

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
  "js/message.js",
];
requiredFiles.forEach(function (file) {
  const full = path.join(__dirname, file);
  assert(fs.existsSync(full), "missing preview file: " + file);
});

assert(
  contract.previewVisual && contract.previewVisual.effectPresets,
  "previewVisual.effectPresets required",
);
assert(
  contract.previewVisual.defaultEffectPreset === "transporter_soft",
  "default effect preset should be transporter_soft",
);

console.log("smoke: control-alt-hails web preview OK");
