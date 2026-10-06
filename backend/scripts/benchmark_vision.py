"""Measures the vision pipeline on randomly placed darts (segment accuracy + tip error)."""
import argparse
import math
import random
import statistics

from app.core.board import classify_point, DOUBLE_OUTER_R
from app.vision.pipeline import VisionPipeline
from app.vision.synthetic import SyntheticCamera


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--darts", type=int, default=300)
    ap.add_argument("--noise", type=float, default=2.0)
    ap.add_argument("--jitter", type=float, default=0.5, help="calibration click error (px)")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    cam = SyntheticCamera(noise_sigma=args.noise, seed=args.seed)
    pipe = VisionPipeline(cam.calibration(jitter_px=args.jitter))
    pipe.process(cam.capture())
    correct = detected = total = 0
    errors: list[float] = []
    for i in range(args.darts):
        while True:                              # uniform on the scoring area
            x, y = rng.uniform(-165, 165), rng.uniform(-165, 165)
            if math.hypot(x, y) <= DOUBLE_OUTER_R - 3:
                break
        truth = classify_point(x, y)
        cam.add_dart(x, y)
        r = pipe.process(cam.capture())
        total += 1
        if r.status == "ok":
            detected += 1
            errors.append(math.hypot(r.x_mm - x, r.y_mm - y))
            correct += r.throw.label == truth.label
        if (i + 1) % 3 == 0:
            cam.clear()
            pipe.process(cam.capture())
    print(f"darts={total} detected={detected} ({100*detected/total:.1f}%)")
    print(f"segment accuracy (of detected) = {100*correct/max(detected,1):.1f}%")
    print(f"tip error mm: mean={statistics.mean(errors):.2f} median={statistics.median(errors):.2f} "
          f"p95={sorted(errors)[int(.95*len(errors))]:.2f} max={max(errors):.2f}")


if __name__ == "__main__":
    main()
