"""Proscenium — leaf FastAPI entry (extraction scaffold).

The home visual/audio presentation platform; Hails is its flagship product.
Live Hails API still runs inside ctrl-alt-axiom until cutover (see
EXTRACTION.md). This process exposes health so Axiom registry probes succeed
once the stack is up.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def create_app() -> FastAPI:
    app = FastAPI(title="proscenium", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {
            "status": "ok",
            "app": "proscenium",
            "note": "Extraction scaffold — full Proscenium cutover pending (EXTRACTION.md)",
        }

    return app


app = create_app()
