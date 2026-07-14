# Hail hero-centric effect field v001 — contract sketch

**Status:** Draft — **E1 not implemented**; authoritative for new layout work.  
**Praxis:** `imprint-hail-hero-centric-effect-field`  
**Supersedes (partial):** beam sizing prose in `effects-enhancement-v001.md` that ties envelope height only to glyph-focus fraction.

---

## 1. Purpose

Define how **Effects Sidekick** footprint is computed, frozen, and consumed so that:

1. VFX scale to **Glyph Hero + Hail moment** (not a glyph-focus-sized box).
2. VFX may **overflow drawn glyph art** (bounded overflow).
3. VFX never exceed **`safe_zone`** (hard clip).
4. Geometry is **per hail**, frozen at Save in `layout_regions`.

---

## 2. Region hierarchy

```text
paint_box (Grid on TV)
  └── safe_zone          ← hard clip for all Effects Sidekick drawing
        ├── effect_field ← Effects Sidekick footprint (NEW canonical)
        │     └── may extend beyond glyph_art / glyph_focus
        ├── glyph_focus  ← anchor + legibility region (v1); art bounds (v1.1 → glyph_art)
        └── message_band ← Message Sidekick stable phase
```

**Containment rules (normative):**

```text
glyph_art ⊆ effect_field ⊆ safe_zone ⊆ paint_box     (when glyph_art present)
glyph_focus.center ≈ effect_field.center ≈ glyph optical center (± tolerance)
```

---

## 3. New package fields

### 3.1 `visual.effect_footprint_profile` (compose input)

| Value | Meaning |
| --- | --- |
| `compact` | Minimal breakout; tight column / aura |
| `standard` | Default |
| `dramatic` | Uses most of safe zone; visible art overflow |

Default: `standard`. Resolved at Save; stored on consumer payload for audit.

### 3.2 `effect_tuning.footprint_scale` (optional)

| Field | Type | Range | Notes |
| --- | --- | --- | --- |
| `footprint_scale` | number | 0.85 – 1.25 | Multiplier on profile fractions; omitted = 1.0 |

Not exposed as a live TV control.

---

## 4. `layout_regions.effect_field` (frozen output)

Paint-box-local pixels (same coordinate space as existing `layout_regions`).

### 4.1 Shape

```json
{
  "effect_field": {
    "left": 120.5,
    "top": 24.0,
    "width": 280.0,
    "height": 320.0,
    "center_x": 260.5,
    "center_y": 184.0,
    "shape": "column",
    "anchor": "glyph_optical_center"
  },
  "effect_field_fraction": {
    "width_of_safe_zone": 0.58,
    "height_of_safe_zone": 0.92
  },
  "effect_footprint_profile": "standard",
  "glyph_optical_center": {
    "x": 260.5,
    "y": 184.0
  }
}
```

| Field | Required | Description |
| --- | --- | --- |
| `left`, `top`, `width`, `height` | yes | Axis-aligned footprint in paint-box space |
| `center_x`, `center_y` | yes | Effects Sidekick anchor (beam column, storm origin) |
| `shape` | yes | `column` \| `radial` \| `rect` — renderer hint per `effect_id` |
| `anchor` | yes | Always `glyph_optical_center` in v1 |
| `effect_field_fraction` | yes | Audit trail: fraction of safe zone used |
| `effect_footprint_profile` | yes | Resolved profile at Save |
| `glyph_optical_center` | yes | Explicit anchor; may differ from glyph_focus top-left box |

### 4.2 `layout_regions.glyph_art` (v1.1 — card trick)

Optional rect for **drawn ink** smaller than `effect_field`:

```json
{
  "glyph_art": {
    "left": 198.0,
    "top": 140.0,
    "width": 125.0,
    "height": 88.0,
    "center_x": 260.5,
    "center_y": 184.0
  }
}
```

When absent, consumers use `glyph_focus` as art bounds (v1 behavior).

---

## 5. Sizing algorithm (sketch)

Inputs: `paint_box` size, tier meta, `size_tier`, `effect_id`, `effect_variation_id`, `effect_footprint_profile`, optional `footprint_scale`, `glyph_visual_size_px`.

