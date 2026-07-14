# Glyph Generation Workbench v001

Metadata/workflow foundation for preparing glyph generation briefs and tracking candidate slots. Consumes **Glyph Registry v001** — does not duplicate registry identity fields.

## Canonical artifacts

| Artifact | Path |
| --- | --- |
| Workbench seed | `config/hails/glyph-generation-workbench.v001.json` |
| Registry source | `config/hails/glyph-registry.v001.json` |
| Loader | `backend/glyph_generation_workbench.py` |

## Runtime persistence

Operator edits persist to `glyph_generation_workbench.briefs` on `axiom-settings.json`. When empty, briefs fall back to the committed seed file.

## Brief model

| Field | Purpose |
| --- | --- |
| `brief_id` | Stable brief identifier |
| `glyph_id` | Registry glyph reference (required) |
| `status` | Workflow state (see below) |
| `generation_prompt` / `negative_prompt` | Seeded from registry; editable |
| `visual_constraints` | Copied from registry at create time |
| `target_surfaces` | Surfaces in scope (`axiom_ui`, `lcard_preview`, `android_drawable`) |
| `candidate_slots` | Metadata-only candidate tracking |
| `review_notes` | Operator review trail |

### Brief statuses

`draft`, `ready_for_generation`, `generated`, `reviewed`, `rejected`, `promoted`, `archived`

### Candidate statuses

**Canonical (staging v001):** `empty`, `staged`, `accepted`, `rejected`

**Legacy (compat):** `generated`, `reviewed`, `promoted`

Staged candidates may hold a relative `asset_ref` under `staged/glyphs/` with `asset_kind` and `source`. See **`docs/hails/glyph-asset-staging-v001.md`**.

**v001 staging rule:** `asset_ref` must be relative, under `staged/glyphs/`, and preview-only — not production registry assets.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/hails/glyph-generation-workbench` | List briefs + registry source + safety notice |
| `POST` | `/api/hails/glyph-generation-workbench/briefs` | Create brief (seeds from registry) |
| `PUT` | `/api/hails/glyph-generation-workbench/briefs/{brief_id}` | Update brief metadata |
| `POST` | `/api/hails/glyph-generation-workbench/briefs/{brief_id}/archive` | Archive brief |
| `PUT` | `/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}` | Stage/update candidate |
| `POST` | `.../candidates/{candidate_id}/clear` | Clear candidate slot |
| `POST` | `.../candidates/{candidate_id}/accept` | Accept candidate (local only) |
| `POST` | `.../candidates/{candidate_id}/reject` | Reject candidate (local only) |

No endpoints named `generate`, `render`, or `invoke`.

## UI

Route: `#/axiom/hails/glyph-workbench` (`GlyphGenerationWorkbenchView`)

- Safety banner (no image generation)
- Glyph picker from registry
- Brief editor + candidate slot tracker
- Read-only registry source panel

## Initial seed

Committed brief: `brief-default-v001` for `default`, seeded from registry prompt/constraints/surfaces.

## Future workflow (enabled by v001, not implemented here)

1. Operator prepares brief → `ready_for_generation`
2. **Future generation slice** produces candidate art (external to Axiom v001)
3. Candidate slots move `empty` → `staged` → `accepted`/`rejected` (metadata + staged `asset_ref` — see staging v001)
4. Promote glyph in registry + surface assets in dedicated repos (later slice)

## Boundaries

No image generation. No SVG/PNG production. No Android/LCARD changes. No deployment or device contact.

## Related

- Issue #95
- `docs/hails/glyph-registry-v001.md`
- `docs/hails/glyph-asset-staging-v001.md`
- `docs/hails/glyph-generation-standard-v001.md`
