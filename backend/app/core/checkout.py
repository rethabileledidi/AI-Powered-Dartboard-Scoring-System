"""Checkout (finishing) suggestions: the shortest route to exactly zero."""
from __future__ import annotations

from functools import lru_cache

from .board import ALL_THROWS, Throw

_DOUBLE_PREF = ["D20", "D16", "D8", "D10", "D12", "D18", "D4", "D6", "D14", "D2", "D1",
                "D3", "D5", "D7", "D9", "D11", "D13", "D15", "D17", "D19", "DB"]
_SETUP_PREF = ["T20", "T19", "T18", "T17", "S20", "S19", "S18", "S17", "T16", "T15",
               "T14", "T13", "S16", "S15", "S14", "S13", "SB", "S12", "S11", "S10",
               "S9", "S8", "S7", "S6", "S5", "S4", "S3", "S2", "S1"]


def _rank(label: str, prefs: list[str]) -> int:
    return prefs.index(label) if label in prefs else len(prefs) + 10


def _penalty(seq: tuple[Throw, ...]) -> int:
    return (sum(_rank(t.label, _SETUP_PREF) for t in seq[:-1])
            + _rank(seq[-1].label, _DOUBLE_PREF if seq[-1].is_double else _SETUP_PREF))


def _enumerate(rem: int, n: int, double_out: bool, floor: int,
               prefix: tuple[Throw, ...], out: list[tuple[Throw, ...]]) -> None:
    if n == 1:
        for t in ALL_THROWS:
            if t.points == rem and (t.is_double or not double_out):
                out.append(prefix + (t,))
        return
    for t in ALL_THROWS:
        left = rem - t.points
        if left >= floor:
            _enumerate(left, n - 1, double_out, floor, prefix + (t,), out)


@lru_cache(maxsize=None)
def _best(remaining: int, darts_left: int, double_out: bool) -> tuple[str, ...] | None:
    floor = 2 if double_out else 1
    for n in range(1, darts_left + 1):          # fewest darts first
        found: list[tuple[Throw, ...]] = []
        _enumerate(remaining, n, double_out, floor, (), found)
        if found:
            return tuple(t.label for t in min(found, key=_penalty))
    return None


def suggest_checkout(remaining: int, darts_left: int = 3, double_out: bool = True) -> list[str] | None:
    """Best finish for `remaining` with up to `darts_left` darts, or None if impossible."""
    if not 1 <= darts_left <= 3 or remaining < 1:
        return None
    best = _best(remaining, darts_left, double_out)
    return list(best) if best else None
