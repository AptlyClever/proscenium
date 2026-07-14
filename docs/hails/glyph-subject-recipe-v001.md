# Glyph subject recipe v001 — representation layer contract

**Status:** Active — Phase 1 schema (representation bet).  
**North-star subject:** combadge (`char_combadge_delta_v1`, lead phrase **delta combadge**).  
**Pause:** `imprint-hail-glyph-generation-pause` — slot/kind roulette remains frozen; **subject recipes** are the approved path for shaped marks.  
**Gap imprint:** `imprint-hail-glyph-representation-layer-gap`  
**Engine (unchanged):** `glyph-engine-capabilities-v001.md` — envelope, TV projection, derive-preview, APK tint.

---

## 1. Purpose

A **subject recipe** is the representation-layer contract between **subject intent** (combadge, guardian, Mars beacon) and the **`procedural_graph`** ink the delivery engine already ships.

| Layer | Question it answers | Module examples |
| --- | --- | --- |
| **Subject recipe** | *What* is the mark? | `hail_glyph_combadge.py`, future `hail_glyph_subject_registry.py` |
| **Engine** | *How* is ink delivered on TV? | `hail_glyph_envelope.py`, `hail_glyph_tv_projection.py`, `hails_glyph_render.py` |
| **Plot / judgment** | *Does the operator read the subject?* | `#/axiom/hails/plot`, operator P1 — not automated gate alone |

This doc defines **`subject_recipe_v1`** metadata and module conventions. It does **not** redefine generation grammar (`slot_*`, `compose_*`) or product essence (`doctrine-hail-glyph-essence`).

---

## 2. Identifier rules

| Field | Rule | Example |
| --- | --- | --- |
| `recipe_id` | snake suffix `_v1`; prefix by kind | `char_combadge_delta_v1` |
| `character_id` | stable slug inside composition | `combadge_delta` |
| `lead_phrase` | operator naming phrase (L3 gate) | `delta combadge` |
| `character_type` | taxonomy for docs/verify | `fleet-combadge`, `mascot-character` |
| `glyph_id` (fleet) | `custom-<slug>` on register | `custom-combadge` |
| `plot_id` (fixture) | `<glyph_id>-plot` | `custom-combadge-plot` |

**One recipe → one canonical path source.** Plot fixtures and Forge output must **derive from the recipe**, not maintain parallel hand-edited path strings.

---

## 3. `subject_recipe_v1` document shape

Machine-readable schema: `config/hails/glyph-subject-recipe.schema.v001.json`.

```json
{
  "schema": "subject_recipe_v1",
  "recipe_id": "char_combadge_delta_v1",
  "status": "active",
  "kind": "prop",
  "lead_phrase": "delta combadge",
  "character_type": "fleet-combadge",
  "character_id": "combadge_delta",
  "keyword_triggers": ["combadge", "communicator", "starfleet", "delta"],
  "operator_default": true,
  "variation_policy": {
    "stroke_jitter": true,
    "coordinate_jitter": false,
    "envelope_jitter": false,
    "instance_jitter": false,
    "focal_uplift": false,
    "depth_shadow_pass": true,
    "proof_mode_required_for_register": false
  },
  "composition": {
    "schema": "char_v1",
    "path_roles": ["mass", "ground", "accent"],
    "max_primary_paths": 3
  },
  "module": {
    "python": "hail_glyph_combadge",
    "render_fn": "render_combadge_recipe"
  },
  "plot": {
    "plot_id": "custom-combadge-plot",
    "glyph_id": "custom-combadge",
    "subject_phrase": "delta combadge"
  },
  "exit_criteria": {
    "operator_p1": "24px thumbnail — name combadge without label",
    "consumer_path": "derive-preview → glyph_render → APK ProceduralGlyphDisplay"
  }
}
```

### Required fields

| Field | Type | Meaning |
| --- | --- | --- |
| `schema` | `"subject_recipe_v1"` | Contract version |
| `recipe_id` | string | `generator_id` on emitted `procedural_graph` |
| `status` | `draft` \| `active` \| `retired` | Fleet eligibility |
| `kind` | `prop` \| `character` \| `place` \| `person` | Maps to essence representation kinds |
| `lead_phrase` | string | Single subject phrase for operator review |
| `character_id` | string | Stable id inside `composition` block |
| `keyword_triggers` | string[] | Forge name/hail keyword routing (deterministic) |
| `variation_policy` | object | Which post-render mutations are allowed |
| `composition.schema` | `"char_v1"` | Aligns with `procedural_graph.composition` |
| `module.python` | string | Authored renderer module (no slot roulette) |

