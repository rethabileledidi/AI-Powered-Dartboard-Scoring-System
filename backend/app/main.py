"""Application factory.  Run:  uvicorn app.main:app --reload"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.routes import router
from .config import Settings
from .db import Repository
from .errors import DomainError
from .services.events import ConnectionHub
from .services.game_service import GameService

log = logging.getLogger("dartboard")

DESCRIPTION = """
Backend for the **AI-Powered Dart Board Scoring System**.

* Computer-vision pipeline (OpenCV): calibration -> dart detection -> board coordinates -> score
* X01 game engine with double-out, bust, undo and checkout suggestions
* JWT auth, SQLite persistence, per-player statistics, live WebSocket updates
* `/simulate` endpoint to demo the full pipeline without hardware
"""


@dataclass
class Container:
    settings: Settings
    repo: Repository
    service: GameService
    hub: ConnectionHub


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    repo = Repository(settings.db_path)
    app = FastAPI(title="AI Dart Board Scoring API", version="0.1.0", description=DESCRIPTION)
    app.state.container = Container(settings, repo, GameService(repo, settings), ConnectionHub())
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.cors_origins),
                       allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

    @app.exception_handler(DomainError)
    async def domain_error(_: Request, exc: DomainError):
        return JSONResponse(status_code=exc.status_code,
                            content={"error": {"code": exc.code, "message": exc.message}})

    app.include_router(router)
    return app


app = create_app()
