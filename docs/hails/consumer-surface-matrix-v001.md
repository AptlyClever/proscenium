# Hail consumer surface matrix v001

**Purpose:** Which surfaces implement which contract capabilities — companion to effect/object inventories (issue #77).

**Authority:** `docs/hails/hails-authority-v001.md` — Axiom CRUD; LCARD and APK consume from Axiom; registry stores as instructed.

**Refreshed:** 2026-06-15 post Transporter **Phase G** (G1–G4). Runtime device proof deferred (`control-alt-lcard#181`).

| Surface | Repo / path | Authority / contract source | Named effects | Glyph | Placement | Size tier | Lifecycle | Broker proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Axiom API | `ctrl-alt-axiom` | **Axiom SoT** — canonical JSON + settings CRUD | all 4 (+ alias) | allowlist | presets + custom | emits `size_tier` + `size_code` | projected in render-payload | N/A |
| Axiom authoring (registry-honest) | `frontend/src/hailTransporterCanvasPreview.ts` | Axiom derive + registry | transporter canvas (G1) | medallions | Paint Box envelope | honors `size_tier` | phased preview | N/A |
| Axiom Hails UI | `frontend/src/views/HailsView.tsx` | Axiom `GET /api/hails` | display only | medallions | route editor only | not editable in UI | none (static) | N/A |
| LCARD web-preview | `hail-overlay-poc/web-preview/` | Axiom API or mirror | **all 4 implemented** | SVG + emoji fallback | Paint Box | full S/M/L | full choreography | N/A |
| LCARD service delivery | `service/lib/axiom-hail-render-payload-adapter.js` | **Axiom fetch** (send path) | **transporter only** | passes `glyph_id` | passes placement | passes `size_tier` | maps lifecycle + **variation** (G3) | signs broker_proof incl. tier |
| LCARD overlay payload gate | `service/lib/hail-overlay-payload.js` | Axiom-published allowlist | `transporter_beam` | 3 glyphs | preset ids | emits `size_tier` | duration_ms + variation fields (G3) | validates |
| Android overlay APK | `hail-overlay-poc/app/...` | **Axiom payload via LCARD** (display) | **transporter_beam only** | 3 drawables | preset + custom | PaintBoxTier (#180) | phased transporter (#178) | required incl. tier |

**Legend:** ✅ full / ⚠️ partial / ❌ not implemented / 🔬 static-unit only (no device proof)

| Capability | Axiom API | Preview harness | Android prod |
| --- | --- | --- | --- |
| `none` | ✅ | ✅ | ❌ |
| `pop` | ✅ | ✅ | ❌ |
| `burst` | ✅ | ✅ | ❌ |
| `transporter` | ✅ | ✅ | 🔬 (`transporter_beam` — code merged; device proof deferred) |
| Paint Box layout | ✅ (contract) | ✅ | 🔬 (#178 static/unit) |
| Size tier (S/M/L) | ✅ | ✅ | 🔬 (#180 static/unit) |
| `effect_identity` consumption | ✅ (emit) | ✅ | ⚠️ (overlay POST carries merged identity; Kotlin renderer TBD) |
| `effect_variation_id` consumption | ✅ (emit) | ✅ (adapter + workbench load) | ⚠️ (overlay POST carries id + android tuning; Kotlin TBD) |
| Per-hail placement preset | ✅ | ✅ | 🔬 |
| TvOverlay delivery | ❌ (retired) | N/A | ❌ |

**Inventory conclusion:** Axiom contract, **authoring canvas (G1)**, and LCARD preview harness lead production Android by design. Phase G closed the authoring vs LCARD canvas gap for transporter; adapter now forwards variation metadata (G3). Android implements **transporter only** with Paint Box + size-tier code merged downstream. Runtime validation is a separate approved slice (**#181**) — not a blocker for Phase G exit.

**Evidence:** `reports/hails-transporter-phase-g-evidence-g4-v001.md`

**Cross-reference:** `docs/hails/hails-authority-v001.md`, `catalog-render-contract-hygiene-v001.md`, `size-tier-semantics-v001.md`, `effect-inventory-v001.md` (Phase G section).