### Optional fields

| Field | Meaning |
| --- | --- |
| `operator_default` | Default Forge Reset family when no keyword match |
| `character_type` | Doc/taxonomy only |
| `plot` | Links recipe to plot fixture for P1 judgment |
| `exit_criteria` | Human gates — not CI substitutes |

---

## 4. `procedural_graph` emission contract

Every recipe render function returns paths compatible with **`glyph-generation-standard-v001.md`** and must set:

```json
{
  "version": 1,
  "generator_id": "<recipe_id>",
  "composition": {
    "schema": "char_v1",
    "character_id": "<character_id>",
    "lead_phrase": "<lead_phrase>",
    "character_type": "<character_type>",
    "anchor": { "cx": 24, "cy": 24 }
  },
  "paths": [ "... authored at 48×48 ..." ],
  "signature": "<hash of path geometry>"
}
```

### Path roles (TV-aware)

| Role | Purpose |
| --- | --- |
| `mass` | Outer hull / primary silhouette |
| `ground` | Secondary structure (transponder oval, face plane) |
| `accent` | Subordinate detail (grille, chest sigil) |
| `charge` | Legacy alias — prefer `mass` for props |
| `shadow` | Canonical depth only — merged on TV projection |

Roles are consumed by `hail_glyph_tv_projection.project_procedural_graph_for_google_tv()` — subject authorship must assume TV merge behavior.

### Forbidden on subject recipes

- Random coordinate roulette (`_GlyphRng.coord()` placement of primitives)
- Slot field × charge combinatorics as subject stand-in
- `generator_id: plot_fixture_v1` or other non-recipe ids on fleet paths
- `composition.schema: plot_v1` — use `char_v1`; plot is a **stage**, not a schema family

---

## 5. Variation policy semantics

Post-render mutations in `generate_procedural_graph()` (`hail_glyph_procedural.py`) must honor recipe policy:

| Flag | When true | Risk if mis-set |
| --- | --- | --- |
| `stroke_jitter` | Re-encode / `variation_only` may nudge stroke widths | Low — acceptable pose drift |
| `coordinate_jitter` | RNG moves anchor coordinates | **High** — destroys subject read |
| `envelope_jitter` | `apply_procedural_graph_instance_jitter` | **High** — moves silhouette |
| `focal_uplift` | `uplift_procedural_graph_hero_focal_mass` | Medium — can distort proportions |
| `depth_shadow_pass` | `apply_canonical_depth_pass` | Medium — adds paths; TV merges shadows |
| `proof_mode_required_for_register` | Register blocked unless `proof_mode: true` on spec | Governance — not yet wired |

**Comb badge v1 policy (locked for Phase 2):** stroke jitter only; no coordinate/envelope jitter on first ship.

---

## 6. Registry contract (Phase 1 — doc only)

Future module: `backend/hail_glyph_subject_registry.py`.

| API | Behavior |
| --- | --- |
| `resolve_recipe_id(glyph_name, hail_name, explicit_family?)` | Keyword match → recipe; else operator default |
| `list_active_recipes()` | Fleet-facing catalog for docs/tests |
| `recipe_metadata(recipe_id)` | Returns `subject_recipe_v1` row |
| `render_recipe(recipe_id, rng, *, variation_only)` | Delegates to module `render_fn` |

**Replaces scattered tables in:** `hail_glyph_operator_seed.py`, `hail_glyph_kind.py` keyword picks (for shaped subjects only). Slot/icon grammar-lab families stay explicit `glyph_family_id` only.

**Operator seed default:** `char_combadge_delta_v1` (`OPERATOR_SHAPED_DEFAULT_FAMILY` in `hail_glyph_operator_seed.py`).

---

## 7. Pipeline binding (recipe → APK)

Canonical handoff — one graph, two projections:

```text
render_combadge_recipe()
  → procedural_graph (canonical)
  → normalize_procedural_graph_envelope()
  → custom_glyphs[glyph_id]  (Axiom settings)
  → hail.icon.value = glyph_id
  → build_consumer_render_payload()
       ├─ glyph_render_canonical  (authoring / Forge Canonical toggle)
       └─ glyph_render            (project_procedural_graph_for_google_tv)
  → derive-preview / send_hail_package
  → LCARD axiom-hail-render-payload-adapter.js
  → APK ProceduralGlyphParser → ProceduralGlyphDisplay
```

