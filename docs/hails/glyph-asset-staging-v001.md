# Glyph Asset Staging v001

Lightweight staged asset references for **Glyph Generation Workbench** candidate slots. This is a practical staging shelf — not a permanent approval bureaucracy.

## Scope

| In scope | Out of scope |
| --- | --- |
| Staged `asset_ref` metadata on candidate slots | Image generation or file creation |
| Validation of relative paths under `staged/glyphs/` | Production glyph asset replacement |
| Accept/reject/clear local candidate state | Registry status or production `asset_ref` mutation |
| Candidate-specific API helpers | Android drawables, LCARD, display/runtime validation |

## Canonical module

`backend/glyph_asset_staging.py` — validation and slot normalization.

Workbench integration: `backend/glyph_generation_workbench.py` (`update_workbench_candidate`, `clear_workbench_candidate`, etc.).

## Candidate statuses

**Canonical (v001 staging):**

- `empty` — no staged asset
- `staged` — preview-only asset reference attached
- `accepted` — operator accepted locally (does not promote to production)
- `rejected` — operator rejected locally

**Legacy (Workbench v001 compat):** `generated`, `reviewed`, `promoted` — still accepted by validation but not expanded in UI ceremony.

## Staging fields

| Field | Purpose |
| --- | --- |
| `asset_ref` | Relative path under `staged/glyphs/` (required when staged/accepted/rejected) |
| `asset_kind` | `svg`, `png`, or `webp` |
| `source` | `manual_import`, `external_generation`, or `unknown` |
| `created_at` | ISO date when staging metadata was set |
| `notes` | Operator notes |
| `preview_only` | Always `true` in v001 — staged refs are not production |

## Validation rules

1. `asset_ref` may be non-empty only when status is `staged`, `accepted`, `rejected`, or legacy asset-bearing statuses.
2. `asset_ref` must be relative — absolute paths and URLs are rejected.
3. `asset_ref` must start with `staged/glyphs/`.
4. `asset_kind` and `source` must match allowed enumerations when an asset ref is present.
5. `clear` resets the slot to `empty` with `asset_ref` null and staging metadata removed.
6. **Accept/reject** update candidate slot state only — they do **not** mutate glyph registry entries or production asset paths.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `PUT` | `/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}` | Stage or update candidate metadata |
| `POST` | `.../candidates/{candidate_id}/clear` | Reset candidate to empty |
| `POST` | `.../candidates/{candidate_id}/accept` | Mark accepted (local only) |
| `POST` | `.../candidates/{candidate_id}/reject` | Mark rejected (local only) |

No `generate`, `render`, or `invoke` endpoints.

## UI

`GlyphGenerationWorkbenchView` shows staged refs, asset kind, source, notes, and clear/accept/reject actions. Safety messaging states that staged assets are preview-only and promotion to production is a later slice.

## Follow-up slices

- Production promotion from accepted candidates
- Staged file upload/import pipeline (still no in-Axiom generation required)
- Rollback/history where useful
- Retire legacy candidate statuses once operators migrate
