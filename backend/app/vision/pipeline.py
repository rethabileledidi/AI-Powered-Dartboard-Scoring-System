"""Frame-by-frame vision pipeline: baseline -> detect -> map to board -> score."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ..core.board import Throw, classify_point
from .calibration import Calibration
from .detector import DartDetector


@dataclass
class PipelineResult:
    status: str     # baseline_set | ok | low_confidence | no_change | obstruction | takeout
    throw: Throw | None = None
    x_mm: float | None = None
    y_mm: float | None = None
    confidence: float = 0.0
    tip_px: tuple[float, float] | None = None
    needs_review: bool = False

    def to_dict(self) -> dict:
        return {"status": self.status, "throw": self.throw.to_dict() if self.throw else None,
                "x_mm": None if self.x_mm is None else round(self.x_mm, 2),
                "y_mm": None if self.y_mm is None else round(self.y_mm, 2),
                "confidence": self.confidence, "tip_px": self.tip_px,
                "needs_review": self.needs_review}


class VisionPipeline:
    REVIEW_BELOW = 0.75    # accepted but flagged for the UI to highlight

    def __init__(self, calibration: Calibration, detector: DartDetector | None = None):
        self.calibration = calibration
        self.detector = detector or DartDetector(calibration)
        self.empty_reference: np.ndarray | None = None
        self.baseline: np.ndarray | None = None
        self.darts_on_board = 0

    @property
    def ready(self) -> bool:
        return self.baseline is not None

    def set_baseline(self, empty_board_frame: np.ndarray) -> PipelineResult:
        self.empty_reference = empty_board_frame.copy()
        self.baseline = empty_board_frame.copy()
        self.darts_on_board = 0
        return PipelineResult("baseline_set")

    def process(self, frame: np.ndarray) -> PipelineResult:
        if self.baseline is None or self.empty_reference is None:
            return self.set_baseline(frame)
        if self.darts_on_board and self.detector.board_is_clear(self.empty_reference, frame):
            self.baseline, self.darts_on_board = frame.copy(), 0
            return PipelineResult("takeout")
        det = self.detector.detect(self.baseline, frame)
        if det.status in ("no_change", "obstruction"):
            return PipelineResult(det.status)
        x, y = self.calibration.pixel_to_board(*det.tip_px)
        throw = classify_point(x, y)
        if det.status == "low_confidence":
            return PipelineResult("low_confidence", throw, x, y, det.confidence, det.tip_px, True)
        self.baseline = frame.copy()
        self.darts_on_board += 1
        return PipelineResult("ok", throw, x, y, det.confidence, det.tip_px,
                              det.confidence < self.REVIEW_BELOW)
