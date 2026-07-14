# Forge glyph seed policy v001

**Status:** Implementation mirror — operator seeds are deterministic (no roulette).  
**Canon:** `doctrine-hail-glyph-hero-style` → `docs/praxis/hail-glyph-hero-style-px001.md`

## Operator path (Forge + composer)

| Action | Behavior |
| --- | --- |
| **Name → first seed** | Keyword → shaped family; else **`char_combadge_delta_v1`** default |
| **Re-encode** | Locks `glyph_family_id`; `variation_only` pose jitter only |

**No kind roulette. No `slot_*` or `icon_*` on operator path** unless `glyph_family_id` is explicit (grammar lab / saved glyphs).

## Keyword → family

| Signal | Family |
| --- | --- |
| combadge / trek / starfleet / … | `char_combadge_delta_v1` |
| place keywords (ohio, state, …) | `place_state_outline_v1` |
| person keywords (mom, dad, …) | `person_mask_v1` |
| (default) | `char_combadge_delta_v1` |

## Regenerate / grammar lab

Explicit `glyph_family_id` on seed (saved glyph, scripts, grammar-lab) may target `slot_*`, `compose_*`, or `char_chunky_guardian_v1` (CI fixture).

## Module map

- `backend/hail_glyph_operator_seed.py` — operator family resolution
- `backend/hail_glyph_kind.py` — keyword tables (internal)
- `backend/hail_glyph_procedural.py` — graph generation
