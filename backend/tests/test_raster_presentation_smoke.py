"""Raster presentation pivot — offline exit-gate smoke."""

from __future__ import annotations

from raster_presentation_smoke import RASTER_DEMO_CASES, validate_all_offline, validate_demo_delivery


def test_raster_demo_cases_cover_fleet_warden_and_combadge() -> None:
    ids = {case.hail_id for case in RASTER_DEMO_CASES}
    assert "hail.fleet_beacon.001" in ids
    assert "hail.warden_alert.001" in ids
    assert "hail.combadge.001" in ids


def test_offline_delivery_smoke_all_demos() -> None:
    failures = validate_all_offline()
    assert failures == [], "\n".join(failures)


def test_fleet_beacon_delivery_has_dual_layer_and_breakout_stage() -> None:
    case = next(c for c in RASTER_DEMO_CASES if c.hail_id == "hail.fleet_beacon.001")
    assert validate_demo_delivery(case) == []


def test_warden_alert_delivery_has_pop_and_medallion_stage() -> None:
    case = next(c for c in RASTER_DEMO_CASES if c.hail_id == "hail.warden_alert.001")
    assert validate_demo_delivery(case) == []


def test_combadge_delivery_has_transporter_and_medallion_stage() -> None:
    case = next(c for c in RASTER_DEMO_CASES if c.hail_id == "hail.combadge.001")
    assert validate_demo_delivery(case) == []
