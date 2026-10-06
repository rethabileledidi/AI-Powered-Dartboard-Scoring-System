"""Camera calibration: image pixels <-> board-plane millimetres via a homography.

The operator (or the edge client) supplies the pixel positions of four reference wire
intersections on the OUTER edge of the double ring, in this order:

    1) between 20 and 1   (9 deg clockwise from top)
    2) between 6 and 10   (99 deg)
    3) between 3 and 19   (189 deg)
    4) between 11 and 14  (279 deg)

Four well-spread points give a perspective transform that corrects any camera angle.
"""
from __future__ import annotations

import math

import cv2
import numpy as np

from ..core.board import DOUBLE_OUTER_R

CALIBRATION_ANGLES_DEG = (9.0, 99.0, 189.0, 279.0)
CALIBRATION_LABELS = ("20|1", "6|10", "3|19", "11|14")


class CalibrationError(ValueError):
    pass


def reference_board_points() -> list[tuple[float, float]]:
    return [(DOUBLE_OUTER_R * math.sin(math.radians(a)),
             DOUBLE_OUTER_R * math.cos(math.radians(a))) for a in CALIBRATION_ANGLES_DEG]


class Calibration:
    def __init__(self, image_points: list[tuple[float, float]]):
        pts = np.asarray(image_points, dtype=np.float32)
        if pts.shape != (4, 2):
            raise CalibrationError("Exactly four (x, y) calibration points are required")
        if not np.isfinite(pts).all():
            raise CalibrationError("Calibration points must be finite numbers")
        hull = cv2.convexHull(pts)
        if len(hull) < 4 or cv2.contourArea(hull) < 1000:
            raise CalibrationError("Calibration points are degenerate (too close or collinear)")
        self.image_points = [(float(x), float(y)) for x, y in pts]
        board = np.asarray(reference_board_points(), dtype=np.float32)
        self._to_board = cv2.getPerspectiveTransform(pts, board)
        self._to_pixel = cv2.getPerspectiveTransform(board, pts)

    def pixel_to_board(self, px: float, py: float) -> tuple[float, float]:
        out = cv2.perspectiveTransform(np.array([[[px, py]]], dtype=np.float32), self._to_board)
        return float(out[0, 0, 0]), float(out[0, 0, 1])

    def board_to_pixel(self, x_mm: float, y_mm: float) -> tuple[float, float]:
        out = cv2.perspectiveTransform(np.array([[[x_mm, y_mm]]], dtype=np.float32), self._to_pixel)
        return float(out[0, 0, 0]), float(out[0, 0, 1])

    @property
    def center_px(self) -> tuple[float, float]:
        return self.board_to_pixel(0.0, 0.0)
