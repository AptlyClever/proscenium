"""Proscenium — Hails presentation platform FastAPI entry."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routers.hails import router as hails_router
from settings import settings


def create_app() -> FastAPI:
    app = FastAPI(title="proscenium", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(hails_router)

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {
            "status": "ok",
            "app": "proscenium",
            "product": "hails",
        }

    static_root = settings.static_root
    assets_root = static_root / "assets"
    if assets_root.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_root), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (static_root / path).resolve()
        try:
            candidate.relative_to(static_root.resolve())
        except ValueError:
            raise HTTPException(status_code=404, detail="Not found")
        if path and candidate.is_file():
            return FileResponse(candidate)
        index = static_root / "index.html"
        if not index.is_file():
            raise HTTPException(status_code=503, detail="Frontend build is unavailable")
        return FileResponse(index)

    return app


app = create_app()
