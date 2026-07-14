# Hails Composer v002 — Edit Existing Hails

Extends **Hails Composer** from create-only (v001) into the primary **create and edit** authoring surface for Hails on Hails Management.

## Product flow

1. **Create New Hail** opens Composer in create mode (`POST /api/hails`).
2. **Edit Hail** (workspace tab) opens the same Composer in edit mode (`PUT /api/hails/{id}`).
3. Edit mode loads the selected Hail: name, display message, Glyph, visual contract fields, source/destination rooms, enabled state, category, display id.
4. User may **Select Glyph** (registry + settings-backed custom Glyphs) or **Create Glyph** inline.
5. **Paintbox Preview** updates locally as fields change.
6. **Save Hail** or **Use Glyph & Save Hail** persists through `PUT /api/hails/{id}` with a patch body that preserves advanced fields (multi-route, behavior, badge policy) not owned by Composer.

Edit saves omit `delivery_policy` unless the operator changed source/destination rooms in Composer; when changed, only the loaded primary route is updated — other routes are preserved.

Visual Contract and route tabs in the workspace remain available for advanced editing; Composer is the primary Edit Hail path.

**Hail Effects Gallery** (v001) adds named Effect Presets inside Composer — see [Hail Effects Gallery v001](./hail-effects-gallery-v001.md).

## Modules

| Artifact | Path |
| --- | --- |
| Composer dialog (create + edit) | `frontend/src/components/HailsComposerDialog.tsx` |
| Visual customize block | `frontend/src/components/ComposerVisualCustomize.tsx` |
| Composer state helpers | `frontend/src/hailGlyphComposer.ts` → `composerStateFromHail`, `hailBodyFromComposer` |
| Hails Management wiring | `frontend/src/views/HailsView.tsx` |

## Modes

| Mode | Title | Primary action |
| --- | --- | --- |
| Create | Hails Composer — Create New Hail | Create Hail / Use Glyph & Create Hail |
| Edit | Hails Composer — Edit Hail | Save Hail / Use Glyph & Save Hail |

Dialog exposes `data-hails-composer-mode="create"|"edit"`.

## API (unchanged from v001)

| Method | Path | Purpose |
| --- | --- | --- |
| `PUT` | `/api/hails/{hail_id}` | Update existing Hail (edit save) |
| `POST` | `/api/hails/composer/seed-glyph` | Deterministic glyph spec |
| `POST` | `/api/hails/composer/register-glyph` | Persist custom glyph |
| `GET` | `/api/hails` | Merged glyph catalog + `custom_glyphs` |
| `POST` | `/api/hails/derive-preview` | Effective glyph allowlist validation |

## Removed UX

The legacy **Edit Hail** modal (name/message/glyph/enabled only) is removed. Editing uses Composer exclusively.

## Boundaries (v002)

Same as v001: no import workflow, candidate/approval UX, image generation calls, Android/LCARD/device contact, or deployment in this slice.

## See also

- [Hails Composer v001](./hails-composer-v001.md)
