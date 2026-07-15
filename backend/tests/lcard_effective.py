"""Effective LCARD hails app_settings blob for tests.

Proscenium equivalent of the `lcard` branch of Axiom's
central_settings.build_effective_payload (the hub `/api/effective/lcard`
endpoint). Hails ownership moved to Proscenium; the migrated tests exercise
the same domain projection directly instead of going through the Axiom hub.
"""

from __future__ import annotations

import copy
from typing import Any

from axiom_settings_store import read_settings
from schemas import AxiomStoredSettings
from settings import settings


def effective_lcard_app_settings(st: AxiomStoredSettings | None = None) -> dict[str, Any]:
    from hails.hail_lcard_catalog import compute_hails_catalog_revision
    from hails.hails_composer import active_custom_glyphs_for_lcard
    from hails.hails_domain import effective_lcard_hails
    from lcard_hail_seed import merge_lcard_hail_seed

    if st is None:
        st = read_settings(settings.settings_path)
    app_blob = copy.deepcopy(st.app_settings.get("lcard") or {})
    domain_hails = effective_lcard_hails(st, public_base_url="")
    if domain_hails is not None:
        app_blob["hails"] = domain_hails
        app_blob["hails_catalog_revision"] = compute_hails_catalog_revision(domain_hails)
        app_blob["custom_glyphs"] = active_custom_glyphs_for_lcard(st)
    else:
        app_blob = merge_lcard_hail_seed(app_blob)
    return app_blob
