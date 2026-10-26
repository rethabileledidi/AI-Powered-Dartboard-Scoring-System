"""Gaussian dart-throwing simulator, used for demos, seeding mock data and tests."""
from __future__ import annotations

import random

from .board import aim_point, throw_from_label
from .game import X01Game


def sample_dart(rng: random.Random, aim_xy: tuple[float, float], sigma_mm: float) -> tuple[float, float]:
    return rng.gauss(aim_xy[0], sigma_mm), rng.gauss(aim_xy[1], sigma_mm)


def choose_target(game: X01Game) -> str:
    """Pick a sensible target for the current player (finish if possible, else build score)."""
    hint = game.checkout_hint()
    if hint:
        return hint[0]
    remaining = game.players[game.current]["remaining"]
    if remaining > 60:
        return "T20"
    setup = remaining - 32            # leave D16
    return f"S{setup}" if 1 <= setup <= 20 else "S1"


def target_xy(label: str) -> tuple[float, float]:
    return aim_point(throw_from_label(label))
