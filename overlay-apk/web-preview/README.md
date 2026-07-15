# Control Alt Hails — Web Preview

Browser harness for tuning overlay placement, scale, palettes, and message readability before building APKs.

**Endpoint model (v001):** This harness is **not a room**. It is `workbench:visual_workbench` → `preview_surface:lcard_hail_visual_harness` with `delivery_mode: visual_preview`, `safety_mode: test`, and **`allows_live_delivery: false`**. See `../../docs/hails-visual-harness-endpoint-model-v001.md` and `ctrl-alt-standards/docs/hails/hail-endpoint-model-v001.md` §5.

**dev-ubuntu is headless.** Run the preview service on dev-ubuntu and open it from a desktop browser on the LAN (Aurora, etc.).

## Fast dev vs stable preview

| Mode | Port | URL | When to use |
|------|------|-----|-------------|
| **Fast dev** | **8197** | `http://192.168.68.93:8197/` | Active visual tuning — CSS/JS/contract edits reload without Docker rebuild |
| **Stable** | **8196** | `http://192.168.68.93:8196/` | Accepted preview state, Travis review, homelab default after rebuild |

Fast dev bind-mounts source into a lightweight Node container, watches files, and auto-reloads the browser via SSE. Stable mode bakes files into the image (survives reboot, no bind-mount coupling).

### Fast dev — start / stop

```bash
cd /mnt/temp/config/proscenium/overlay-apk/web-preview

# Start (Docker, LAN :8197)
npm run dev:start
# or: ./scripts/preview-dev-start.sh

# Stop
npm run dev:stop
# or: ./scripts/preview-dev-stop.sh
```

Local Node without Docker (same watch/reload):

```bash
npm run preview:dev:lan
# http://192.168.68.93:8197/
```

Validate dev:

```bash
npm run smoke:dev
```

### Stable — rebuild after acceptance

When visuals are ready for Travis or long-lived homelab use:

```bash
npm run stable:rebuild
# or: ./scripts/preview-stable-rebuild.sh
```

Rebuild copies current source into the image and restarts `:8196`. Expect several minutes on slow mounts — that is why dev mode exists.

## Docker stable (homelab default)

Build and start:

```bash
cd /mnt/temp/config/proscenium/overlay-apk/web-preview
docker compose build
docker compose up -d
```

**LAN URL:** `http://192.168.68.93:8196/`

Workbench layout: fixed left control rail (compact placement/palette buttons, sticky Preview/Hide), TV stage always visible on the right. Payload JSON is collapsed under Diagnostics with a Copy button.

| Item | Value |
|------|-------|
| Service | `control-alt-hails-preview` |
| Container | `control-alt-hails-preview` |
| Port | **8196** (host → container) |
| Bind | `0.0.0.0` inside container |
| Restart | `unless-stopped` (auto-start on reboot) |

Stop / remove stable only:

```bash
docker compose down
```

Logs:

```bash
docker compose logs -f control-alt-hails-preview
docker compose -f docker-compose.dev.yml logs -f control-alt-hails-preview-dev
```

## Manual Node (development)

```bash
npm run preview:lan
```

Same port **8196**, but does not survive reboot unless run manually. Conflicts with stable Docker container if both use `:8196`.

Local-only loopback:

```bash
npm run preview
# http://127.0.0.1:8766 — not for remote browsers
```

## Static files

No bundler or build step. Static HTML/CSS/ES modules served by `server.js`. Dev mode adds `fs.watch` + SSE auto-reload (`HAIL_PREVIEW_DEV=1`).

## npm smoke tests

```bash
npm run smoke          # files/contract (no server)
npm run smoke:lan      # stable HTTP (:8196)
npm run smoke:dev      # dev HTTP (:8197)
```

## Shared contract

`../shared/hail-render-contract.json` → `/shared/hail-render-contract.json`

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Page does not load from Aurora | `docker compose ps` / `docker compose -f docker-compose.dev.yml ps` |
| Connection refused on `:8196` | Stable container down or port conflict — `ss -tlnp \| grep 8196` |
| Connection refused on `:8197` | Run `npm run dev:start` |
| Stale UI in **stable** mode | `npm run stable:rebuild` |
| Stale UI in **dev** mode | Should auto-reload; hard-refresh if SSE disconnected |
| Dev + stable both running | OK — different ports (8197 vs 8196) |
| Blank page | Use LAN URL not `file://` |
| Wrong machine IP | Homelab host is usually `192.168.68.93` |
| `/shared/hail-render-contract.json` 404 in **dev** | Recreate dev container after compose changes: `npm run dev:stop && npm run dev:start`. Dev compose bind-mounts `overlay-apk/` as one tree so `../shared` is visible inside the container. |

## Scope

Desktop browser preview only. Does not contact Google TV devices. Not integrated into production Axiom. **Not a production room launcher** — preview surface only (`allows_live_delivery: false`).
