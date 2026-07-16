"use strict";

/**
 * Hail APK transporter variation consumption — static source checks.
 * Moved from control-alt-lcard/service/scripts on 2026-07-15; this validates
 * APK source internals so it lives with the APK in Proscenium.
 * Run: node scripts/smoke-hail-apk-variation-profiles-v001.js
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appSrc = path.join(root, "app", "src", "main", "java", "com", "controlalt", "hailoverlay");

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL hail-apk-variation-profiles:", message);
    failed = true;
  }
}

function read(name) {
  return fs.readFileSync(path.join(appSrc, name), "utf8");
}

assert(fs.existsSync(path.join(appSrc, "TransporterVariationProfile.kt")), "TransporterVariationProfile.kt required");

const showRequest = read("HailShowRequest.kt");
assert(showRequest.includes("effect_variation_id"), "HailShowRequest must parse effect_variation_id");
assert(showRequest.includes("android_effect_tuning"), "HailShowRequest must parse android_effect_tuning");
assert(showRequest.includes("particle_style"), "HailShowRequest must parse effect_identity particle_style");

const registry = read("HailRegistry.kt");
assert(registry.includes("transporterVariation"), "ValidatedHail must carry transporterVariation");
assert(registry.includes("transporter_generation_next"), "APK must allow generation-next palette");

const overlay = read("TransporterOverlay.kt");
assert(overlay.includes("transporterVariation"), "TransporterOverlay must accept variation profile");
assert(overlay.includes("shimmerBeam"), "TransporterOverlay must honor shimmer beam profile");

const layout = read("PaintBoxLayout.kt");
assert(layout.includes("transporterVariation"), "PaintBoxLayout must scale beam from variation");

if (failed) {
  process.exit(1);
}

console.log("smoke-hail-apk-variation-profiles-v001: OK");
