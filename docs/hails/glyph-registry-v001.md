# Glyph Registry v001

**Authority:** The glyph registry **stores** glyph identity metadata that Axiom places in the fleet. It does **not** dictate which glyphs exist — Axiom CRUD does. See `docs/hails/hails-authority-v001.md`.

Axiom-owned **storage and projection layer** for Hail glyph identity, metadata, validation, and future generation/review workflow.

## Canonical artifact

`config/hails/glyph-registry.v001.json`

Loader: `backend/glyph_registry.py`

## Schema (v001)

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `version` | string | yes | Registry version (`v001`) |
| `ownership` | string | yes | Must be `axiom` |
| `selectableStatuses` | string[] | no | Default `["approved", "draft"]` — glyphs with these statuses appear in Hail allowlist |
| `glyphs` | object[] | yes | Registry entries |

### Glyph entry

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `glyph_id` | string | yes | kebab-case id (e.g. `default`) |
| `label` | string | yes | Operator-facing short name |
| `semantic_intent` | string | yes | One-line meaning |
| `description` | string | yes | Catalog description |
| `status` | enum | yes | `approved`, `draft`, `deprecated`, `future` |
| `category` | string | yes | e.g. `hail`, `placeholder`, `system` |
| `fallback_emoji` | string | no | Contract-aligned emoji fallback |
| `fallback_text` | string | no | Text fallback label |
| `surfaces` | object | yes | `{ axiom_ui, lcard_preview, android_drawable }` booleans |
| `asset_refs` | object | no | **References only** — paths to existing assets; no new art in registry v001 |
| `generation_prompt` | string | no | Seed prompt for future generation workbench |
| `visual_constraints` | object | no | Monochrome, silhouette, TV-distance guidance |
| `review_notes` | string | no | Operator/engineering notes |

## Allowlist derivation

**Target (authority v001):** `known_glyphs` and selector catalogs list only glyphs Axiom owns (settings + registry rows written by Axiom CRUD). Empty Axiom library → empty allowlist.

**Current implementation (migrating):** bundled registry JSON still seeds the allowlist; custom glyphs are merged from settings. Do not extend this pattern — align new work with `docs/hails/hails-authority-v001.md`.

```python
from glyph_registry import hail_glyph_allowlist

KNOWN_GLYPH_IDS = hail_glyph_allowlist()  # approved + draft glyphs (bundled seed — see authority doc)
```

`backend/hails_domain.py` validates `icon.value` against this allowlist.  
`config/hails/hail-render-contract.v001.json` `glyphs.allowlist` must stay aligned (tested).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/hails/glyph-registry` | Full registry + validation status |
| `GET` | `/api/hails` | Includes `glyph_catalog` (selector metadata) and `glyph_registry` summary |

## Current entries

See `config/hails/glyph-registry.v001.json`:

| glyph_id | label | status | category |
| --- | --- | --- | --- |
| `default` | Spoon | approved | hail |
| `default` | default glyph | draft | hail |
| `default` | Default | approved | placeholder |

## Future generation/review workflow

1. **Propose** — add registry entry with `status: future`, generation_prompt + visual_constraints; no allowlist inclusion.
2. **Prepare brief** — Glyph Generation Workbench v001 (`docs/hails/glyph-generation-workbench-v001.md`) seeds brief from registry.
3. **Stage candidate** — Glyph Asset Staging v001 (`docs/hails/glyph-asset-staging-v001.md`) attaches preview-only `asset_ref` under `staged/glyphs/`; accept/reject is local to the workbench.
4. **Generate** (future slice) — external generation may populate staged paths; Axiom does not generate images in v001.
5. **Review** — operator updates `review_notes`, promotes `draft` → `approved` or marks `deprecated`.
6. **Promote** — on `approved`, glyph enters `selectableStatuses` allowlist; contract allowlist sync required.
7. **Surface parity** (future) — asset_refs updated when Android/LCARD assets exist; no automatic drawable changes from registry alone.

Registry v001 is **definition only** — no image generation, no asset production, no runtime delivery changes.

## Related

- **`docs/hails/hails-authority-v001.md`** — canonical authority (Axiom CRUD, registry storage, consumers)
- `docs/hails/glyph-inventory-v001.md` — per-hail glyph usage
- `docs/hails/glyph-generation-workbench-v001.md` — workbench briefs
- `docs/hails/glyph-asset-staging-v001.md` — staged candidate refs
- Issue #93
