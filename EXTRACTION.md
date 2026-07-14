# Proscenium extraction cutover

## Done (2026-07-14)

1. Isolated Hails behind package boundaries inside Axiom (`backend/hails/`, `frontend/src/hails/`, `routers/hails.py`).
2. Created this repo with copied domain packages + `docs/hails/` (60 files).
3. Registered **`proscenium`** in Axiom `config/apps.registry.yaml` (display name "Proscenium").
4. Axiom `docs/hails/` is a symlink to this repo's `docs/hails/` (SoT is here).
5. Named **Proscenium** — the home presentation platform, with **Hails as its flagship resident product** (operator decision: Hails does not branch out). Interim names `ctrl-alt-hail` and `hails-platform` retired same day; the `ctrl-alt-*` prefix convention is retired for new products.

## Remaining cutover (do not declare Axiom Hails-free until these ship)

1. Stand up this app's FastAPI wrapper with a self-contained settings store (today many Hails helpers still read Axiom `central_settings` / `axiom-settings.json`).
2. Mount Hail routes + SPA; deploy via Docker Compose on the homelab (project `proscenium`, port 8788).
3. Point registry `AXIOM_PROSCENIUM_BASE_URL` at the new service health endpoint.
4. Remove Axiom `#/axiom/hails*` routes and `routers/hails.py` once the leaf is healthy — leave only registry + probe.
5. Update LCARD/APK consumers if they currently hardcode Axiom Hail URLs.
6. Add **Bandit pathing** as the first dedicated per-product delivery path once the base platform is live.

## Frozen Hail work-chain note

Plot-proof remains frozen; raster presentation pivot remains the active presentation direction. Those policies travel with `docs/hails/` and living Praxis pivot docs still mirrored under Axiom `docs/praxis/` until Proscenium owns its own work tracker.
