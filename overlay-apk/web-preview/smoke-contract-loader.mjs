/**
 * Contract loader unit tests — Node ESM (run: node smoke-contract-loader.mjs)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CONTRACT_SOURCE_AXIOM_API,
  CONTRACT_SOURCE_LOCAL_MIRROR,
  loadHailRenderContract,
  normalizeContractDocument,
  validateContractIntegrity,
} from "./js/contract-loader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mirrorPath = path.join(__dirname, "..", "shared", "hail-render-contract.json");
const mirrorContract = JSON.parse(fs.readFileSync(mirrorPath, "utf8"));

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

function mockFetch(handlers) {
  return async function (url) {
    const handler = handlers[url];
    if (!handler) {
      throw new Error("unexpected fetch: " + url);
    }
    return handler();
  };
}

assert(
  normalizeContractDocument({ contract: mirrorContract }).version === "v001-integration",
  "normalize accepts { summary, contract } envelope",
);
assert(
  normalizeContractDocument(mirrorContract).version === "v001-integration",
  "normalize accepts raw mirror",
);

const valid = validateContractIntegrity(mirrorContract);
assert(valid.valid, "mirror passes integrity: " + valid.errors.join("; "));

const invalid = validateContractIntegrity({ version: "bad", ownership: { hails: "lcard" } });
assert(!invalid.valid, "rejects invalid/non-Axiom contract");

(async function () {
  const apiOk = await loadHailRenderContract({
    fetchImpl: mockFetch({
      "/api/hails/render-contract": function () {
        return Promise.resolve({
          ok: true,
          json: function () {
            return Promise.resolve({ summary: {}, contract: mirrorContract });
          },
        });
      },
      "/shared/hail-render-contract.json": function () {
        return Promise.reject(new Error("mirror should not be called"));
      },
    }),
    proxyContractUrl: "/api/hails/render-contract",
    mirrorUrl: "/shared/hail-render-contract.json",
    axiomContractUrl: null,
  });
  assert(apiOk.source === CONTRACT_SOURCE_AXIOM_API, "source is axiom-api when API succeeds");
  assert(apiOk.contract.version === "v001-integration", "API contract version");

  const fallback = await loadHailRenderContract({
    fetchImpl: mockFetch({
      "/api/hails/render-contract": function () {
        return Promise.resolve({ ok: false, status: 503 });
      },
      "/shared/hail-render-contract.json": function () {
        return Promise.resolve({
          ok: true,
          json: function () {
            return Promise.resolve(mirrorContract);
          },
        });
      },
    }),
    proxyContractUrl: "/api/hails/render-contract",
    mirrorUrl: "/shared/hail-render-contract.json",
    axiomContractUrl: null,
  });
  assert(
    fallback.source === CONTRACT_SOURCE_LOCAL_MIRROR,
    "source is local-mirror-fallback when API fails",
  );
  assert(fallback.metadata.fallbackReason, "fallback reason recorded");

  console.log("smoke-contract-loader: OK");
})().catch(function (err) {
  console.error("smoke-contract-loader failed:", err.message);
  process.exit(1);
});
