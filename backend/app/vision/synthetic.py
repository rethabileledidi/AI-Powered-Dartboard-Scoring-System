"""Synthetic camera: renders a tilted dartboard + darts so the whole vision stack can be
demonstrated and tested without hardware (the real edge client posts real frames instead).
"""
from __future__ import annotations

import math

import cv2
import numpy as np

from ..core.board import (BULL_INNER_R, BULL_OUTER_R, DOUBLE_INNER_R, DOUBLE_OUTER_R,
                          SECTOR_ORDER, SECTOR_WIDTH_DEG, TRIPLE_INNER_R, TRIPLE_OUTER_R)
from .calibration import CALIBRATION_ANGLES_DEG, Calibration

SIZE = 800
SCALE = 2.0                      # px per mm on the un-warped board plane
CENTRE = (SIZE / 2, SIZE / 2)
_BLACK, _CREAM = (25, 25, 25), (215, 235, 245)
_RED, _GREEN = (30, 30, 200), (60, 150, 40)
_DART = (0, 165, 255)            # orange (BGR) - contrasts with every board colour

_base_cache: np.ndarray | None = None


def _px(x_mm: float, y_mm: float) -> tuple[int, int]:
    return int(round(CENTRE[0] + SCALE * x_mm)), int(round(CENTRE[1] - SCALE * y_mm))


def _wedge(img, idx: int, r_in: float, r_out: float, colour) -> None:
    a0 = math.radians(idx * SECTOR_WIDTH_DEG - SECTOR_WIDTH_DEG / 2)
    a1 = math.radians(idx * SECTOR_WIDTH_DEG + SECTOR_WIDTH_DEG / 2)
    steps = np.linspace(a0, a1, 8)
    outer = [_px(r_out * math.sin(a), r_out * math.cos(a)) for a in steps]
    inner = [_px(r_in * math.sin(a), r_in * math.cos(a)) for a in steps[::-1]]
    cv2.fillPoly(img, [np.array(outer + inner, np.int32)], colour)


def _board_plane() -> np.ndarray:
    global _base_cache
    if _base_cache is None:
        img = np.full((SIZE, SIZE, 3), 70, np.uint8)
        cv2.circle(img, _px(0, 0), int(DOUBLE_OUTER_R * SCALE) + 14, (15, 15, 15), -1)
        for i in range(len(SECTOR_ORDER)):
            single, ring = (_BLACK, _RED) if i % 2 == 0 else (_CREAM, _GREEN)
            _wedge(img, i, BULL_OUTER_R, TRIPLE_INNER_R, single)
            _wedge(img, i, TRIPLE_INNER_R, TRIPLE_OUTER_R, ring)
            _wedge(img, i, TRIPLE_OUTER_R, DOUBLE_INNER_R, single)
            _wedge(img, i, DOUBLE_INNER_R, DOUBLE_OUTER_R, ring)
        cv2.circle(img, _px(0, 0), int(BULL_OUTER_R * SCALE), _GREEN, -1)
        cv2.circle(img, _px(0, 0), int(BULL_INNER_R * SCALE), _RED, -1)
        _base_cache = img
    return _base_cache.copy()


def _draw_dart(img, x_mm: float, y_mm: float) -> None:
    tip = np.array(_px(x_mm, y_mm), dtype=np.float64)
    radial = np.array([x_mm, -y_mm], dtype=np.float64)           # image y axis points down
    norm = np.linalg.norm(radial)
    direction = radial / norm if norm > 1e-6 else np.array([0.0, 1.0])
    normal = np.array([-direction[1], direction[0]])
    shaft_end = tip + direction * 70
    flight_end = shaft_end + direction * 34
    cv2.line(img, tuple(int(v) for v in tip), tuple(int(v) for v in shaft_end), _DART, 4)
    flight = np.array([shaft_end + normal * 3, shaft_end - normal * 3,
                       flight_end - normal * 14, flight_end + normal * 14], np.int32)
    cv2.fillPoly(img, [flight], _DART)


class SyntheticCamera:
    """Renders what a slightly off-axis camera would see."""

    _SRC = np.float32([[0, 0], [SIZE, 0], [SIZE, SIZE], [0, SIZE]])
    _DST = np.float32([[30, 40], [770, 10], [790, 760], [15, 790]])

    def __init__(self, noise_sigma: float = 1.5, seed: int | None = None):
        self.noise_sigma = noise_sigma
        self._rng = np.random.default_rng(seed)
        self._matrix = cv2.getPerspectiveTransform(self._SRC, self._DST)
        self.darts: list[tuple[float, float]] = []

    def add_dart(self, x_mm: float, y_mm: float) -> None:
        self.darts.append((x_mm, y_mm))

    def clear(self) -> None:
        self.darts.clear()

    def capture(self) -> np.ndarray:
        plane = _board_plane()
        for x, y in self.darts:
            _draw_dart(plane, x, y)
        frame = cv2.warpPerspective(plane, self._matrix, (SIZE, SIZE))
        if self.noise_sigma > 0:
            noise = self._rng.normal(0, self.noise_sigma, frame.shape)
            frame = np.clip(frame.astype(np.float32) + noise, 0, 255).astype(np.uint8)
        return frame

    def calibration_points_px(self, jitter_px: float = 0.0) -> list[tuple[float, float]]:
        pts = []
        for a in CALIBRATION_ANGLES_DEG:
            plane = np.float32([[[CENTRE[0] + SCALE * DOUBLE_OUTER_R * math.sin(math.radians(a)),
                                  CENTRE[1] - SCALE * DOUBLE_OUTER_R * math.cos(math.radians(a))]]])
            x, y = cv2.perspectiveTransform(plane, self._matrix)[0, 0]
            pts.append((float(x + self._rng.normal(0, jitter_px)) if jitter_px else float(x),
                        float(y + self._rng.normal(0, jitter_px)) if jitter_px else float(y)))
        return pts

    def calibration(self, jitter_px: float = 0.0) -> Calibration:
        return Calibration(self.calibration_points_px(jitter_px))
