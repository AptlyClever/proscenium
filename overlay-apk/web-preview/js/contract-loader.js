/**
 * Axiom Hails render contract loader — LCARD consumer boundary.
 *
 * Primary: Axiom API GET /api/hails/render-contract ({ summary, contract })
 * Fallback: vendored local mirror (never silent canonical)
 */

export const CONTRACT_SOURCE_AXIOM_API = "axiom-api";
export const CONTRACT_SOURCE_LOCAL_MIRROR = "local-mirror-fallback";
export const CONTRACT_SOURCE_ERROR = "error";

export const REQUIRED_CONTRACT_VERSIONS = Object.freeze(["v001-integration", "v002-beta"]);
export const REQUIRED_CONTRACT_VERSION = REQUIRED_CONTRACT_VERSIONS[0];
export const REQUIRED_NAMED_EFFECTS = ["none", "pop", "burst", "transporter"];

const CANONICAL_REPOSITORY = "AptlyClever/ctrl-alt-axiom";

/** Resolve Axiom base URL from explicit option, query string, or global config. */
export function resolveAxiomBaseUrl(options) {
  if (options && options.axiomBaseUrl) {
    return String(options.axiomBaseUrl).replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.__HAIL_AXIOM_BASE_URL__) {
    return String(window.__HAIL_AXIOM_BASE_URL__).replace(/\/+$/, "");
  }
  if (typeof globalThis !== "undefined" && globalThis.__HAIL_AXIOM_BASE_URL__) {
    return String(globalThis.__HAIL_AXIOM_BASE_URL__).replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("axiomBaseUrl");
    if (fromQuery) {
      return fromQuery.replace(/\/+$/, "");
    }
  }
  return null;
}

/** Normalize Axiom API envelope or raw mirror document to contract object. */
export function normalizeContractDocument(body) {
  if (!body || typeof body !== "object") {
    throw new Error("contract response must be an object");
  }
  if (body.contract && typeof body.contract === "object") {
    return body.contract;
  }
  if (body.version && body.ownership) {
    return body;
  }
  throw new Error("unrecognized contract response shape");
}

/** Minimum integrity checks for Axiom-owned Hails render contract (v001 + v002-beta). */
export function validateContractIntegrity(contract) {
  const errors = [];
  if (!contract || typeof contract !== "object") {
    return { valid: false, errors: ["contract must be an object"] };
  }
  if (!REQUIRED_CONTRACT_VERSIONS.includes(contract.version)) {
    errors.push(
      "version must be one of " +
        REQUIRED_CONTRACT_VERSIONS.join(", ") +
        " (got " +
        contract.version +
        ")",
    );
  }
  const ownership = contract.ownership || {};
  if (ownership.hails !== "axiom") {
    errors.push("ownership.hails must be axiom");
  }
  const named = contract.previewVisual && contract.previewVisual.namedEffects;
  const allowlist = (named && named.allowlist) || [];
  REQUIRED_NAMED_EFFECTS.forEach(function (id) {
    if (!allowlist.includes(id)) {
      errors.push("namedEffects.allowlist missing " + id);
    }
    const entry = named && named.effects && named.effects[id];
    if (!entry) {
      errors.push("namedEffects.effects." + id + " required");
      return;
    }
    const lt = entry.lifecycleTiming;
    if (
      !lt ||
      typeof lt.entrance_animation_ms !== "number" ||
      typeof lt.exit_animation_ms !== "number"
    ) {
      errors.push(id + " lifecycleTiming entrance/exit ms required");
    }
  });
  return { valid: errors.length === 0, errors: errors };
}

export function buildContractSourceMetadata(source, contract, extra) {
  const meta = Object.assign(
    {
      source: source,
      version: contract && contract.version,
      ownership: contract && contract.ownership && contract.ownership.hails,
      canonicalRepository: CANONICAL_REPOSITORY,
      fetchedAt: extra && extra.fetchedAt ? extra.fetchedAt : null,
      axiomBaseUrl: extra && extra.axiomBaseUrl ? extra.axiomBaseUrl : null,
      fallbackReason: extra && extra.fallbackReason ? extra.fallbackReason : null,
      mirrorPath:
        extra && extra.mirrorPath ? extra.mirrorPath : "/shared/hail-render-contract.json",
    },
    extra || {},
  );
  return meta;
}

function formatSourceLabel(source) {
  switch (source) {
    case CONTRACT_SOURCE_AXIOM_API:
      return "Axiom API";
    case CONTRACT_SOURCE_LOCAL_MIRROR:
      return "local mirror fallback";
    case CONTRACT_SOURCE_ERROR:
      return "error";
    default:
      return source;
  }
}

export function formatContractSourceDiagnostics(metadata) {
  if (!metadata) {
    return "Contract source: unknown";
  }
  const parts = [
    "Contract source: " + formatSourceLabel(metadata.source),
    "Contract version: " + (metadata.version || "—"),
    "Canonical: " + (metadata.canonicalRepository || CANONICAL_REPOSITORY),
  ];
  if (metadata.fetchedAt) {
    parts.push("Fetched: " + metadata.fetchedAt);
  }
  if (metadata.fallbackReason) {
    parts.push("Fallback: " + metadata.fallbackReason);
  }
  return parts.join(" · ");
}

