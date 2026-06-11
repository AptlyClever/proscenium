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
      errors.push(msg.text());
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

  await page.click("#preview-btn");
  await page.waitForFunction(
    function () {
      const group = document.getElementById("overlay-group");
      return group && !group.hidden;
    },
    { timeout: 5000 },
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
