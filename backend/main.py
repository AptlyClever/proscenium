"""Proscenium — Hails presentation platform FastAPI entry."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routers.hails import router as hails_router
from routers.presentation import router as presentation_router
from settings import _resolve_repo_root, settings


def create_app() -> FastAPI:
    app = FastAPI(title="proscenium", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(hails_router)
    app.include_router(presentation_router)

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {
            "status": "ok",
            "app": "proscenium",
            "product": "presentation",
        }

    # Staged glyph candidate assets (workbench brief slots reference
    # staged/glyphs/... asset_refs) — must precede the SPA catch-all.
    staged_glyphs_root = _resolve_repo_root() / "staged" / "glyphs"

    if staged_glyphs_root.is_dir():

        @app.get("/staged/glyphs/{asset_path:path}")
        async def staged_glyph_asset(asset_path: str) -> FileResponse:
            if ".." in asset_path.split("/"):
                raise HTTPException(status_code=404, detail="Not found")
            candidate = (staged_glyphs_root / asset_path).resolve()
            try:
                candidate.relative_to(staged_glyphs_root.resolve())
            except ValueError:
                raise HTTPException(status_code=404, detail="Not found")
            if not candidate.is_file():
                raise HTTPException(status_code=404, detail="Not found")
            return FileResponse(candidate)

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
