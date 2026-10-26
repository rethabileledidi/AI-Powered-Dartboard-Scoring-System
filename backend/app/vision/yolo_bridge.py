"""Glue between a YOLO segment detector (webcam side) and the game API.

The team's YOLOv8 model reports which *board segment* each dart sits in (classes such as
``triple_20``).  A live camera sees EVERY dart on the board in EVERY frame, so this module turns
that noisy per-frame stream into clean game events:

    per-frame detections --> confidence filter --> must be identical for N frames (stability)
                         --> reconcile with the darts believed to be on the board --> "throw" events
                         --> empty board for N frames --> "takeout" event

Reconciling is count-based, not label-based: the model often re-labels the SAME dart as a
neighbouring segment (T20 -> S20) and sometimes loses one, so labels are matched to the nearest
previously-seen dart and only the leftovers count as new throws.

It is pure Python (no torch / OpenCV import), so it is unit-tested in CI without a camera.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Callable, Iterable

from ..core.board import SECTOR_ORDER

# Classes found in the team's data.yaml (names are the Roboflow class names).
_PREFIX = {"single_": "S", "double_": "D", "triple_": "T"}


def class_to_label(name: str, bullseye_as: str = "DB") -> str | None:
    """Map a YOLO class name to a backend board label, or None if it cannot be scored.

    ``bullseye`` is ambiguous in the dataset (there is no separate outer-bull class), so the
    caller chooses how to score it (default DB = 50).  Unknown names (e.g. the ``tdouble_19``
    typo class) are ignored rather than guessed.
    """
    name = name.strip().lower()
    if name == "miss":
        return "MISS"
    if name == "bullseye":
        return bullseye_as
    for prefix, letter in _PREFIX.items():
        if name.startswith(prefix):
            tail = name[len(prefix):]
            if tail.isdigit() and 1 <= int(tail) <= 20:
                return f"{letter}{int(tail)}"
    return None


_FAR = 99.0


def label_distance(a: str, b: str) -> float:
    """How plausibly could the detector have re-labelled dart ``a`` as ``b``? (0 = identical).

    Distance is the number of sector steps around the board plus 0.5 if the ring differs
    (T20 -> S20 = 0.5, T20 -> T1 = 1.0).  Bulls only match bulls; MISS never matches.
    """
    if a == b:
        return 0.0
    bulls = ("SB", "DB")
    if a == "MISS" or b == "MISS":
        return _FAR
    if a in bulls or b in bulls:
        return 0.5 if (a in bulls and b in bulls) else _FAR
    try:
        i, j = SECTOR_ORDER.index(int(a[1:])), SECTOR_ORDER.index(int(b[1:]))
    except ValueError:
        return _FAR
    steps = abs(i - j)
    return min(steps, len(SECTOR_ORDER) - steps) + (0.0 if a[0] == b[0] else 0.5)


@dataclass(frozen=True)
class BridgeEvent:
    kind: str                       # "throw" | "takeout"
    label: str | None = None
    confidence: float | None = None


class DartTracker:
    """Turns per-frame (label, confidence) detections into throw / takeout events."""

    def __init__(self, min_conf: float = 0.5, stable_frames: int = 5, max_new_darts: int = 3,
                 max_drift: float = 2.0):
        if stable_frames < 1:
            raise ValueError("stable_frames must be >= 1")
        self.min_conf = min_conf
        self.stable_frames = stable_frames
        self.max_new_darts = max_new_darts
        self.max_drift = max_drift          # farthest a label may move and still be "the same dart"
        self.reset()

    def reset(self) -> None:
        self._candidate: Counter = Counter()
        self._streak = 0
        self._handled = False
        self._conf: dict[str, float] = {}
        self.accepted: Counter = Counter()      # darts believed to be on the board since the last takeout

    def update(self, detections: Iterable[tuple[str, float]]) -> list[BridgeEvent]:
        seen: Counter = Counter()
        conf: dict[str, float] = {}
        for label, c in detections:
            if label and c >= self.min_conf:
                seen[label] += 1
                conf[label] = max(conf.get(label, 0.0), c)

        if seen == self._candidate:
            self._streak += 1
            for k, v in conf.items():
                self._conf[k] = max(self._conf.get(k, 0.0), v)
        else:
            self._candidate, self._streak, self._handled, self._conf = seen, 1, False, dict(conf)

        if self._streak < self.stable_frames or self._handled:
            return []
        self._handled = True                     # one decision per distinct stable state
        return self._decide(self._candidate, self._conf)

    # ------------------------------------------------------------------ internals
    def _decide(self, stable: Counter, conf: dict[str, float]) -> list[BridgeEvent]:
        if not stable:
            if self.accepted:
                self.accepted = Counter()
                return [BridgeEvent("takeout")]
            return []

        # Labels seen now that no known dart explains, and known darts no label explains.
        unexplained_now = list((stable - self.accepted).elements())
        unexplained_old = list((self.accepted - stable).elements())

        # Pair each leftover old dart with its nearest leftover label (re-labelled dart, not a new one).
        pairs = sorted((label_distance(old, now), i, j)
                       for i, old in enumerate(unexplained_old)
                       for j, now in enumerate(unexplained_now))
        used_old: set[int] = set()
        used_now: set[int] = set()
        for dist, i, j in pairs:
            if dist > self.max_drift:
                break
            if i in used_old or j in used_now:
                continue
            used_old.add(i)
            used_now.add(j)
        new = [lab for j, lab in enumerate(unexplained_now) if j not in used_now]

        # The stable picture IS the board now: darts that fell out simply disappear from it.
        self.accepted = Counter(stable)
        if not new:
            return []
        if len(new) > self.max_new_darts:        # e.g. started with darts already on the board
            return []
        new.sort(key=lambda lab: conf.get(lab, 0.0), reverse=True)
        return [BridgeEvent("throw", lab, round(conf.get(lab, 0.0), 3)) for lab in new]


def dispatch(events: Iterable[BridgeEvent], post: Callable[[str, dict | None], dict | None],
             game_id: int) -> list[str]:
    """Send events to the API. ``post(path, body)`` is injected (urllib in the script, TestClient in tests)."""
    log: list[str] = []
    for ev in events:
        if ev.kind == "throw":
            post(f"/api/games/{game_id}/throws/detected",
                 {"label": ev.label, "confidence": ev.confidence or 0.0})
            log.append(f"throw {ev.label} ({ev.confidence})")
        elif ev.kind == "takeout":
            post(f"/api/games/{game_id}/takeout", None)
            log.append("takeout")
    return log
