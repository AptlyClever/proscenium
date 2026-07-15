"use strict";

const http = require("http");

const HOST = process.env.HAIL_PREVIEW_SMOKE_HOST || "127.0.0.1";
const PORT = Number(process.env.HAIL_PREVIEW_SMOKE_PORT || 8197);
const BASE = "http://" + HOST + ":" + PORT;

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL smoke:workbench:", message);
    failed = true;
  }
}

function get(path) {
  return new Promise(function (resolve, reject) {
    const req = http.get(
      { hostname: HOST, port: PORT, path: path, timeout: 8000 },
      function (res) {
        let body = "";
        res.on("data", function (chunk) {
          body += chunk;
        });
        res.on("end", function () {
          resolve({ status: res.statusCode, body: body });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", function () {
      req.destroy(new Error("timeout"));
    });
  });
}

function loadPlaywright() {
  const path = require("path");
  const candidates = [
    "playwright",
    process.env.PLAYWRIGHT_MODULE_PATH,
    path.join(__dirname, "node_modules", "playwright"),
    path.join(__dirname, "..", "..", "node_modules", "playwright"),
  ].filter(Boolean);
  for (let i = 0; i < candidates.length; i++) {
    try {
      return require(candidates[i]);
    } catch (err) {
      /* try next */
    }
  }
  throw new Error(
    "playwright is required for smoke:workbench — npm install in web-preview or set PLAYWRIGHT_MODULE_PATH",
  );
}

async function main() {
  const index = await get("/");
  assert(index.status === 200, "index.html HTTP " + index.status);
  assert(index.body.includes("Control Alt Hails"), "index shell missing title");

  const contract = await get("/shared/hail-render-contract.json");
  assert(contract.status === 200, "contract HTTP " + contract.status);

  const { chromium } = await loadPlaywright();
  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("pageerror", function (err) {
    errors.push(err.message);
  });
  page.on("console", function (msg) {
    if (msg.type() === "error") {
      const text = msg.text();
      if (
        /Failed to load resource/i.test(text) &&
        /(404|503|502)/i.test(text)
      ) {
        return;
      }
      errors.push(text);
    }
  });

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForFunction(
    function () {
      return document.querySelectorAll("#palette-pills button").length > 0;
    },
    { timeout: 10000 },
  );
  await page.waitForFunction(
    function () {
      const payload = (document.getElementById("payload-out")?.textContent || "").trim();
      return payload.length > 20;
    },
    { timeout: 10000 },
  );

  const dom = await page.evaluate(function () {
    const named = Array.from(
      document.querySelectorAll("#named-effect-pills button"),
    ).map(function (btn) {
      return btn.dataset.namedEffect;
    });
    const payload = (document.getElementById("payload-out")?.textContent || "").trim();
    return {
      paletteCount: document.querySelectorAll("#palette-pills button").length,
      named: named,
      glyphCount: document.querySelectorAll("#glyph-id option").length,
      payloadLen: payload.length,
      payloadParses: (function () {
        try {
          JSON.parse(payload);
          return true;
        } catch (e) {
          return false;
        }
      })(),
    };
  });

  assert(dom.paletteCount >= 1, "#palette-pills should have buttons (got " + dom.paletteCount + ")");
  assert(dom.named.length === 4, "#named-effect-pills should have 4 buttons (got " + dom.named.length + ")");
  ["none", "pop", "burst", "transporter"].forEach(function (id) {
    assert(dom.named.indexOf(id) >= 0, "named effect missing: " + id);
  });
  assert(dom.glyphCount >= 1, "#glyph-id should have options (got " + dom.glyphCount + ")");
  assert(dom.payloadLen > 20, "#payload-out should receive JSON (len " + dom.payloadLen + ")");
  assert(dom.payloadParses, "#payload-out should be valid JSON");

  const layoutPayload = await page.evaluate(function () {
    try {
      return JSON.parse(document.getElementById("payload-out").textContent || "{}");
    } catch (e) {
      return {};
    }
  });
  const layoutRegions =
    (layoutPayload.preview_visual && layoutPayload.preview_visual.layout_regions) ||
    layoutPayload.layout_regions ||
    {};
  assert(
    layoutRegions.transporter_beam_height_vs_paint_box != null &&
      layoutRegions.transporter_beam_height_vs_paint_box < 1,
    "payload layout_regions: transporter beam height should be less than Paint Box",
  );
  assert(
    layoutRegions.transporter_beam_inside_safe_zone === true,
    "payload layout_regions: transporter beam should fit inside Safe Effect Zone",
  );
  assert(
    typeof layoutRegions.safe_zone_inset_fraction === "number",
    "payload layout_regions should include safe_zone_inset_fraction",
  );
  assert(
    typeof layoutRegions.glyph_visual_size_px === "number" && layoutRegions.glyph_visual_size_px >= 85,
    "payload layout_regions should include glyph_visual_size_px (medium default >= 85)",
  );
  assert(
    typeof layoutRegions.effect_impact_floor === "number",
    "payload layout_regions should include effect_impact_floor",
  );

  async function measureGlyphPx() {
    return page.evaluate(function () {
      const glyph = document.getElementById("overlay-glyph");
      if (!glyph) {
        return 0;
      }
      const stylePx = parseFloat(glyph.style.width || "0");
      const cssVar = getComputedStyle(
        document.getElementById("overlay-group") || document.documentElement,
      ).getPropertyValue("--glyph-visual-px");
      const varPx = parseFloat(cssVar || "0");
      const box = glyph.getBoundingClientRect();
      return Math.max(stylePx, varPx, box.width, box.height);
    });
  }

  async function selectHailScaleTier(tierId) {
    await page.click('[data-hail-scale-tier="' + tierId + '"]');
    await page.waitForTimeout(150);
  }

  async function canvasNonZeroAlpha() {
    return page.evaluate(function () {
      const canvas = document.getElementById("overlay-canvas");
      if (!canvas || !canvas.width || !canvas.height) {
        return 0;
      }
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 3) {
          count += 1;
        }
      }
      return count;
    });
  }

  async function waitForCanvasEffects(minPixels, timeoutMs) {
    const min = minPixels || 5;
    const timeout = timeoutMs || 3000;
    await page.waitForFunction(
      function (threshold) {
        const canvas = document.getElementById("overlay-canvas");
        if (!canvas || !canvas.width || !canvas.height) {
          return false;
        }
        const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 3) {
            count += 1;
            if (count >= threshold) {
              return true;
            }
          }
        }
        return false;
      },
      min,
      { timeout: timeout },
    );
    return canvasNonZeroAlpha();
  }

  async function clickNamedEffect(id) {
    await page.click('[data-named-effect="' + id + '"]');
  }

  const glyphSizes = {};
  for (const tierId of ["small", "medium", "large"]) {
    await selectHailScaleTier(tierId);
    await clickNamedEffect("transporter");
    await page.click("#preview-btn");
    await page.waitForFunction(
      function () {
        const group = document.getElementById("overlay-group");
        return group && !group.hidden;
      },
      { timeout: 5000 },
    );
    await page.waitForTimeout(400);
    glyphSizes[tierId] = await measureGlyphPx();
    await page.click("#hide-btn");
    await page.waitForFunction(
      function () {
        return document.getElementById("overlay-group").hidden;
      },
      { timeout: 5000 },
    );
  }
  assert(glyphSizes.small > 40, "small glyph should be visible (got " + glyphSizes.small + "px)");
  assert(
    glyphSizes.medium > glyphSizes.small,
    "medium glyph should exceed small (M=" +
      glyphSizes.medium +
      " S=" +
      glyphSizes.small +
      ")",
  );
  assert(
    glyphSizes.large > glyphSizes.medium,
    "large glyph should exceed medium (L=" +
      glyphSizes.large +
      " M=" +
      glyphSizes.medium +
      ")",
  );
  assert(
    glyphSizes.large >= 124,
    "large glyph should meet floor >= 124px (got " + glyphSizes.large + ")",
  );

  await selectHailScaleTier("medium");
  await clickNamedEffect("transporter");
  await page.click("#preview-btn");
  await page.waitForFunction(
    function () {
      const group = document.getElementById("overlay-group");
      return group && !group.hidden;
    },
    { timeout: 5000 },
  );

  const transporterCanvasPx = await waitForCanvasEffects(10, 3000);
  assert(
    transporterCanvasPx > 10,
    "transporter entrance should draw visible canvas effects (got " + transporterCanvasPx + " px)",
  );

  const overlay = await page.evaluate(function () {
    const group = document.getElementById("overlay-group");
    const glyph = document.getElementById("overlay-glyph");
    return {
      hidden: group ? group.hidden : true,
      glyphHtmlLen: glyph ? glyph.innerHTML.trim().length : 0,
      glyphOpacity: glyph ? getComputedStyle(glyph).opacity : "0",
    };
  });

  assert(!overlay.hidden, "overlay-group should be visible after Preview click");
  assert(
    overlay.glyphHtmlLen > 0 || Number(overlay.glyphOpacity) > 0,
    "preview should render visible hail glyph content",
  );

  await page.click("#hide-btn");
  await page.waitForFunction(
    function () {
      return document.getElementById("overlay-group").hidden;
    },
    { timeout: 5000 },
  );

  await clickNamedEffect("pop");
  await page.click('[data-preview-hold="off"]');
  await page.click("#preview-btn");
  await page.waitForFunction(
    function () {
      return !document.getElementById("overlay-group").hidden;
    },
    { timeout: 5000 },
  );
  const popCanvasPx = await waitForCanvasEffects(5, 2500);
  assert(popCanvasPx > 5, "pop entrance should draw canvas effects (got " + popCanvasPx + " px)");
  await page.click("#hide-btn");
  await page.waitForTimeout(1200);

  await clickNamedEffect("burst");
  await page.click("#preview-btn");
  await page.waitForFunction(
    function () {
      return !document.getElementById("overlay-group").hidden;
    },
    { timeout: 5000 },
  );
  const burstCanvasPx = await waitForCanvasEffects(5, 3000);
  assert(
    burstCanvasPx >= 5,
    "burst entrance should draw canvas effects (got " + burstCanvasPx + " px)",
  );
  await page.click("#hide-btn");
  await page.waitForTimeout(1200);

  await page.click('[data-preview-hold="on"]');
  await clickNamedEffect("transporter");
  await page.click("#preview-btn");
  await page.waitForTimeout(6500);
  const holdStillVisible = await page.evaluate(function () {
    return !document.getElementById("overlay-group").hidden;
  });
  assert(holdStillVisible, "hold mode should not auto-clear before Hide");
  await page.click("#hide-btn");
  await page.waitForFunction(
    function () {
      return document.getElementById("overlay-group").hidden;
    },
    { timeout: 5000 },
  );

  await page.click('[data-preview-hold="off"]');
  await page.click('[data-preview-duration="5s"]');
  await clickNamedEffect("transporter");
  await page.click("#preview-btn");
  await page.waitForFunction(
    function () {
      return !document.getElementById("overlay-group").hidden;
    },
    { timeout: 5000 },
  );
  const lifecycleWaitMs = await page.evaluate(function () {
    try {
      const p = JSON.parse(document.getElementById("payload-out").textContent || "{}");
      const pt = (p.preview_visual && p.preview_visual.preview_timing) || {};
      const entrance = pt.entrance_animation_ms || 1900;
      const stable = pt.stable_hold_ms || 5000;
      const exit = pt.exit_animation_ms || 1400;
      return entrance + stable + exit + 800;
    } catch (e) {
      return 9000;
    }
  });
  const timingPayload = await page.evaluate(function () {
    try {
      const p = JSON.parse(document.getElementById("payload-out").textContent || "{}");
      return (p.preview_visual && p.preview_visual.preview_timing) || {};
    } catch (e) {
      return {};
    }
  });
  assert(
    timingPayload.stable_hold_ms === 5000,
    "5s preset should map to stable_hold_ms=5000 (got " + timingPayload.stable_hold_ms + ")",
  );
  assert(
    timingPayload.entrance_animation_ms > timingPayload.exit_animation_ms / 2,
    "entrance_animation_ms should be present in preview_timing payload",
  );
  assert(
    timingPayload.total_timed_lifecycle_ms >= 8000,
    "total_timed_lifecycle_ms should include entrance + stable + exit",
  );
  await page.waitForTimeout(lifecycleWaitMs);
  const timedCleared = await page.evaluate(function () {
    return document.getElementById("overlay-group").hidden;
  });
  assert(timedCleared, "timed 5s preview should auto-clear after entrance + stable hold + exit");

  await clickNamedEffect("none");
  await page.click("#preview-btn");
  await page.waitForTimeout(500);
  await page.click("#hide-btn");
  await page.waitForFunction(
    function () {
      return document.getElementById("overlay-group").hidden;
    },
    { timeout: 5000 },
  );

  const payloadAfterFx = await page.evaluate(function () {
    try {
      const p = JSON.parse(document.getElementById("payload-out").textContent || "{}");
      return p.effect_id;
    } catch (e) {
      return null;
    }
  });
  assert(payloadAfterFx === "none", "named effect selector should update payload");

  const contractSourceInfo = await page.evaluate(function () {
    try {
      const p = JSON.parse(document.getElementById("payload-out").textContent || "{}");
      const pv = p.preview_visual || {};
      const cs = pv.contract_source || {};
      const readout = document.getElementById("contract-source-readout");
      return {
        source: cs.source || (readout && readout.dataset.source) || null,
        version: cs.version || null,
        ownership: cs.ownership || null,
        readout: readout ? readout.textContent : "",
      };
    } catch (e) {
      return {};
    }
  });
  assert(
    contractSourceInfo.version === "v001-integration",
    "active contract version should be v001-integration",
  );
  assert(
    contractSourceInfo.ownership === "axiom",
    "active contract ownership should be axiom",
  );
  assert(
    contractSourceInfo.source === "axiom-api" ||
      contractSourceInfo.source === "local-mirror-fallback",
    "contract source must be axiom-api or local-mirror-fallback (got " +
      contractSourceInfo.source +
      ")",
  );
  assert(
    contractSourceInfo.readout && contractSourceInfo.readout.length > 10,
    "contract source readout should be visible in diagnostics",
  );
  if (process.env.HAIL_AXIOM_EXPECT_AXIOM === "1") {
    assert(
      contractSourceInfo.source === "axiom-api",
      "main-path proof requires contract source axiom-api (got " +
        contractSourceInfo.source +
        ")",
    );
    assert(
      /Contract source:\s*Axiom API/i.test(contractSourceInfo.readout),
      "diagnostics readout should show Contract source: Axiom API",
    );
  }

  const identityByEffect = {};
  for (const effectId of ["none", "pop", "burst", "transporter"]) {
    await clickNamedEffect(effectId);
    await page.waitForTimeout(120);
    const identity = await page.evaluate(function () {
      try {
        const p = JSON.parse(document.getElementById("payload-out").textContent || "{}");
        const pv = p.preview_visual || p;
        const ne = pv.named_effect || {};
        return (ne.effect_identity || ne.effectIdentity || null);
      } catch (e) {
        return null;
      }
    });
    identityByEffect[effectId] = identity;
    assert(identity, "payload effect_identity required for " + effectId);
    assert(
      identity.glyph_resolve_style || identity.glyphResolveStyle,
      effectId + " payload should include glyph_resolve_style",
    );
    assert(
      identity.field_style || identity.fieldStyle,
      effectId + " payload should include field_style",
    );
  }
  assert(
    (identityByEffect.transporter.field_style || identityByEffect.transporter.fieldStyle) ===
      "vertical_phase",
    "transporter payload field_style should be vertical_phase",
  );
  assert(
    (identityByEffect.burst.field_style || identityByEffect.burst.fieldStyle) === "radial_bloom",
    "burst payload field_style should be radial_bloom",
  );
  assert(
    (identityByEffect.pop.glyph_resolve_style || identityByEffect.pop.glyphResolveStyle) ===
      "overshoot_pop",
    "pop payload glyph_resolve_style should be overshoot_pop",
  );
  assert(
    identityByEffect.transporter.glyph_resolve_style !== identityByEffect.burst.glyph_resolve_style,
    "transporter and burst glyph resolve styles should differ",
  );

  const choreoByEffect = {};
  for (const effectId of ["pop", "burst", "transporter"]) {
    await clickNamedEffect(effectId);
    await page.waitForTimeout(120);
    choreoByEffect[effectId] = await page.evaluate(function () {
      try {
        const p = JSON.parse(document.getElementById("payload-out").textContent || "{}");
        const pv = p.preview_visual || p;
        const id = pv.named_effect && pv.named_effect.effect_identity;
        return id && id.choreography_anchors ? id.choreography_anchors : null;
      } catch (e) {
        return null;
      }
    });
    assert(choreoByEffect[effectId], "payload choreography_anchors required for " + effectId);
    assert(
      choreoByEffect[effectId].messageRevealStart >= choreoByEffect[effectId].glyphImpactPeak,
      effectId + " messageRevealStart should be >= glyphImpactPeak",
    );
  }
  assert(
    choreoByEffect.transporter.glyphLockIn > choreoByEffect.burst.glyphLockIn &&
      choreoByEffect.burst.glyphLockIn > choreoByEffect.pop.glyphLockIn,
    "glyphLockIn should increase pop < burst < transporter",
  );

  assert(errors.length === 0, "browser console/page errors: " + errors.join(" | "));

  await browser.close();

  if (failed) {
    process.exit(1);
  }
  console.log("smoke:workbench OK — hydrated controls and preview at " + BASE + "/");
}

main().catch(function (err) {
  console.error("smoke:workbench failed:", err.message);
  process.exit(1);
});
