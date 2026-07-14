# Hails Collective Beta 2.0 — design authority v002

**Status:** **Complete** — Collective Beta **`hails-2.0-beta`** declared 2026-06-17.  
**Terminology:** `docs/hails/NAMING.md` — product name **Hail platform**; verification suite **`hail-platform-e2e`**.  
**Praxis:** `pso-20260620-hails-collective-beta`  
**Imprint:** `hails-collective-beta-package-delivery-v002`  
**Collective version:** `hails-2.0-beta`  
**Contract generation:** `v002-beta`  
**Versioning policy:** `doctrine-collective-beta-versioning` — collective cuts vs ships; Beta 3.0 not required for post–2.0 polish on `package_schema_version: 2`

**Canonical Praxis source:** `/mnt/temp/config/praxis/objects/hails/20260620-hails-collective-beta-pso-001.md`

---

## 1. Scope

First collective **Beta** of the Hails program:

- **ctrl-alt-axiom** — Hails / Hail Forge compose, preview, Save gate, catalog, send
- **control-alt-lcard** — chip catalog + send trigger only
- **Hail overlay APK** — display consumer

Supersedes the integration-era assumption that LCARD fetches render-payload and posts to the APK.

---

## 2. Hail Package v2 (composed in Axiom)

### Required groups

| Group | Fields (indicative) |
| --- | --- |
| Identity | `hail_id`, `package_schema_version: 2`, `package_version`, `layout_contract_version`, `components_fingerprint` |
| Hero | `glyph_id`, `glyph_render` (registry or procedural — **no emoji**) |
| Sidekick | `effect_id`, `effect_variation_id`, `effect_tuning`, `android_effect_tuning`, `lifecycle_timing`, `effect_identity` |
| Shell | `size_tier`, `size_code`, `placement_id`, `placement_mode`, `palette_id`, `render_target` |
| Layout (APK) | `layout_regions` — frozen at Save from `computeHailLayoutRegions` |
| Message | `{ text, reveal_delay_ms, reveal_duration_ms \| reveal_speed_multiplier, reveal_style }` |
| Delivery cache | `delivery_envelope` (Axiom-internal; prepared on Save) |
| Proof | `consumer_manifest_id`, `catalog_ready` |

### LCARD catalog projection (not full package)

`hail_id`, `name`, `message_preview`, `chip_glyph_thumb_url` (pre-rendered at Save), `catalog_ready`, `enabled`, `catalog_revision`

**v1 hails:** must **re-Save** to gain `catalog_ready` under `package_schema_version: 2` — no silent migration.

---

## 3. Consumer Capability Manifest

**Artifact:** `config/hails/consumer-capability-manifest.v002.json`

Drives:

- Save gate (`validate_hail_package_for_consumers`)
- Forge / Hails UI (disable undeliverable options)
- APK + LCARD required capability flags

---

## 4. APIs (Beta)

**Versioning:** Same URL paths as today; `package_schema_version: 2` in request/response bodies (not `/api/v2/...`).

| Method | Path | Owner | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/hails/{id}/render-payload` | Axiom | Full package (APK / proof / internal) |
| `POST` | `/api/hails/{id}/send` | Axiom | Deliver to APK after LCARD chip tap; body includes `package_schema_version` |
| `GET` | `/api/effective/lcard` | Axiom | Catalog projection + `catalog_revision`; `chip_glyph_thumb_url` set at Save |
| `POST` | `/api/hails/{id}/send` (proxy) | LCARD | Forward tap to Axiom only |

### Send cooldown (locked)

- **Destination:** per `delivery_target_id` (APK endpoint).
- **Cooldown start:** lifecycle **cleared** (not HTTP 200 alone).
- **Duration:** 3s after cleared before next send to same destination.

---

## 5. Implementation slices

See Praxis campaign **B0–B8**. Repo entry points:

| Slice | Primary paths | Status |
| --- | --- | --- |
| B0 | `config/hails/hail-render-contract.v002-beta.json`, `backend/hails_render_contract.py`, LCARD `contract-loader.js`, APK `TransporterContract.kt` | shipped |
| B1 | `backend/hail_package_v2.py`, `backend/hail_paintbox_layout.py` | shipped |
| B2 | `config/hails/consumer-capability-manifest.v002.json`, composer validation | shipped |
| B3 | `backend/main.py` (send route), LCARD `service/lib/hail-send.js` (Axiom proxy only) | shipped |
| B4 | `backend/hail_lcard_catalog.py`, LCARD `app/js` hail rack | shipped |
| B5 | `frontend/src/hailPaintboxLayoutRegions.ts`, `HailPaintboxPreview.tsx` | **shipped** — hero-first preview **`pso-20260622-axiom-hail-hero-first-preview`** (operator sign-off 2026-06-17) |
| B6 | `verify:hails-hero-first-preview`, package + live capture scripts | **shipped** — Tier B harness + homelab Forge/Hails gates |
| B7 | `backend/hail_package_v2.py`, Hails studio stale UI | shipped |
| B8 | `backend/hails_message_sidekick.py`, Message Sidekick compose + APK stable phase | shipped |

---

## 6. Related docs (graduate to v002 on cut)

| v001 doc | v002 successor | Status |
| --- | --- | --- |
| `hails-authority-v001.md` | `hails-authority-v002.md` | **graduated** 2026-06-17 |
| `hail-authoring-surface-contract-v001.md` | `hail-authoring-surface-contract-v002.md` | **graduated** |
| `hail-authoring-package-v001.md` | `hail-authoring-package-v002.md` | **graduated** |
| `hails-render-parity-v001.md` | `hails-render-parity-v002.md` | **graduated** |
| `paintbox-parity-standards-alignment-v001.md` | `paintbox-parity-standards-alignment-v002.md` (stub → collective + package v002) | **graduated** |

New work should cite **v002** authority docs; v001 remains historical reference.

---

## 8. Beta exit — remaining (after B5/B6)

| # | Criterion | Status |
| --- | --- | --- |
| 1 | Collective `hails-2.0-beta` declared in Praxis | **declared** 2026-06-17 — `pso-20260620-hails-collective-beta` status `complete` |
| 2 | Save gate + disabled hails hidden on LCARD | shipped (B2/B4) |
| 3 | LCARD chip → Axiom send → APK (LAN E2E) | **verified** — `verify:hail-platform-e2e` LCARD smokes (2026-06-17) |
| 4 | WYSIWYG preview (Forge TV ≡ Hails compose) | **shipped** — B5/B6 + glyph Color loadout tint (`hails-render-parity-v002.md` addendum) |
| 5 | Message Sidekick stable-phase | shipped (B8) |
| 6 | Send queue + 3s cooldown | shipped (B3) |
| 7 | Fleet re-Save for `catalog_ready` v2 | **complete** — `scripts/re-save-hails-catalog-ready.py` (5 active hails, 2026-06-17) |
| 8 | v001 → v002 doc graduation | **complete** — see §6 |

## 7. Verification

See **`docs/hails/NAMING.md`** for canonical suite and lane names.

```bash
# Hail platform E2E — full umbrella (alias for collective beta verifier)
cd frontend && npm run verify:hail-platform-e2e

# Fast lane — no homelab LCARD smokes
cd frontend && npm run verify:hail-platform-e2e:fast

# Authoring / WYSIWYG parity (fast-lane subset)
cd frontend && npm run verify:hails-hero-first-preview

# APK unit tests
cd ../control-alt-lcard/hail-overlay-poc && ./gradlew :app:testDebugUnitTest
```

**Acceptance happy path:** `acceptance/happy-send` (catalog → send → lifecycle cleared → cooldown) — see NAMING.md.
