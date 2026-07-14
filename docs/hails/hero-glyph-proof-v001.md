# Hero Glyph proof v001 — chunky round guardian

**Status:** **CI fixture + reference representation** — one L3+L2 example (`mascot-character`), not fleet default until **C-C** (`doctrine-hail-glyph-hero-style`) exits.  
**Essence canon:** `doctrine-hail-glyph-essence`  
**Style canon:** `doctrine-hail-glyph-hero-style` — Characters kind / proto mood  
**Not:** a fleet template, test hail gospel, or slot expansion.

---

## Lead phrase (L3 character gate)

**Chunky round guardian** — one mascot subject at thumbnail/TV distance.

| Check | Pass criterion |
| --- | --- |
| Phrase | Nameable without assembly language (“shield with…”, “circle and…”) |
| Cast | Would cast as lead in a six-second TV beat |
| Integrated | Body + face + chest sigil = one subject |
| Original | Authored fleet character, not registry echo |

**Character type:** `mascot-character`

---

## Implementation

| Field | Value |
| --- | --- |
| `generator_id` | `char_chunky_guardian_v1` |
| `glyph_id` (fixture) | `custom-hero-glyph-proof` |
| Module | `backend/hail_glyph_character.py` |
| Composition schema | `char_v1` |

Forge / composer seed:

```json
{
  "glyph_name": "Guardian",
  "glyph_family_id": "char_chunky_guardian_v1",
  "seed": 424242,
  "variation_only": true
}
```

---

## Verification

```bash
python3 -m pytest backend/tests/test_hail_glyph_character_proof.py -q
npm run verify:hails-glyph-hero-proof-v001
```

Package path: enriched payload hero gate on proof hail fixture (`hails_hero_glyph_proof.py`).

---

## What this proves

1. **Character can be authored** as a whole silhouette (not slot ⊗ charge).
2. **Existing pipeline carries it** — castable lead, envelope, TV projection, composer register.
3. **L3 intent has a concrete reference** for future generator work.

---

## Non-goals

- Default Forge seed distribution — **Kind-routed** (`char_*` / `place_*` / `person_*`) per `glyph-forge-seed-policy-v001.md`; `slot_*` grammar-lab only
- Fleet migration or upsert of operator catalog rows
- Perceptual similarity / six-up UI
- **Operator “example populated”** via `scripts/upsert-hero-glyph-proof.py` alone — use Forge golden path per `imprint-hail-glyph-hero-compliance`