/** Hail Endpoint Model v001 — visual harness preview context (not a room). */
export const VISUAL_HARNESS_ENDPOINT_V001 = Object.freeze({
  originKind: "workbench",
  originId: "visual_workbench",
  destinationKind: "preview_surface",
  destinationId: "lcard_hail_visual_harness",
  deliveryMode: "visual_preview",
  safetyMode: "test",
  allowsLiveDelivery: false,
});

export function formatVisualHarnessEndpointReadout() {
  const e = VISUAL_HARNESS_ENDPOINT_V001;
  return (
    "Endpoint: " +
    e.originKind +
    ":" +
    e.originId +
    " → " +
    e.destinationKind +
    ":" +
    e.destinationId +
    " · " +
    e.deliveryMode +
    " · " +
    e.safetyMode +
    " · live delivery: no"
  );
}

/**
 * Load Hails render contract — Axiom API primary, local mirror fallback only.
 *
 * @param {object} options
 * @param {Function} options.fetchImpl
 * @param {string} [options.axiomContractUrl] — full URL; overrides base/proxy
 * @param {string} [options.axiomBaseUrl]
 * @param {string} [options.proxyContractUrl] — same-origin proxy (default /api/hails/render-contract)
 * @param {string} [options.mirrorUrl]
 */
export async function loadHailRenderContract(options) {
  const opts = options || {};
  const fetchImpl = opts.fetchImpl || fetch;
  const mirrorUrl = opts.mirrorUrl || "/shared/hail-render-contract.json";
  const proxyContractUrl = opts.proxyContractUrl || "/api/hails/render-contract";
  const axiomBaseUrl = resolveAxiomBaseUrl(opts);
  const axiomContractUrl =
    opts.axiomContractUrl ||
    (axiomBaseUrl ? axiomBaseUrl + "/api/hails/render-contract" : null);

  const attempts = [];

  if (proxyContractUrl) {
    attempts.push({
      label: "preview-proxy",
      url: proxyContractUrl,
      source: CONTRACT_SOURCE_AXIOM_API,
    });
  }
  if (axiomContractUrl && axiomContractUrl !== proxyContractUrl) {
    attempts.push({
      label: "axiom-direct",
      url: axiomContractUrl,
      source: CONTRACT_SOURCE_AXIOM_API,
    });
  }

  let apiError = null;

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i];
    try {
      const res = await fetchImpl(attempt.url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      const body = await res.json();
      const contract = normalizeContractDocument(body);
      const check = validateContractIntegrity(contract);
      if (!check.valid) {
        throw new Error(check.errors.join("; "));
      }
      return {
        contract: contract,
        source: CONTRACT_SOURCE_AXIOM_API,
        metadata: buildContractSourceMetadata(CONTRACT_SOURCE_AXIOM_API, contract, {
          fetchedAt: new Date().toISOString(),
          axiomBaseUrl: axiomBaseUrl || attempt.url.replace(/\/api\/hails\/render-contract$/, ""),
          loadPath: attempt.label,
        }),
      };
    } catch (err) {
      apiError =
        (apiError ? apiError + "; " : "") +
        attempt.label +
        ": " +
        (err && err.message ? err.message : String(err));
    }
  }

  try {
    const res = await fetchImpl(mirrorUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error("mirror HTTP " + res.status);
    }
    const body = await res.json();
    const contract = normalizeContractDocument(body);
    const check = validateContractIntegrity(contract);
    if (!check.valid) {
      throw new Error("mirror invalid: " + check.errors.join("; "));
    }
    return {
      contract: contract,
      source: CONTRACT_SOURCE_LOCAL_MIRROR,
      metadata: buildContractSourceMetadata(CONTRACT_SOURCE_LOCAL_MIRROR, contract, {
        fallbackReason: apiError || "Axiom API unavailable or not configured",
        mirrorPath: mirrorUrl,
        mirrorNote: "Fallback only — Axiom API is source of truth",
      }),
    };
  } catch (mirrorErr) {
    const reason =
      (apiError ? apiError + "; " : "") +
      "mirror: " +
      (mirrorErr && mirrorErr.message ? mirrorErr.message : String(mirrorErr));
    return {
      contract: null,
      source: CONTRACT_SOURCE_ERROR,
      metadata: buildContractSourceMetadata(CONTRACT_SOURCE_ERROR, null, {
        fallbackReason: reason,
      }),
      error: reason,
    };
  }
}

/** Optional: load Axiom render payload for a hail id (preview/dev only). */
export async function loadAxiomRenderPayload(hailId, options) {
  const opts = options || {};
  const fetchImpl = opts.fetchImpl || fetch;
  const id = (hailId || "").trim();
  if (!id) {
    throw new Error("hail id required");
  }
  const proxyBase = opts.proxyPayloadBase || "/api/hails";
  const axiomBaseUrl = resolveAxiomBaseUrl(opts);
  const url =
    opts.payloadUrl ||
    (axiomBaseUrl
      ? axiomBaseUrl + "/api/hails/" + encodeURIComponent(id) + "/render-payload"
      : proxyBase + "/" + encodeURIComponent(id) + "/render-payload");
  const res = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error("render-payload HTTP " + res.status);
  }
  return res.json();
}
