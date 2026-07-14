# Custom Glyph Library v001

First **My Glyphs** experience in **Hails Composer** — reusable settings-backed Custom Glyphs with rename and archive, without a promotion pipeline or production registry workflow.

## Product layers

| Layer | Question |
| --- | --- |
| Hail | What am I saying? |
| Glyph | What face/emblem does this Hail use? |
| Effect | How does it present itself? |
| Preview | Does this feel right? |

This slice owns **Glyph reuse**.

## Design intent

Per **`glyph-composition-direction-v001.md`** and **`glyph-hero-intent-v001.md`**: a **Glyph is the main character of a Hail** — a composed **hero mark** (integrated silhouette) in the Grid. New Forge seeds use **H3.5** `slot_*` families; legacy registry marks are not models for new customs.

Custom Glyphs in **Glyph Forge** are **parametric preview marks** — not production registry assets. Each mark belongs to a **glyph family** (`glyph_family_id` / `procedural_graph.generator_id`). **Regenerate** varies geometry inside that family; **Reset** may pick a new family. Semantic keywords from the glyph name bias **initial** family selection. See **`glyph-family-variation-v001.md`**.

**My Glyphs** stores the generated `procedural_graph` until you save a hail loadout with that mark. **Built-in registry glyphs** (`hail-beacon`, `hail-route`, `default`, …) remain hand-authored SVG promoted through the generation standard's pipeline — distinct from Forge **composed** `custom-*` marks.

Forge output must still obey `glyph-generation-standard-v001.md` constraints (48×48 grid, ≤3 primary paths, TV-readable silhouettes). Promotion from Forge preview → registry asset is a separate workbench/registry step (see Boundaries).

## Composer UX

Glyph selection is organized into:

- **Built-in Glyphs** — registry glyphs from the merged allowlist (non-`custom-*` ids)
- **My Glyphs** — settings-backed Custom Glyphs created through Composer

Empty state: *Create a Glyph to save it here.*

Each Custom Glyph card shows label, procedural mark preview, style summary, optional updated date, **Use Glyph**, **Rename Glyph**, and **Archive Glyph**. Archived glyphs show **Restore Glyph**. A Hail already using an archived Custom Glyph still displays it (with an **Archived** label).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/hails/composer/register-glyph` | Create/update Custom Glyph (stable id) |
| `PATCH` | `/api/hails/composer/custom-glyphs/{glyph_id}` | Rename (`label`) or archive (`archived`) |
| `GET` | `/api/hails` | Includes full `custom_glyphs` specs |

Rename changes **label only** — `glyph_id` stays stable. Archive hides from default My Glyphs list but remains on the effective allowlist for existing Hails and derive-preview.

## Storage metadata (optional)

Custom glyph specs may include:

- `label`
- `archived` (boolean)
- `created_at` / `updated_at` (ISO timestamps on register/patch)

## Modules

| Artifact | Path |
| --- | --- |
| Backend helpers | `backend/hails_composer.py`, `backend/hail_glyph_procedural.py` |
| Library UI | `frontend/src/components/GlyphLibrarySection.tsx` |
| Frontend helpers | `frontend/src/hailGlyphLibrary.ts` |

## Boundaries

No production registry promotion, approval/candidate UX, image generation, import flow, Android/LCARD/runtime contact, deployment, or visual proof.

## See also

- [Hails Composer v001](./hails-composer-v001.md)
- [Hail Effects Gallery v001](./hail-effects-gallery-v001.md)
- [Hail glyph generation standard v001](./glyph-generation-standard-v001.md)
- [Glyph family and variation v001](./glyph-family-variation-v001.md)
- [Glyph composition direction v001](./glyph-composition-direction-v001.md) — **locked** generation target
- [Glyph hero intent v001](./glyph-hero-intent-v001.md)
