import unittest

import numpy as np

from app.core.board import aim_point, throw_from_label
from app.vision.calibration import Calibration, CalibrationError
from app.vision.pipeline import VisionPipeline
from app.vision.synthetic import SyntheticCamera

SEGMENTS = ["T20", "D16", "S5", "T19", "D3", "S18", "SB", "DB", "T1", "D11", "S9", "T7", "D14"]


class CalibrationTests(unittest.TestCase):
    def test_round_trip_through_homography(self):
        cal = SyntheticCamera(seed=0).calibration()
        for x, y in ((0, 0), (50, 80), (-120, 40), (100, -100)):
            px = cal.board_to_pixel(x, y)
            bx, by = cal.pixel_to_board(*px)
            self.assertAlmostEqual(bx, x, delta=0.05)
            self.assertAlmostEqual(by, y, delta=0.05)

    def test_rejects_bad_points(self):
        with self.assertRaises(CalibrationError):
            Calibration([(0, 0), (1, 1), (2, 2)])
        with self.assertRaises(CalibrationError):
            Calibration([(10, 10), (11, 10), (10, 11), (11, 11)])        # tiny
        with self.assertRaises(CalibrationError):
            Calibration([(0, 0), (100, 100), (200, 200), (300, 300)])    # collinear
        with self.assertRaises(CalibrationError):
            Calibration([(0, 0), (float("nan"), 1), (5, 500), (500, 5)])


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.cam = SyntheticCamera(seed=7)
        self.pipe = VisionPipeline(self.cam.calibration(jitter_px=0.5))
        self.assertEqual(self.pipe.process(self.cam.capture()).status, "baseline_set")

    def test_scores_every_test_segment_sequentially(self):
        for label in SEGMENTS:
            x, y = aim_point(throw_from_label(label))
            self.cam.add_dart(x, y)
            r = self.pipe.process(self.cam.capture())
            self.assertEqual(r.status, "ok", label)
            self.assertEqual(r.throw.label, label)
            self.assertLess(np.hypot(r.x_mm - x, r.y_mm - y), 4.0, label)
            self.assertGreater(r.confidence, 0.75)
            if len(self.cam.darts) == 3:                 # player removes darts
                self.cam.clear()
                self.assertEqual(self.pipe.process(self.cam.capture()).status, "takeout")

    def test_unchanged_frame_is_ignored(self):
        self.assertEqual(self.pipe.process(self.cam.capture()).status, "no_change")

    def test_hand_in_frame_is_obstruction(self):
        frame = self.cam.capture()
        frame[100:700, 100:700] = (120, 160, 210)       # large skin-coloured region
        self.assertEqual(self.pipe.process(frame).status, "obstruction")

    def test_noise_only_does_not_trigger(self):
        noisy = SyntheticCamera(noise_sigma=6, seed=3)
        pipe = VisionPipeline(noisy.calibration())
        pipe.process(noisy.capture())
        for _ in range(5):
            self.assertEqual(pipe.process(noisy.capture()).status, "no_change")

    def test_detection_survives_noise(self):
        cam = SyntheticCamera(noise_sigma=5, seed=11)
        pipe = VisionPipeline(cam.calibration())
        pipe.process(cam.capture())
        x, y = aim_point(throw_from_label("T18"))
        cam.add_dart(x, y)
        r = pipe.process(cam.capture())
        self.assertEqual((r.status, r.throw.label), ("ok", "T18"))

    def test_miss_outside_board(self):
        self.cam.add_dart(125, 125)            # r = 177 mm, just outside the double ring
        r = self.pipe.process(self.cam.capture())
        self.assertEqual((r.status, r.throw.label), ("ok", "MISS"))


if __name__ == "__main__":
    unittest.main()
