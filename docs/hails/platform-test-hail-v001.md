# Platform Test Hail v001

**Status:** Active smoke fixture  
**Praxis protocol:** `protocol-platform-test-hail-upsert`  
**Reserved id:** `hail.platform_test.001`

## Purpose

A **living Test hail** for agents and homelab smoke: every upsert replaces the record body with the **current** platform defaults and re-stamps `hail_package` (`catalog_ready`, layout, presentation). Operator hails (e.g. Star Trek) are not refreshed this way.

## Praxis alignment (verified 2026-06-18)

| Source | Constraint |
| --- | --- |
| `doctrine-hail-platform-naming` | Happy-send requires current `package_schema_version` + `catalog_ready` |
| `pso-20260618-axiom-glyph-hero-upgrade-or-remove` | Platform smoke uses procedural hero, not `default` |
| `protocol-arcade-hail-overlay-live-deploy` | Default `--send` target is **Arcade** only |
| `protocol-away-team-hail-overlay-deploy` | Travel stick smoke via `delivery_target_id: away_team` |
| `doctrine-google-tv-fleet-registry` | Overlay URLs synced from `google-tv-fleet.v001.yaml` |
| `collective-beta-versioning` | No silent migrate — upsert is explicit re-Save with fresh body |
| `animation-language-v001` | Same-area `arcade → arcade` uses destination-relative overlay placement |

## Builder

`backend/hails_platform_test.py` — `build_platform_test_hail_body()`:

- Glyph: **`custom-platform-test`** — deterministic `slot_lozenge_bolt` via `build_platform_test_glyph_spec()` (registered before upsert)
- Effect: transporter / voyaging (domain `_DEFAULT_VISUAL`)
- Message sidekick: contract default
- Priority: `green`
- Route: `route.arcade.arcade.001` (same-area)
- Route: `route.arcade.away_team.001` (travel smoke)
- Message includes UTC rebuild timestamp

## CLI

```bash
python3 scripts/upsert-platform-test-hail.py
python3 scripts/upsert-platform-test-hail.py --send --room arcade

# Away Team (after fleet sync + deploy)
curl -sS -X POST 'http://192.168.68.93:7895/api/hails/hail.platform_test.001/send' \
  -H 'Content-Type: application/json' \
  -d '{"delivery_target_id":"away_team"}'
```

Default Axiom base: `http://192.168.68.93:7895`

## Tests

`backend/tests/test_hails_platform_test.py`
