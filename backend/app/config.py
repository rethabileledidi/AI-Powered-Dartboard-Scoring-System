from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    db_path: str = field(default_factory=lambda: os.getenv("DARTS_DB", "darts.db"))
    jwt_secret: str = field(default_factory=lambda: os.getenv("DARTS_JWT_SECRET", "dev-secret-change-me-in-production"))
    jwt_ttl_minutes: int = field(default_factory=lambda: int(os.getenv("DARTS_JWT_TTL", "720")))
    allow_simulation: bool = field(default_factory=lambda: os.getenv("DARTS_ALLOW_SIM", "1") == "1")
    cors_origins: tuple = field(default_factory=lambda: tuple(
        o.strip() for o in os.getenv("DARTS_CORS", "http://localhost:3000,http://localhost:5173").split(",") if o.strip()))
    pbkdf2_iterations: int = field(default_factory=lambda: int(os.getenv("DARTS_PBKDF2_ITER", "200000")))
    max_frame_bytes: int = field(default_factory=lambda: int(os.getenv("DARTS_MAX_FRAME_BYTES", str(8 * 1024 * 1024))))
