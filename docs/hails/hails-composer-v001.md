# Hails Composer v001

First **Hails Composer** product surface in Axiom: inline Hail authoring with Glyph selection or **Create Glyph**, plus local **Paintbox Preview**.

## Scope

| In scope | Out of scope |
| --- | --- |
| Create New Hail composer path on Hails Management | Import workflow |
| Select existing registry/custom Glyph | Candidate/approval UX |
| Inline Glyph Creator + Paintbox preview | Image generation tool calls |
| Deterministic seeded glyph specs | Production registry JSON mutation |
| Settings-backed `custom_glyphs` | Android drawables, LCARD, device/runtime contact |
| Local preview updates | Deployment, visual proof on displays |

## Modules

| Artifact | Path |
| --- | --- |
| Composer backend | `backend/hails_composer.py` |
| Custom glyph storage | `axiom-settings.json` → `custom_glyphs` |
| Composer dialog | `frontend/src/components/HailsComposerDialog.tsx` |
| Paintbox preview | `frontend/src/components/HailPaintboxPreview.tsx` |
| Glyph creator panel | `frontend/src/components/HailGlyphCreatorPanel.tsx` |

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/hails/composer/seed-glyph` | Deterministic glyph spec from names + optional seed |
| `POST` | `/api/hails/composer/register-glyph` | Persist custom glyph to settings |
| `GET` | `/api/hails` | Includes merged `glyph_catalog` and `custom_glyphs` |

Existing `POST /api/hails` accepts custom glyph ids once registered.

## Product language

Use: **Hails Composer**, **Create Glyph**, **Use Glyph**, **Regenerate**, **Customize**, **Paintbox Preview**.

Do not expose: candidate slot, approval, staging shelf, promotion pipeline.

## Follow-up

1. **Edit existing Hails** — see [Hails Composer v002](./hails-composer-v002-edit-existing.md) (Composer edit mode).
2. Richer Glyph Creator presets
3. Promote custom glyphs to registry cleanly
4. External generation integration (explicit operator action)
5. Production asset parity and runtime visual proof when approved
