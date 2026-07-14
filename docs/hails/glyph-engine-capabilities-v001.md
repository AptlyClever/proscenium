# Glyph engine capabilities v001

**Status:** Active — plot proof contract (`chain-glyph-plot-proof`).  
**Campaign:** `pso-20260620-axiom-glyph-plot-proof`  
**Pause:** `imprint-hail-glyph-generation-pause` — generation frozen until plot exits.  
**Companion:** `glyph-generation-standard-v001.md`, `hails-render-parity-v002.md`, `glyph-hero-quality-v001.md`

---

## 1. Two layers (do not conflate)

| Layer | Role | Status |
| --- | --- | --- |
| **Plot** | Author *what* the mark is on the 48×48 grid; judge subject read at 48 / 96 / 24px | **Building** (P1) |
| **Engine** | Normalize envelope, project for TV, package, derive-preview, APK tint | **Shipped** |

Paintbox is **engine verification** on a composed hail — not a design canvas. Forge Re-encode / seed-glyph is **generation** — paused.

---

## 2. Canonical grid

| Field | Value | Code |
| --- | --- | --- |
| ViewBox | `0 0 48 48` | `glyph-generation-standard-v001` |
| Optical center | `(24, 24)` | `hail_glyph_optical.OPTICAL_TARGET` |
| Optical box (hero ink) | ~26×26 inside shield | `glyph-hero-intent-v001` §2 |
| Focal floor (longest bbox edge) | ≥ **20dp** post-envelope | `hail_glyph_hero_quality._FOCAL_MIN_EDGE` |
| Focal ceiling | ≤ **28dp** | `_FOCAL_MAX_EDGE` |
| Envelope | `ghost_shield_v1` | `hail_glyph_envelope` |
| Centroid tolerance | ± **4.5dp** from optical center | `_CENTROID_TOLERANCE` |
| Min charge stroke | ≥ **2.0** | `_MIN_CHARGE_STROKE` |

---

## 3. Consumers (engine outputs)

| Consumer id | Field | Graph |
| --- | --- | --- |
| `axiom_authoring` | `glyph_render_canonical` / authoring | Full canonical graph (depth, envelope) |
| `google_tv_apk` | `glyph_render` | `project_procedural_graph_for_google_tv()` — shadow merge, ≤8 paths |
| `html_preview` | derive-preview | Same stack as APK for honesty |

**Rule:** No parallel client-side re-projection on authoring surfaces (`hails-render-parity-v002`).

---

## 4. Engine mutations (allowed on saved graphs)

| Mutation | When | Module |
| --- | --- | --- |
| Envelope normalize | Register / seed pipeline | `normalize_procedural_graph_envelope` |
| Depth shadow pass | Canonical hero graphs | `apply_canonical_depth_pass` |
| Instance jitter | `variation_only` / `remix` (fleet mode) | `apply_procedural_graph_instance_jitter` |
| Focal uplift | After jitter (fleet mode) | `uplift_procedural_graph_hero_focal_mass` |
| TV projection | Consumer `google_tv_apk` | `project_procedural_graph_for_google_tv` |

---

## 5. `proof_mode` (plot fixtures)

Plot-approved glyphs carry **`proof_mode: true`** on the fixture or custom spec metadata.

| Rule | Fleet (`proof_mode: false`) | Proof (`proof_mode: true`) |
| --- | --- | --- |
| Source | Generator / Forge seed | **Traced SVG** → `combadge-tng-traced.svg` |
| Display on Plot | Envelope-normalized | **Authored paths only** (no `envelope_id`) |
| `variation_only` / `remix` | Allowed per policy | **Forbidden** |
| Instance jitter | Allowed | **Forbidden** |
| `seed-glyph` roulette | Allowed | **Forbidden** |
| Path ink (proof) | Generator-defined | **Stroke-only** (`fill: none`, `stroke: currentColor`) |
| Register | After hero gates | After **plot gate** + operator P1 |
| Re-encode | Variation inside family | **Disabled** until operator clears proof |

**First proof subject:** `custom-combadge` — fixture `config/hails/plot-fixtures/custom-combadge-plot.fixture.json` generated from traced SVG via `scripts/import-combadge-svg.py`.

**Operator surface:** `#/axiom/hails/plot` (in-app; LAN URL e.g. `http://192.168.68.93:7895/#/axiom/hails/plot`). Doctrine: `doctrine-axiom-judgment-scale-plot-surface-v001`.

---

## 6. Plot gate (P1 — not hero metrics alone)

Plot gate runs **before** register on **authored** graphs (no envelope mutation). Structural checks plus focal floor on raw ink:

| Check | Fail means |
| --- | --- |
| Focal floor ≥20dp (authored bbox) | Ink too small for TV |
| Exactly 2 primary paths (accent + mass) | Wrong combadge topology |
| All paths stroke-only (`fill: none`) | Filled blob at distance |
| No `envelope_id` on fixture graph | Plot showing delivery-mutated ink |
| No emblem roles (`ground`, `charge`) | Heraldic parts-list |
| Delta overhangs backing (top + bottom) | Shield-in-oval misread |
| TV projection non-empty | Engine cannot deliver |
| Plot strip artifact exists | No operator visual evidence |

**Reference assets:** `config/hails/plot-fixtures/assets/combadge-tng-reference.png` (operator photo) and `combadge-tng-traced.svg` (SoT). Plot UI shows reference beside 24px panel for A/B only.

**Primary validation:** Glyph Plot view in Axiom (`GET /api/hails/glyph-plot/fixtures/{plot_id}`) — not local `reports/` files on dev-ubuntu.

**Command:** `npm run verify:glyph-plot` (repo root via frontend package).

**Does not replace:** operator 24px subject read ("combadge" without label) — required for chain step 24 exit.

---

## 7. What generation pause blocks

Until `chain-glyph-plot-proof` exits:

- New `char_*` / `slot_*` / `icon_*` generators as fleet path
- Forge seed policy / Re-encode semantics changes
- Procedural tuning without an approved plot fixture
- Achievement path C-C / C-D / D

**Not blocked:** envelope, TV projection, derive-preview, package, plot verifier, static fixtures.

---

## 8. File map

| Artifact | Path |
| --- | --- |
| Plot fixture (combadge) | `config/hails/plot-fixtures/custom-combadge-plot.fixture.json` |
| Plot strip (generated) | `config/hails/plot-fixtures/custom-combadge-plot.strip.svg` |
| Plot API | `GET /api/hails/glyph-plot/fixtures`, `…/{plot_id}`, `…/{plot_id}/strip.svg` |
| Plot UI | `#/axiom/hails/plot` |
| Verifier | `scripts/verify-glyph-plot.mjs` → `backend/glyph_plot_verify.py` |
| Subagent handoff | `docs/praxis/glyph-plot-proof-handoff-v001.md` |

---

## 9. Related Praxis

| Marker | Object |
| --- | --- |
| CHAIN | `scheme-hail-platform-work-chain` step 24 |
| PAUSE | `imprint-hail-glyph-generation-pause` |
| PLOT | `pso-20260620-axiom-glyph-plot-proof` |
