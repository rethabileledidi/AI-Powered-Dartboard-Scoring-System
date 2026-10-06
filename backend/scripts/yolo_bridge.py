"""YOLO webcam -> game API bridge (HARDWARE <-> BACKEND for the trained model).

Usage (needs:  pip install -r requirements-bridge.txt  -> ultralytics + torch):

    python -m scripts.yolo_bridge --server http://localhost:8000 --user alice --password ... \
        --game 1 --weights path/to/best.pt --source 0

  --source 0            first webcam  (or a video file / image-sequence path for an offline test)
  --dry-run             detect and print events but do NOT call the API
  --show                preview window with the detections (press q to quit)
  --bullseye-as SB|DB   how to score the dataset's single 'bullseye' class (default DB)
  --conf 0.5            minimum confidence;  --stable 5  frames the picture must stay identical
"""
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request

from app.vision.yolo_bridge import DartTracker, class_to_label, dispatch


def api_call(server: str, method: str, path: str, token: str | None = None, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(server + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--server", default="http://localhost:8000")
    ap.add_argument("--user")
    ap.add_argument("--password")
    ap.add_argument("--game", type=int)
    ap.add_argument("--weights", required=True, help="path to the trained best.pt")
    ap.add_argument("--source", default="0", help="camera index or video file")
    ap.add_argument("--conf", type=float, default=0.5)
    ap.add_argument("--stable", type=int, default=5)
    ap.add_argument("--bullseye-as", choices=["SB", "DB"], default="DB")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--show", action="store_true")
    args = ap.parse_args()
    if not args.dry_run and not (args.user and args.password and args.game):
        ap.error("--user, --password and --game are required unless --dry-run is used")

    import cv2                                   # imported late so `--help` and tests stay light
    from ultralytics import YOLO

    model = YOLO(args.weights)
    names = model.names
    src = int(args.source) if args.source.isdigit() else args.source
    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        raise SystemExit(f"cannot open video source {args.source!r}")

    token = None
    if not args.dry_run:
        token = api_call(args.server, "POST", "/api/auth/login",
                         body={"username": args.user, "password": args.password})["access_token"]

    def post(path: str, body: dict | None):
        if args.dry_run:
            return None
        try:
            return api_call(args.server, "POST", path, token, body)
        except urllib.error.HTTPError as err:       # keep running: one bad call must not stop the demo
            print(f"  ! API {err.code}: {err.read().decode()[:200]}")

    tracker = DartTracker(min_conf=args.conf, stable_frames=args.stable)
    unknown: set[str] = set()
    print("Bridge running. Clear the board first; press q in the preview window to quit.")
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        result = model(frame, conf=args.conf, verbose=False)[0]
        dets = []
        for box in result.boxes:
            name = names[int(box.cls[0])]
            label = class_to_label(name, args.bullseye_as)
            if label is None:
                if name not in unknown:
                    unknown.add(name)
                    print(f"  (ignoring unmapped class {name!r})")
                continue
            dets.append((label, float(box.conf[0])))
        for line in dispatch(tracker.update(dets), post, args.game or 0):
            print(line)
        if args.show:
            cv2.imshow("YOLO dart bridge", result.plot())
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
