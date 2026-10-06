"""Edge client for the Raspberry Pi / PC that has the camera (HARDWARE <-> BACKEND bridge).

Stdlib + OpenCV only. Workflow:
    1. python scripts/edge_camera_client.py --server http://BACKEND:8000 --user alice --password ... \\
           --game 1 --camera 0 --calibration 412,40 760,420 388,770 30,380
    2. With the board EMPTY, press ENTER -> baseline is uploaded.
    3. Throw. A frame is sent whenever the image has been still for ~0.6 s after movement.
"""
import argparse
import json
import time
import urllib.error
import urllib.request

import cv2
import numpy as np


def call(method, url, token=None, body=None, content_type="application/json"):
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", content_type)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as err:
        raise SystemExit(f"HTTP {err.code}: {err.read().decode()}")


def jpeg(frame) -> bytes:
    return cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 92])[1].tobytes()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--server", default="http://localhost:8000")
    ap.add_argument("--user", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--game", type=int, required=True)
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--calibration", nargs=4, help="four x,y pixel pairs: 20|1 6|10 3|19 11|14")
    args = ap.parse_args()

    login = call("POST", f"{args.server}/api/auth/login", body={"username": args.user, "password": args.password})
    token = login["access_token"]
    if args.calibration:
        pts = [[float(v) for v in p.split(",")] for p in args.calibration]
        call("PUT", f"{args.server}/api/vision/calibration", token, {"points": pts})
        print("calibration saved")

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        raise SystemExit("cannot open camera")
    input("Clear the board and press ENTER to capture the baseline... ")
    ok, frame = cap.read()
    print(call("POST", f"{args.server}/api/games/{args.game}/vision/baseline", token, jpeg(frame), "image/jpeg"))

    prev, still_since, moving = None, None, False
    while True:
        ok, frame = cap.read()
        if not ok:
            continue
        gray = cv2.GaussianBlur(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (9, 9), 0)
        if prev is not None:
            motion = float(np.mean(cv2.absdiff(prev, gray)))
            if motion > 2.0:
                moving, still_since = True, None
            elif moving:
                still_since = still_since or time.time()
                if time.time() - still_since > 0.6:        # scene settled -> analyse
                    res = call("POST", f"{args.server}/api/games/{args.game}/vision/frame", token, jpeg(frame), "image/jpeg")
                    print(res["vision"]["status"], (res.get("outcome") or {}).get("throw", {}).get("label", ""))
                    moving, still_since = False, None
        prev = gray


if __name__ == "__main__":
    main()
