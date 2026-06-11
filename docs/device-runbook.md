# Control Alt Hails — Google TV device runbook v001

**Package:** `com.controlalt.hailoverlay`  
**Launcher name:** Control Alt Hails  
**HTTP port:** `8765`  
**Platform:** Google TV / Android TV streamer boxes only

## Install (per TV)

```bash
adb connect <tv-ip>
adb install -r hail-overlay-poc/artifacts/control-alt-hail-overlay-v1.0.0-v001-debug.apk
adb shell appops set com.controlalt.hailoverlay SYSTEM_ALERT_WINDOW allow
adb shell dumpsys deviceidle whitelist +com.controlalt.hailoverlay
```

## Household targets

| Room | TV IP | Overlay URL |
|------|-------|-------------|
| Arcade | `192.168.68.105` | `http://192.168.68.105:8765/hail/show` |
| Master Bedroom | `192.168.68.102` | `http://192.168.68.102:8765/hail/show` |

## First boot

1. Launch **Control Alt Hails** once after install.
2. Tap **Start hail listener service** (boot receiver also attempts auto-start when overlay permission is already granted).
3. Confirm health:

```bash
curl -sS http://<tv-ip>:8765/health
```

## Manual hail test

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
    "placement_mode": "preset"
  }'
```

## LCARD send path (after adapter merge)

LCARD brokers `POST /api/hails/:id/send` → hail overlay HTTP on target room TV → TvOverlay HA script fallback on failure.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No overlay | `adb shell appops get com.controlalt.hailoverlay SYSTEM_ALERT_WINDOW` → must be `allow` |
| curl connection refused | Open app and start listener service |
| App returns to launcher on hail | Check logcat for Compose crash; ensure v1.0.0-v001+ |
| Overlay missing on DRM app only | Expected on some secure-surface apps; LCARD falls back to TvOverlay toast |

## Explicit non-actions

- No Play Store distribution in v001
- No household rollout without Praxis approval
- No LCARD browser exposure of LAN endpoints
