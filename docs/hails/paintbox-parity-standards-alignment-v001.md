# Paintbox parity — standards alignment addendum v001

**Status:** **Active** — extends package binding and HASC; does not replace them.  
**Praxis:** `pso-20260619-axiom-paintbox-parity-standards-alignment`  
**Supersedes (partial):** ad-hoc parity judgment (screenshots only), effect-only G2 as sole authoring gate, implicit glyph “good enough” after package DOM landed.

**Authority chain:** `hail-authoring-surface-contract-v001.md` → `hail-authoring-package-v001.md` → `hails-render-parity-v001.md` → this addendum.

---

## 1. Problem

Package binding (slices H1–H3) and numeric delivery fingerprint (`hailAuthoringSurfaceContract.ts`) established **one compositor** and **shared tier math**. Operator review still shows:

- **Effect** and **glyph** inside the package not reading as one composed unit (beam vs mark geometry).
- **Forge TV size** vs **Hails compose** compared at the wrong mode (Design view) or mid-choreography frame.
- **Glyph layer** presentation (projection, scale, optical center, resolve animation) still diverges from standards-backed delivery expectations — treat as **in scope**, not “phasing only.”

Industry and W3C-adjacent practice separates **contract parity** (same inputs → same numbers/DOM) from **visual parity** (same payload → same perceptual result) and **token parity** (same semantics across web + TV).

---

## 2. Standards map (external → ctrl-alt)

