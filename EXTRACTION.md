# Proscenium extraction cutover

## Done (2026-07-14)

1. Isolated Hails behind package boundaries inside Axiom (`backend/hails/`, `frontend/src/hails/`, `routers/hails.py`).
2. Created this repo with copied domain packages + `docs/hails/` (60 files).
3. Registered **`proscenium`** in Axiom `config/apps.registry.yaml` (display name "Proscenium").
4. Axiom `docs/hails/` is a symlink to this repo's `docs/hails/` (SoT is here).
5. Named **Proscenium** — the home presentation platform, with **Hails as its flagship resident product** (operator decision: Hails does not branch out). Interim names `ctrl-alt-hail` and `hails-platform` retired same day; the `ctrl-alt-*` prefix convention is retired for new products.
6. Mounted the Hails API and built SPA in Proscenium. Mutable Hails state now belongs to `data/hails-settings.json`; the initial catalog falls back to the copied committed `config/lcard/hail-definitions.json` seed and materializes locally on mutation. Hails contracts and JSON assets were copied into this repo. The three legacy raster Glyph Hero binaries are temporarily mounted read-only from Axiom because their host permissions prevent a one-time copy; this is asset compatibility only, not shared settings storage.

## Remaining cutover

1. Copy the remaining read-only Glyph Hero binaries into Proscenium after correcting their host ownership, then remove the compatibility mount.
2. **Done (2026-07-15):** Bandit is the first dedicated per-product delivery path through the shared presentation target registry.

Done in the follow-on cutover: Axiom unmounted `#/axiom/hails*` and `routers/hails.py`; LCARD catalog/render/send now target Proscenium (`LCARD_PROSCENIUM_BASE_URL`).

## Frozen Hail work-chain note

Plot-proof remains frozen; raster presentation pivot remains the active presentation direction. Those policies travel with `docs/hails/` and living Praxis pivot docs still mirrored under Axiom `docs/praxis/` until Proscenium owns its own work tracker.
