# Hail glyph generation standard v001 (draft)

**Status:** Draft for operator review — not yet promoted to `ctrl-alt-standards`.  
**Owner:** Axiom (Hail definitions + glyph references).  
**Companion:** `docs/hails/glyph-inventory-v001.md`, `docs/hails/custom-glyph-library-v001.md`, issue #78, animation track issue #77.

---

## 1. Purpose

A **glyph** is the central impact mark of a Hail — the identity symbol shown inside the Paint Box / Glyph Focus region during delivery and on operator catalog tiles. Glyphs are not generic app icons, emoji reactions, or theme decorations.

**Hero Glyph** is the quality bar for that mark: the **main character** of the Hail — a composed **hero mark** that reads as one lead at Paint Box scale. See **`glyph-composition-direction-v001.md`** and **`glyph-hero-intent-v001.md`**. Legacy registry/test glyphs (e.g. early seed/eye proofs) are **not** models for new Forge heroes.

---

## 2. Naming convention

| Element | Rule | Example |
| --- | --- | --- |
| Glyph ID | kebab-case, prefix `hail-`, noun or short phrase | `default`, `default` |
| Hail ID | separate; dot-versioned hail record | `hail.spoon_transporter.001` |
| Asset filename | `glyph_<glyph_id_with_underscores>.xml` (Android) | `glyph_hail_spoon.xml` |
| Registry entry | `{ "glyph_id", "label", "status", ... }` | `config/hails/glyph-registry.v001.json` |

**One hail may reference one glyph ID.** Multiple hails may share a glyph only when intentionally grouped (document in inventory notes). Test hails with distinct tone should get distinct glyphs.

---

## 3. Visual constraints

| Constraint | Requirement |
| --- | --- |
| Aspect ratio | 1:1 square safe zone |
| ViewBox | 48×48 canonical design grid (scale to 96dp overlay / medallion sizes) |
| Line weight | 2–2.5px at 48×48; minimum 1.25px hairline for halos only |
| Shape language | Simple geometric silhouettes; readable at 10-foot TV distance |
| Detail budget | ≤ 3 primary paths + optional halo ring; composed emblem (field + charge), not lone primitive or collage; no fine texture |
| Monochrome core | Glyph path uses single `currentColor` / white fill; palette applied by renderer |
| Palette behavior | **Palette-aware tint**, not multi-color illustration — beam/surface tokens tint the mark |
| Background | Transparent; medallion shell is renderer chrome, not part of glyph asset |
| Prohibited | Photorealism, emoji-as-primary, text labels inside glyph, brand logos, clip-art |

---

## 4. Size / placement requirements

From `hail-render-contract.v001.json` Paint Box / Glyph Focus:

- Glyph renders inside Paint Box group (~32% × 34% layout fraction of overlay group).
- Android overlay: `GlyphDisplay` at **96dp** with palette tint.
- Axiom medallion: **40–48px** shell (`compact` / `standard`).
- Must remain legible when `size_tier` is `small` on TV.

---

## 5. Relationship to Hail tone / severity

| Hail category (Axiom) | Glyph tone guidance |
| --- | --- |
| `cute` | Rounded forms, soft curves (seed nose) |
| `status` | Balanced symmetry, clear silhouette |
| `summons` | Strong vertical or radial emphasis |
| `alert` | Angular cues allowed; avoid alarm-clock clichés |

Severity is carried by **palette + effect + message**, not by overcrowding the glyph.

---

## 6. Storage and versioning

| Layer | Location (current / target) |
| --- | --- |
| Canonical allowlist | `backend/glyph_registry.py` → `hail_glyph_allowlist()` |
| Contract allowlist | `config/hails/hail-render-contract.v001.json` |
| Axiom UI assets | `frontend/src/hailMedallions.tsx` (inline SVG v001) |
| Android assets | `control-alt-lcard/hail-overlay-poc/.../drawable/glyph_*.xml` |
| LCARD pad | `control-alt-lcard/app/js/hail-glyphs.js` |
| Future shared pack | `config/hails/glyphs/` or `ctrl-alt-standards` asset bundle |

**Versioning:** bump glyph `version` in registry when geometry changes; do not reuse glyph ID for a different shape (deprecate old ID instead).

---

## 7. Generation / promotion process

```text
1. Propose glyph ID + sketch (inventory row, quality target)
2. Author SVG on 48×48 grid (monochrome, palette-aware)
3. Review against this standard (TV distance, tone, prohibited styles)
4. Add to glyph registry (`config/hails/glyph-registry.v001.json`) + contract allowlist sync
5. Port to Android vector + LCARD pad + web preview (geometry parity)
6. Assign to Hail record icon.value
7. Validate render-payload glyph_id + broker proof path unchanged
8. Operator visual proof on Arcade (prototype signal until confirmed)
9. Mark inventory status: canonical
```

**Do not** add glyph IDs to allowlists without corresponding assets on all delivery surfaces (Axiom preview, Android overlay minimum).

---

## 8. Review checklist

- [ ] Distinct from existing glyph IDs at thumbnail size
- [ ] Readable on dark overlay background without palette tint
- [ ] Readable with `axiom_dark_cyan` / beam white tint
- [ ] No emoji dependency in primary path
- [ ] Broker proof pipeline unchanged (`glyph_id` in canonical proof string)
- [ ] Inventory row updated with quality rating and recommendation

---

## 9. Initial generation candidates (from inventory)

| Priority | Hail | Proposed glyph ID | Rationale |
| --- | --- | --- | --- |
| P1 | `hail.spoon_transporter.001` | `custom-spoon-transporter` | Upgraded — slot hero + spoon transporter variation |
| P1 | `hail.platform_test.001` | `custom-platform-test` | Platform smoke — programmatic slot hero |
| P1 | `hail.away_team.001` | `custom-away-team` | Away Team device proof — large + spoon variation |
| P2 | registry `default` | delivery-only | Fallback for unknown ids — not operator compose target |

**This pass does not generate assets** — inventory and standard only.

Staged candidate references for workbench review live under `staged/glyphs/` per **`docs/hails/glyph-asset-staging-v001.md`** — preview-only until a future promotion slice updates production `asset_refs`.

---

## 10. Non-goals (v001)

- No bulk glyph library generation
- No LCARD-side glyph authoring
- No Android renderer redesign
- No standards repo promotion without Mara/operator approval
