# Proscenium

**The Control Alt home presentation platform** — the stage for anything **visual and audio** happening in the home. Named for the proscenium, the frame around a theater stage.

**Hails is Proscenium's flagship product**: themed notifications with Glyph Heroes, Paintbox authoring, effects/choreography. The platform grows from there — per-product delivery pathing (**Bandit** first), TV/LCARD overlays, and eventually audio cues.

It doesn't do all of that yet — it's built to **grow** that way. Today it carries the Hails domain extracted from **ctrl-alt-axiom** (Axiom Rework Program, 2026-07-14).

> **Naming:** plain product name, no `ctrl-alt-*` prefix (convention retired 2026-07-14). Formerly scaffolded as `ctrl-alt-hail` / `hails-platform`.

## Status

| Layer | State |
| --- | --- |
| Product docs | Live here under `docs/hails/` (Hails product docs) |
| Domain package | Owned here (`backend/hails/`, `frontend/src/hails/`) |
| Runtime | Hails API, SPA, state, and delivery run here on port 8788 |
| Themes | Consumes Axiom `GET /api/effective/proscenium` when running as a leaf |

## Scope

- **Hails** — flagship product: themed notifications with glyphs, effects, message sidekicks
- **Presentation surfaces** — Paintbox authoring, presentation templates, TV/LCARD delivery
- **Product pathing** — dedicated visual/audio delivery paths per product (Bandit first)
- **Audio** — future: sound cues/choreography alongside visual delivery

## Stack

- Backend: FastAPI (`backend/main.py`)
- Frontend: Vite + React (`frontend/`)
- Themes: ctrl-alt-standards contracts + Axiom effective payload
- Compose: root `docker-compose.yml` (project `proscenium`, port 8788)

## Registry

Axiom `app_id`: **`proscenium`**. LAN URL env: `AXIOM_PROSCENIUM_BASE_URL` (default `http://192.168.68.93:8788`).

## Migration notes

See [EXTRACTION.md](EXTRACTION.md). Axiom now links to this app; old Axiom Hails bookmarks resolve to the Proscenium app hub.
