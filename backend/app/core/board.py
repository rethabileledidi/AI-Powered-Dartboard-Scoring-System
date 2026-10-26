"""Dartboard geometry and scoring (pure Python, no I/O).

Coordinate system used everywhere in the backend ("board plane", millimetres):
    origin = centre of the bullseye, +x = right, +y = up (towards the 20 sector).
All radii are the official WDF/BDO tournament dimensions.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum

# Clockwise from the top of the board.
SECTOR_ORDER = (20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
                3, 19, 7, 16, 8, 11, 14, 9, 12, 5)
SECTOR_WIDTH_DEG = 18.0

BULL_INNER_R = 6.35      # double bull (50)
BULL_OUTER_R = 15.9      # single bull (25)
TRIPLE_INNER_R = 99.0
TRIPLE_OUTER_R = 107.0
DOUBLE_INNER_R = 162.0
DOUBLE_OUTER_R = 170.0   # edge of the scoring area


class Ring(str, Enum):
    MISS = "miss"
    DOUBLE_BULL = "double_bull"
    SINGLE_BULL = "single_bull"
    SINGLE = "single"
    TRIPLE = "triple"
    DOUBLE = "double"


@dataclass(frozen=True)
class Throw:
    ring: Ring
    sector: int        # 1-20, 25 for bull, 0 for miss
    multiplier: int
    points: int

    @property
    def label(self) -> str:
        if self.ring is Ring.MISS:
            return "MISS"
        if self.ring is Ring.DOUBLE_BULL:
            return "DB"
        if self.ring is Ring.SINGLE_BULL:
            return "SB"
        return {Ring.SINGLE: "S", Ring.DOUBLE: "D", Ring.TRIPLE: "T"}[self.ring] + str(self.sector)

    @property
    def is_double(self) -> bool:
        """Counts as a 'double' for double-in / double-out (includes the bullseye)."""
        return self.ring in (Ring.DOUBLE, Ring.DOUBLE_BULL)

    def to_dict(self) -> dict:
        return {"label": self.label, "ring": self.ring.value, "sector": self.sector,
                "multiplier": self.multiplier, "points": self.points}


MISS = Throw(Ring.MISS, 0, 0, 0)


def make_throw(multiplier: int, sector: int) -> Throw:
    """Build a Throw from (multiplier, sector). Sector 25 = bull, sector 0 = miss."""
    if sector == 0 or multiplier == 0:
        return MISS
    if sector == 25:
        if multiplier == 1:
            return Throw(Ring.SINGLE_BULL, 25, 1, 25)
        if multiplier == 2:
            return Throw(Ring.DOUBLE_BULL, 25, 2, 50)
        raise ValueError("The bull can only be single (25) or double (50)")
    if sector not in SECTOR_ORDER:
        raise ValueError(f"Invalid sector: {sector}")
    if multiplier not in (1, 2, 3):
        raise ValueError(f"Invalid multiplier: {multiplier}")
    ring = {1: Ring.SINGLE, 2: Ring.DOUBLE, 3: Ring.TRIPLE}[multiplier]
    return Throw(ring, sector, multiplier, sector * multiplier)


def throw_from_label(label: str) -> Throw:
    """Parse 'T20', 'D16', 'S5', 'SB', 'DB', 'MISS' (case-insensitive)."""
    text = label.strip().upper()
    if text == "MISS":
        return MISS
    if text == "SB":
        return make_throw(1, 25)
    if text in ("DB", "BULL"):
        return make_throw(2, 25)
    if len(text) >= 2 and text[0] in "SDT" and text[1:].isdigit():
        return make_throw({"S": 1, "D": 2, "T": 3}[text[0]], int(text[1:]))
    raise ValueError(f"Unrecognised throw label: {label!r}")


def classify_point(x_mm: float, y_mm: float) -> Throw:
    """Convert a board-plane coordinate (mm) into the scored segment."""
    r = math.hypot(x_mm, y_mm)
    if r <= BULL_INNER_R:
        return make_throw(2, 25)
    if r <= BULL_OUTER_R:
        return make_throw(1, 25)
    if r > DOUBLE_OUTER_R:
        return MISS
    theta = math.degrees(math.atan2(x_mm, y_mm)) % 360.0   # clockwise from the top
    index = int(((theta + SECTOR_WIDTH_DEG / 2) % 360.0) // SECTOR_WIDTH_DEG)
    sector = SECTOR_ORDER[index]
    if TRIPLE_INNER_R < r <= TRIPLE_OUTER_R:
        return make_throw(3, sector)
    if r > DOUBLE_INNER_R:
        return make_throw(2, sector)
    return make_throw(1, sector)


def sector_angle_deg(sector: int) -> float:
    """Clockwise angle (degrees) of the centre line of a sector."""
    return SECTOR_ORDER.index(sector) * SECTOR_WIDTH_DEG


def aim_point(throw: Throw) -> tuple[float, float]:
    """Centre of a segment in board-plane mm (used by the simulator and tests)."""
    if throw.ring is Ring.MISS:
        return (0.0, DOUBLE_OUTER_R + 30.0)
    if throw.ring is Ring.DOUBLE_BULL:
        return (0.0, 0.0)
    if throw.ring is Ring.SINGLE_BULL:
        return (0.0, (BULL_INNER_R + BULL_OUTER_R) / 2)
    r = {Ring.TRIPLE: (TRIPLE_INNER_R + TRIPLE_OUTER_R) / 2,
         Ring.DOUBLE: (DOUBLE_INNER_R + DOUBLE_OUTER_R) / 2,
         Ring.SINGLE: (TRIPLE_OUTER_R + DOUBLE_INNER_R) / 2}[throw.ring]
    a = math.radians(sector_angle_deg(throw.sector))
    return (r * math.sin(a), r * math.cos(a))


ALL_THROWS: tuple[Throw, ...] = tuple(
    [make_throw(m, s) for s in range(1, 21) for m in (1, 2, 3)]
    + [make_throw(1, 25), make_throw(2, 25)]
)


def board_spec() -> dict:
    return {
        "sector_order_clockwise_from_top": list(SECTOR_ORDER),
        "radii_mm": {"double_bull": BULL_INNER_R, "single_bull": BULL_OUTER_R,
                     "triple_inner": TRIPLE_INNER_R, "triple_outer": TRIPLE_OUTER_R,
                     "double_inner": DOUBLE_INNER_R, "double_outer": DOUBLE_OUTER_R},
        "coordinate_system": "origin at bullseye, +x right, +y up (towards 20), millimetres",
    }
