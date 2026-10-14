"""Pydantic request models (validation lives at the edge of the system)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=32, examples=["alice"])
    password: str = Field(min_length=8, max_length=128, examples=["correct-horse-battery"])


class CreateGameRequest(BaseModel):
    mode: Literal["x01"] = "x01"
    players: list[str] = Field(min_length=1, max_length=8, examples=[["Alice", "Bob"]])
    start: Literal[101, 201, 301, 401, 501, 601, 701, 801, 901, 1001] = 501
    double_out: bool = True
    double_in: bool = False


class ManualThrowRequest(BaseModel):
    """Exactly one of: label ('T20'), (multiplier + sector), or (x_mm + y_mm)."""
    label: str | None = Field(default=None, examples=["T20"])
    multiplier: int | None = Field(default=None, ge=0, le=3)
    sector: int | None = Field(default=None, ge=0, le=25)
    x_mm: float | None = Field(default=None, ge=-400, le=400)
    y_mm: float | None = Field(default=None, ge=-400, le=400)

    @model_validator(mode="after")
    def _one_form(self):
        forms = [self.label is not None,
                 self.multiplier is not None or self.sector is not None,
                 self.x_mm is not None or self.y_mm is not None]
        if sum(forms) != 1:
            raise ValueError("Provide exactly one of: label | multiplier+sector | x_mm+y_mm")
        if (self.multiplier is None) != (self.sector is None) and forms[1]:
            raise ValueError("multiplier and sector must be given together")
        if (self.x_mm is None) != (self.y_mm is None) and forms[2]:
            raise ValueError("x_mm and y_mm must be given together")
        return self


class DetectedThrowRequest(BaseModel):
    """A dart reported by an external detector (e.g. the YOLO webcam bridge)."""
    label: str = Field(examples=["T20"], description="Board label: S5, D16, T20, SB, DB or MISS")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Detector confidence 0..1")
    source: Literal["yolo"] = "yolo"


class CalibrationRequest(BaseModel):
    points: list[list[float]] = Field(
        description="Pixel coords of the 4 reference wires, order: 20|1, 6|10, 3|19, 11|14",
        min_length=4, max_length=4,
        examples=[[[412, 40], [760, 420], [388, 770], [30, 380]]])

    @model_validator(mode="after")
    def _pairs(self):
        if any(len(p) != 2 for p in self.points):
            raise ValueError("Each calibration point must be [x, y]")
        return self


class SimulateRequest(BaseModel):
    target: str = Field(default="auto", description="'auto' or a label such as T20")
    sigma_mm: float = Field(default=12.0, ge=0, le=80, description="Throwing inaccuracy (std-dev, mm)")
    x_mm: float | None = None
    y_mm: float | None = None
