# Hail platform — naming and verification

**Status:** Canonical terminology and verification naming (implementation mirror).  
**Praxis authority:** `doctrine-hail-platform-naming` → `/mnt/temp/config/praxis/objects/doctrines/hail-platform-naming.md`  
**Collective Beta policy:** `doctrine-collective-beta-versioning` → `docs/praxis/collective-beta-versioning-px001.md`  
**Architecture authority:** `docs/hails/hails-authority-v001.md` (CRUD, SoT, consumers — separate from this doc).

**Edit the Praxis doctrine first, then sync this file.**

---

## 1. Product and platform

| Term | Use |
| --- | --- |
| **Hail platform** | The whole solution: Axiom authoring + LCARD distribution trigger + overlay playback on TV |
| **Hail** | One operator deliverable — composed, saved, cataloged, sent, rendered |
| **Hail package** | Frozen composed payload (`package_schema_version`, `layout_regions`, hero, sidekicks, shell) |
| **Hails** | UI plural only — lists, studio, navigation |

### Platform planes

| Plane | Role | Primary deployable |
| --- | --- | --- |
| **Authoring** | Compose, preview, validate, Save | `ctrl-alt-axiom` (Hails studio, Hail Forge) |
| **Distribution** | Catalog projection, send trigger, delivery | `ctrl-alt-axiom` + `control-alt-lcard` |
| **Playback** | Render on device | Hail overlay APK (`hail-overlay-poc`) |

### Do not use

- **Hail Stack** — collides with **ctrl-alt-stack** (Compose aggregation)
- **Stack** for this product in docs, env keys, or CI job names
- **`hails-2.0-beta`** (or similar) as a code identifier — milestone label in Praxis only

---

## 2. Versioning

Cross-program policy: **`doctrine-collective-beta-versioning`** → Praxis `objects/doctrines/collective-beta-versioning.md` (mirror: `ctrl-alt-standards/docs/collective-beta-versioning.md`). Collective Beta **cuts** vs ordinary **ships** are defined there.

| Concern | Convention |
| --- | --- |
| Shipped software | Semver per repo (npm, APK `VERSION_NAME`) |
| Payload / contract shape | Monotonic integer: `package_schema_version`, `schema_version` |
| Program milestone | Praxis/docs label only (“Beta 2”) |

**Contract files:** prefer flat names (`hail-render-contract.json`) with generation inside JSON. One integer generation gates Save, LCARD catalog, and APK for a given cut.

**Cross-repo prefix:** `hail-platform-` (env, CI, acceptance specs).

---

## 3. Verification

### Suite: `hail-platform-e2e`

```bash
cd frontend && npm run verify:hail-platform-e2e
```

| Lane | Env | Purpose |
| --- | --- | --- |
| `fast` | `HAIL_PLATFORM_E2E_LANE=fast` (default in CI) | Contract, B-slices, pytest, parity harness; `SKIP_LCARD_COLLECTIVE_VERIFY=1` |
| `platform` | Homelab URLs in `config/hails/hail-platform.e2e.env` | LCARD smokes against live Axiom |
| `device` | `protocol-arcade-hail-overlay-live-deploy`; travel: `protocol-away-team-hail-overlay-deploy` | Arcade overlay; manual or nightly |

### Happy path acceptance: `acceptance/happy-send`

1. Hail with current `package_schema_version`, `catalog_ready`
2. `GET /api/effective/lcard` → chip projection
3. `POST /api/hails/{id}/send` (`source: lcard`)
4. Lifecycle **cleared**; cooldown per `delivery_target_id`
5. Optional device lane: Arcade health / logcat

Authoring parity (preview ≡ package) stays a **separate** fast-lane concern: `npm run verify:hails-hero-first-preview`.

### Legacy aliases (still valid)

| Canonical | Legacy (deprecated in docs) |
| --- | --- |
| `verify:hail-platform-e2e` | `verify:hails-collective-beta-v002` |
| `verify:hail-platform-e2e:fast` | Same + `SKIP_LCARD_COLLECTIVE_VERIFY=1` |

Internal slice scripts (`verify:hails-collective-beta-v002-b0` … `b8`) remain until renamed.

### Platform Test hail (smoke fixture)

Reserved id **`hail.platform_test.001`** — rebuilt from current defaults via `scripts/upsert-platform-test-hail.py`.  
Praxis: `protocol-platform-test-hail-upsert`. See `docs/hails/platform-test-hail-v001.md`.

---

## 4. Environment contract

Copy and edit:

```bash
cp config/hails/hail-platform.e2e.env.example config/hails/hail-platform.e2e.env
```

See `config/hails/hail-platform.e2e.env.example` for keys (`AXIOM_BASE_URL`, `LCARD_SERVICE_URL`, `ARCADE_OVERLAY_URL`, `HAIL_PLATFORM_E2E_LANE`, etc.).

---

## 5. Praxis mirror

Short pointers:

- `docs/praxis/hail-platform-naming-px001.md`
- `docs/praxis/google-tv-fleet-registry-px001.md` — Google TV fleet inventory + delivery targets
- `docs/praxis/away-team-hail-overlay-deploy-px001.md` — travel stick overlay deploy
