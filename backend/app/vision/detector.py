"""Dart tip detection by background subtraction (classical computer vision).

Idea: compare the frame BEFORE the throw with the frame AFTER it. The only thing that
changed is the new dart. We isolate that blob, find its tip and score it.

Tip rule: with the camera on the board's optical axis, a dart's shaft/flight protrude
towards the camera and therefore project *radially outward* from the board centre.
The tip is hence the blob pixel closest to the projected bullseye.
"""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from .calibration import Calibration


@dataclass
class Detection:
    status: str                       # ok | no_change | obstruction | low_confidence
    tip_px: tuple[float, float] | None = None
    confidence: float = 0.0
    area_px: float = 0.0
    changed_fraction: float = 0.0


class DartDetector:
    def __init__(self, calibration: Calibration, diff_threshold: int = 40, min_area: int = 120,
                 max_changed_fraction: float = 0.12, min_confidence: float = 0.55):
        self.calibration = calibration
        self.diff_threshold = diff_threshold
        self.min_area = min_area
        self.max_changed_fraction = max_changed_fraction
        self.min_confidence = min_confidence
        self._open = np.ones((3, 3), np.uint8)

    def change_mask(self, before: np.ndarray, after: np.ndarray) -> np.ndarray:
        a = cv2.GaussianBlur(before, (5, 5), 0)
        b = cv2.GaussianBlur(after, (5, 5), 0)
        diff = cv2.absdiff(a, b).max(axis=2)
        mask = (diff > self.diff_threshold).astype(np.uint8) * 255
        return cv2.morphologyEx(mask, cv2.MORPH_OPEN, self._open)

    def detect(self, before: np.ndarray, after: np.ndarray) -> Detection:
        if before.shape != after.shape:
            raise ValueError("Frames must have identical dimensions")
        mask = self.change_mask(before, after)
        fraction = float(np.count_nonzero(mask)) / mask.size
        if fraction > self.max_changed_fraction:
            return Detection("obstruction", changed_fraction=fraction)   # hand / lighting change
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        if not contours:
            return Detection("no_change", changed_fraction=fraction)
        blob = max(contours, key=cv2.contourArea)
        area = float(cv2.contourArea(blob)) or float(len(blob))
        if area < self.min_area:
            return Detection("no_change", area_px=area, changed_fraction=fraction)

        pts = blob.reshape(-1, 2).astype(np.float64)
        cx, cy = self.calibration.center_px
        tip = pts[int(np.argmin(np.hypot(pts[:, 0] - cx, pts[:, 1] - cy)))]

        (_, _), (w, h), _ = cv2.minAreaRect(blob)
        aspect = max(w, h) / max(min(w, h), 1.0)
        elongation = min(1.0, aspect / 4.0)                   # darts are long and thin
        area_score = 1.0 if 200 <= area <= 6000 else max(0.0, 1 - abs(area - 3000) / 9000)
        confidence = round(0.65 * elongation + 0.35 * area_score, 3)
        status = "ok" if confidence >= self.min_confidence else "low_confidence"
        return Detection(status, (float(tip[0]), float(tip[1])), confidence, area, fraction)

    def board_is_clear(self, empty_reference: np.ndarray, frame: np.ndarray) -> bool:
        mask = self.change_mask(empty_reference, frame)
        return float(np.count_nonzero(mask)) / mask.size < 0.0015