```text
safe_zone = inset(paint_box, safeZoneInsetFraction)

glyph_visual_size_px = max(glyphVisualSizeFloorPx, paint_box.height × glyphVisualFraction)

glyph_optical_center = (
  safe_zone.left + safe_zone.width / 2,
  safe_zone.top + safe_zone.height / 2   // E1: vertically center in safe zone for delivery
)

(profile_w, profile_h) = FOOTPRINT_TABLE[effect_id][effect_footprint_profile]
  // e.g. transporter standard: (0.42, 0.90) of safe_zone

effect_field.width  = safe_zone.width  × profile_w × footprint_scale
effect_field.height = safe_zone.height × profile_h × footprint_scale

// Optional: floor tied to hero size (storm, aura)
effect_field.width  = max(effect_field.width,  glyph_visual_size_px × 1.1)
effect_field.height = max(effect_field.height, glyph_visual_size_px × 1.4)

center effect_field on glyph_optical_center
clamp effect_field inside safe_zone
```

### 5.1 Transporter `FOOTPRINT_TABLE` (initial)

Fractions of **safe zone** (not glyph_focus). **Revision 2 (2026-06-18):** standard/compact recalibrated for glyph-first default read; profile-aware glyph floors — see imprint `imprint-hail-hero-centric-effect-field` § Revision 2.

| Profile | width | height | shape |
| --- | --- | --- | --- |
| `compact` | 0.30 | 0.70 | `column` |
| `standard` | 0.36 | 0.80 | `column` |
| `dramatic` | 0.52 | 0.94 | `column` |

| Profile | glyph floor width | glyph floor height |
| --- | --- | --- |
| `compact` | 1.04 × `glyph_visual_size_px` | 1.20 × |
| `standard` | 1.08 × | 1.30 × |
| `dramatic` | 1.12 × | 1.40 × |

Variation profiles (`voyaging`, `spoon`, `generation-next`) apply **inside** `effect_field` (beam width multipliers, particle density) — they do not shrink the field to glyph_focus size.

### 5.2 Storm (future `effect_id`)

| Profile | shape | notes |
| --- | --- | --- |
| `standard` | `radial` | radius ≈ `1.5 × glyph_visual_size_px`, clamped to safe zone |

---

## 6. Consumer rules

| Consumer | Rule |
| --- | --- |
| **Axiom preview** | Effect canvas sized to `effect_field` rect; `overflow: visible` on glyph layer; package clips at `safe_zone` |
| **APK** | Draw transporter/VFX in `effect_field`; **clip at `safe_zone`** only |
| **LCARD harness** | Same as APK; no re-derive from glyph_focus |
| **Save gate** | Reject if `effect_field` escapes `safe_zone` |

### 6.1 Legacy alias

For transporter during migration:

```text
transporter_beam_envelope := effect_field   // same rect; deprecate separate math
```

Golden fixture `hail-package-v2-parity-golden.json` updates in **E1** when algorithm ships.

---

## 7. Example (medium tier @ 1920×1080, standard profile, rev 2)

Using golden paint box **614.4 × 367.2** px:

| Region | Approx size | Notes |
| --- | --- | --- |
| `safe_zone` | 479 × 286 px | inset 11% |
| `glyph_focus` (today) | 192 × 183 px | art/anchor box |
| `effect_field` (rev 2 standard) | **208 × 250 px** | 0.36 × 0.80 of safe zone + glyph floors; ~1.08× glyph width |
| `effect_field` (dramatic) | **249 × 270 px** | showcase profile only |
| `transporter_beam_envelope` (pre-E1) | **119 × 275 px** | narrow width → horizontal clip (retired math) |

Rev 2 standard keeps **Hearthstone breakout** (field exceeds glyph box) without defaulting to dramatic-scale columns.

---

## 8. Verification (E1+)

```bash
# After implementation
cd frontend && node scripts/verify-hails-effect-field-layout-v001.mjs
python3 -m pytest backend/tests/test_hail_paintbox_layout.py -q
```

Acceptance:

- `effect_field` ⊆ `safe_zone` for all tiers and profiles
- `effect_field.width` ≥ `glyph_focus.width` for `standard` and `dramatic` transporter
- Forge TV size ≡ Hails compose ≡ Arcade stable frame for field rect (±2 px harness tolerance)

---

## 9. Related

| Doc | Role |
| --- | --- |
| `hail-cohesion-kits-px001.md` | Grid vocabulary |
| `glyph-hero-intent-v001.md` | Hero doctrine |
| `glyph-envelope-v001.md` | Art vs occupancy mask |
| `size-tier-semantics-v001.md` | S/M/L Grid fractions |
| `effects-enhancement-v001.md` | Effect hierarchy (update beam height prose when E1 lands) |