| External standard / practice | What it governs | ctrl-alt binding |
| --- | --- | --- |
| **DTCG Design Tokens Format 2025.10** ([spec](https://www.designtokens.org/TR/2025.10/format/)) | Portable color, dimension, **duration**, **cubicBezier**, **transition** composites | `standards-bundle.json`, `theme-proto.tokens.json`, `--ca-*`; extend to `lifecycle_timing`, `choreographyAnchors`, `PAINTBOX_TIERS` |
| **CSS Transforms** ([TR](https://drafts.csswg.org/css-transforms-1/)) | Local coordinate systems, `transform-origin`, cumulative transforms | `data-hail-package` reference box; cluster `--hail-authoring-glyph-scale` |
| **Compositing and Blending** + **`isolation`** ([TR](https://www.w3.org/TR/compositing-1/)) | Isolated groups; children composite inside a boundary | Package = isolated compositing group; effect canvas + glyph layer share inset box |
| **Web Animations Level 2** — group effects ([TR](https://www.w3.org/TR/web-animations-2/)) | Shared timeline; child effects inherit parent transformed time | Registry `entrance_ms` + `choreographyAnchors`; glyph resolve, beam, message reveal as **one timeline bus** |
| **Visual regression discipline** (component + in-context gates, deterministic CI captures) | Baselines in fixed environment; perceptual or structural diff | G2 harness (effect-only today) → extend to **full package** stable frames |

---

## 3. Two-tier parity gates (locked)

### Tier A — Contract (existing, keep)

| Check | Module / script |
| --- | --- |
| Single compositor, no parallel renderer | `verify-hails-authoring-surface-contract-v001.mjs` |
| Delivery fingerprint S/M/L | `hailAuthoringSurfaceContract.ts` |
| Package DOM + chip catalog | `verify-hails-paintbox-authoring-chrome-v001.mjs` |
| Consumer path only | `verify-hails-render-parity-v001.mjs` |

**Passes when:** Forge TV size and Hails compose share `widthPct`, `heightPct`, `clusterScale` for each tier.

### Tier B — Visual (new, required for “standards aligned”)

| Check | Method |
| --- | --- |
| Full **package** (glyph + effect + message) at **stable** or agreed phase | Fixture JSON + fixed **18×16rem** viewport; Docker CI capture |
| Forge **TV size** vs Hails **compose** | Same `derive-preview` payload; perceptual diff threshold (e.g. 0.1–0.5% pixel ratio) or structural beam/glyph bounds |
| Transporter vs LCARD reference | Extend G2 pattern from canvas-only to package stack where applicable |
| Glyph layer | `glyph_render` projects; mark visible at stable; optical center within package tolerance |

**Fails when:** beam centroid, glyph bounding box, or tier envelope visibly diverge between surfaces at stable — regardless of Tier A pass.

---

## 4. Layer responsibilities (glyph in scope)

Per `hails-render-parity-v001.md` §2. **All three layers** must meet Tier B before campaign exit:

| Layer | Standards work |
| --- | --- |
| **Shell** | Placement anchor, tier envelope, viewport lock — Tier A covered; visual spot-check upper_center vs center |
| **Effect** | Package-scoped canvas; single anchor-aware `beam` rect; tokenized timing | 
| **Glyph** | `derive-preview` → `glyph_render` only; scale inside package; resolve animation on **authoring** variant (`scan_resolve-authoring`); optical anchor / viewBox centering for custom marks |

**Rule:** Do not tune effect motion to compensate for incorrect glyph geometry. Fix glyph projection and package binding first.

---

## 5. Compositing hygiene (implementation)

Align DOM/CSS with `hail-authoring-package-v001.md`:

1. **`data-hail-package`** — `absolute inset-0` authoritative; reconcile `index.css` `position: relative` override.
2. **`isolation: isolate`** on package (or hero) so effect and glyph composite as one unit.
3. **Transporter draw path** — one `resolveBeamBounds(..., anchorX, anchorY)` result passed to column, shimmer, particles, and VFX helpers.
4. **Timeline bus** — document `phaseProgress` + `choreographyAnchors` as the authoring timeline contract (WAAPI group-effect analogue); glyph, beam, message offsets declared against `entrance_ms`.

---

## 6. Token promotion (standards bundle)

Promote to ctrl-alt-standards (when touching contracts):

| Token group | Examples | Consumers |
| --- | --- | --- |
| `duration` | `entrance_ms`, `exit_ms`, `glyph_resolve_ms` | Web CSS vars, LCARD bridge, future APK |
| `dimension` | tier `widthFraction`, `heightFraction`, `glyphVisualFraction` | `PAINTBOX_TIERS`, Android PaintBoxTier |
| `color` | palette roles (`beamCyan`, …) | Canvas + CSS field styles |
| `transition` / choreography | `glyphResolveStart`, `glyphLockIn` | Registry identity merge |

Use DTCG 2025.10 shape; bump `bundle_version` per `implementation-plan.md`.

---

## 7. Implementation slices

| Slice | Deliverable | Status |
| --- | --- | --- |
| **I1 — Compositing CSS** | Package `inset-0` + isolation; remove geometry drift | **partial** — CSS landed; authoritative layout gated on delivery mode |
| **I2 — Beam unification** | Single anchor-aware beam through all canvas helpers | pending |
| **I3 — Glyph presentation** | `glyph_render` display, cluster scale, optical center, authoring resolve | **shipped** — `pso-20260622-axiom-hail-hero-first-preview` |
| **I4 — Full-package captures** | Stable-frame Forge TV vs Hails compose × surfaces | **shipped** — harness + live capture (HH6) |
| **I5 — Token export** | Choreography + tier envelope in standards bundle | **shipped** |

Slices H1–H3 (package DOM) remain **Tier A partial**; **I*** gates **standards-aligned** parity. **Operator-visible layered centered preview is not shipped** — `pso-20260614-axiom-preview-tier-b-visual-gate-decision`.

---

## 8. Verification (target)

```bash
cd frontend && npm run build
npm run verify:hails-authoring-surface-contract
npm run verify:hails-render-parity
# npm run verify:hails-paintbox-parity-standards-v001
# npm run capture:hails-package-parity-stable
```

**Manual (until I4):** Same loadout → Forge **TV size** + Hails compose → compare **stable** frame; anchor offset only.

---

## 9. Related

| Doc | Role |
| --- | --- |
| `paintbox-authoring-preview-unified-plan-v001.md` | Geometry + intent reconciliation |
| `hail-authoring-package-v001.md` | Package DOM |
| `hail-authoring-surface-contract-v001.md` | HASC three planes |
| `hails-render-parity-v001.md` | Consumer SSOT |
| `reports/hails-transporter-parity-g2-v001.md` | Effect reference harness |
| `glyph-composition-direction-v001.md` | Glyph identity doctrine |

---

## 10. Explicit non-goals

- Replacing `derive-preview` with a Forge-only glyph renderer.
- Pixel-perfect match to LCARD at every choreography frame (structural + stable-frame sufficient for Tier B v1).
- “Interesting” choreographed spatial offsets (beam through emblem centroid) — future slice after Tier B passes.
