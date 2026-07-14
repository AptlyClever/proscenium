# Hails Composer polish v001

Frontend-only polish for the Hails Composer authoring surface (issue #109).

## Goal

Make Composer read as a coherent five-step authoring flow instead of a collection of capable controls:

1. **Hail content** — name, message, source/destination rooms
2. **Glyph identity** — Built-in Glyphs, My Glyphs, or Create Glyph
3. **Effect presentation** — Hail Effects presets plus Customize (advanced)
4. **Paintbox Preview** — local preview with friendly summaries
5. **Save** — Save Hail (or Save Hail with new Glyph when creating)

## Presentation labels

Canonical IDs in storage/API are unchanged. UI maps IDs to friendly names via `frontend/src/hailComposerLabels.ts`:

| ID | Display |
|----|---------|
| `axiom_dark_cyan` | Axiom Cyan |
| `cute_purple` | Soft Purple |
| `upper_center` | Upper Center |
| `duration_ms` | Display time |
| `scale` | Size |

Preview summaries use `frontend/src/composerPreviewSummary.ts` for Glyph name, archived/pending status, and presentation notes.

## Components

| File | Role |
|------|------|
| `ComposerSection.tsx` | Step heading, helper text, card wrapper |
| `ComposerSaveErrors.tsx` | Validation error banner on save |
| `HailsComposerDialog.tsx` | Guided flow layout |
| `HailPaintboxPreview.tsx` | Glyph + presentation summary panel |
| `ComposerVisualCustomize.tsx` | Collapsible Customize (advanced) |
| `HailEffectsGallery.tsx` | Apply Effect + no-preset empty state |

## Verification

```bash
cd frontend && npm run build
cd frontend && npm run verify:hails-page-template
```

Includes `scripts/verify-hails-composer-polish.mjs`.

## Out of scope

- Backend/domain model changes
- Runtime/device validation
- LCARD/Android integration
- Import/upload or production asset pipeline