**Judgment surfaces must use consumer helpers:**

| Surface | Must use | Must not use |
| --- | --- | --- |
| Forge / Hails Paintbox | `HailConsumerGlyph` + derive-preview payload | Raw `customGlyph` SVG parallel |
| Plot P1 (target) | Canonical + **TV delivery** panels from `resolve_glyph_render` | Raw fixture graph via `HailProceduralGlyph` alone |
| APK | `glyph_render.procedural_graph` (projected) | Registry drawable for `custom-*` |

---

## 8. Plot stage binding

| Artifact | Role |
| --- | --- |
| `config/hails/plot-fixtures/<plot_id>.fixture.json` | Static judgment fixture — **generated from recipe**, not independent art |
| `glyph_plot_verify.py` | Metrics + heuristics — **necessary, not sufficient** |
| Operator P1 on `#/axiom/hails/plot` | Product exit for combadge |

Plot fixture required fields (extends plot gate):

```json
{
  "plot_id": "custom-combadge-plot",
  "glyph_id": "custom-combadge",
  "subject_phrase": "delta combadge",
  "proof_mode": true,
  "recipe_id": "char_combadge_delta_v1",
  "procedural_graph": { "... from recipe at variation_only=false ..." }
}
```

**Register gate (Phase 2 — not shipped):** `register_custom_glyph` should require plot pass + operator P1 for `proof_mode` subjects. Today register only runs hero metrics (`hails_composer.validate_custom_glyph_spec`).

---

## 9. Reference recipe — combadge

| Field | Value |
| --- | --- |
| `recipe_id` | `char_combadge_delta_v1` |
| Module | `backend/hail_glyph_combadge.py` |
| `render_fn` | `render_combadge_recipe` |
| Existing tests | `backend/tests/test_hail_glyph_combadge.py` |
| Known gap | Operator P1 fail 2026-06-20 — geometry iteration in recipe module only |

**Consolidation rule:** Delete parallel path sources:

1. Hand-maintained plot fixture paths diverging from `render_combadge_recipe`
2. Duplicate `build_combadge_glyph_spec` seeds that bypass recipe after consolidation
3. `composition.schema: plot_v1` on fixtures

---

## 10. Adding a second recipe (after combadge P1)

1. Add `subject_recipe_v1` row + `hail_glyph_<subject>.py` with authored paths.
2. Register in `hail_glyph_subject_registry.py` with keyword triggers.
3. Add pytest: render → valid graph → envelope → TV projection parse (APK parser fixture).
4. Optional plot fixture + operator P1 — not required for grammar-lab explicit `glyph_family_id` seeds.
5. Do **not** add slot recipes as substitute for subject coverage.

---

## 11. Verification (Phase 1)

```bash
# Recipe render + envelope (existing)
python3 -m pytest backend/tests/test_hail_glyph_combadge.py -q

# Plot metrics — does NOT prove subject read
npm run verify:glyph-plot

# Consumer golden path (after register)
python3 -m pytest backend/tests/test_hail_glyph_character_proof.py -q
npm run verify:hails-glyph-hero-proof-v001
```

**CI green on plot verify ≠ combadge P1 pass** (`imprint-hail-glyph-plot-gate-semantics-failure`).

---

## 12. Related docs

| Doc | Relationship |
| --- | --- |
| `glyph-engine-capabilities-v001.md` | Engine vs plot vs recipe split |
| `glyph-forge-seed-policy-v001.md` | Operator deterministic routing |
| `hero-glyph-proof-v001.md` | Guardian reference recipe pattern |
| `glyph-composition-direction-v001.md` | Grammar only — not subject layer |
| `hails-authority-v001.md` | Axiom SoT → LCARD → APK |
| `imprint-hail-glyph-representation-layer-gap` | Gap close criteria |

---

## 13. Phase checklist

| Phase | Deliverable | Status |
| --- | --- | --- |
| **1** | This schema + JSON schema file | **This doc** |
| **2** | Combadge recipe geometry + single path source | Pending operator approval |
| **3** | Operator P1 pass on consumer path | Pending |
| **4** | Registry module + Forge recipe id display | Pending |
| **5** | Plot/register gate for `proof_mode` subjects | Pending |

Edit Praxis when promoting to fleet policy; mirror under `docs/praxis/` per project convention.
