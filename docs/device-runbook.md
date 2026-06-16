# Control Alt Hails — Google TV device runbook v001

**Package:** `com.controlalt.hailoverlay`  
**Launcher name:** Hail  
**HTTP port:** `8765`  
**Platform:** Google TV / Android TV streamer boxes only

## Install (per TV)

Preferred — Arcade deploy script (install + launcher trampoline + health):

```bash
cd hail-overlay-poc
./scripts/deploy-arcade-apk.sh           # existing debug APK
./scripts/deploy-arcade-apk.sh --build # assembleDebug then deploy
```

Manual equivalent:

```bash
adb connect <tv-ip>
adb install -r hail-overlay-poc/artifacts/control-alt-hail-overlay-v1.0.0-v001-debug.apk
adb shell am start -n com.controlalt.hailoverlay/.LauncherStartActivity
adb shell appops set com.controlalt.hailoverlay SYSTEM_ALERT_WINDOW allow
adb shell dumpsys deviceidle whitelist +com.controlalt.hailoverlay
```

## Household targets

| Room | TV IP | Overlay URL |
|------|-------|-------------|
| Arcade | `192.168.68.105` | `http://192.168.68.105:8765/hail/show` |
| Master Bedroom | `192.168.68.91` | `http://192.168.68.91:8765/hail/show` |

## First boot

1. Launch **Hail** once after install — the launcher trampoline starts the hail listener and exits immediately (no UI left on the TV).
2. Confirm health:

```bash
curl -sS http://<tv-ip>:8765/health
```

### Diagnostics screen (optional)

Open the explicit diagnostics UI when needed:

```bash
adb shell am start -n com.controlalt.hailoverlay/.DiagnosticsActivity
# or
adb shell am start -a com.controlalt.hailoverlay.action.OPEN_DIAGNOSTICS -n com.controlalt.hailoverlay/.DiagnosticsActivity
```

Normal launcher entry is `com.controlalt.hailoverlay/.LauncherStartActivity` (via app icon).

## Manual hail test

Production builds require `broker_proof` from LCARD. For **operator-controlled** parity work on Arcade, prefer one of:

### Option A — TV Diagnostics (recommended)

Open the on-device trigger UI, then press a variation when you are ready:

```bash
adb connect 192.168.68.105
./scripts/open-arcade-diagnostics.sh
```

Or from the TV: notification → Diagnostics (when available), or:

```bash
adb shell am start -a com.controlalt.hailoverlay.action.OPEN_DIAGNOSTICS \
  -n com.controlalt.hailoverlay/.DiagnosticsActivity
```

**Voyager / TNG / Cardassian** buttons fire the full lifecycle (~8.8s) only on button press.

### Option B — dev-ubuntu script (waits for you)

```bash
cd hail-overlay-poc
./scripts/trigger-arcade-transporter.sh voyaging          # Enter when ready
./scripts/trigger-arcade-transporter.sh generation-next   # TNG
./scripts/trigger-arcade-transporter.sh spoon --now       # skip Enter prompt
```

### Option C — raw curl (broker proof required)

```bash
curl -sS -X POST "http://<tv-ip>:8765/hail/show" \
  -H "Content-Type: application/json" \
  -d '{
    "hail_id": "hail.sniffer.001",
    "effect_id": "transporter_beam",
    "glyph_id": "hail-sniffer",
    "palette_id": "axiom_dark_cyan",
    "message": "What'\''s sniffing?",
    "duration_ms": 5500,
    "placement_id": "upper_center",
    "placement_mode": "preset",
    "effect_variation_id": "generation-next",
    "android_effect_tuning": { "beam_intensity": 0.78, "beam_scale": 1.0 },
    "effect_identity": { "particle_style": "sparkle_rise" }
  }'
```

Variation profiles (`voyaging`, `generation-next`, `spoon`) require APK `2.0.0-alpha.2` or newer. Broker proof is required when posting through LCARD; direct device curl for dev may omit it only if the installed APK build allows local testing (production builds require `broker_proof` from LCARD send).

## LCARD send path (after adapter merge)

LCARD brokers `POST /api/hails/:id/send` → Hail overlay HTTP on target room Google TV.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No overlay | `adb shell appops get com.controlalt.hailoverlay SYSTEM_ALERT_WINDOW` → must be `allow` |
| curl connection refused | Listener not running — run `./scripts/deploy-arcade-apk.sh` or `adb shell am start -n com.controlalt.hailoverlay/.LauncherStartActivity` |
| App returns to launcher on hail | Check logcat for Compose crash; ensure v1.0.0-v001+ |
| Overlay missing on DRM app only | Expected on some secure-surface apps; verify Hail listener health |

## Explicit non-actions

- No Play Store distribution in v001
- No household rollout without Praxis approval
- No LCARD browser exposure of LAN endpoints
