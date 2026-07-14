# Hails Management v2 — visual contract editor

Operator-facing slice for safe editing of Axiom-owned Hail visual contract fields with a static derived preview.

## Scope

- Hail list contract summary fields (glyph, effect, size tier, placement, duration, readiness)
- Visual contract editor tab (message, glyph, enabled, visual.* safe fields)
- Static derived preview via `POST /api/hails/derive-preview`
- Validation against glyph/effect/size/duration/placement/message semantics

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/hails/derive-preview` | Merge draft record, validate, project render payload + readiness |
| `GET` | `/api/hails` | Extended with `known_palette_ids`, `known_placement_ids` |

## Boundaries

No runtime send. No LCARD/Android/device contact. No route policy broadening.

## Related

- Issue #91
- Handoff: `ctrl-alt-handoff/apps/axiom/handoffs/20260613-hails-management-v2-visual-contract-editor-v001.md`
