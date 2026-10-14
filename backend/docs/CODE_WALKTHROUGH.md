# Code Walkthrough  *(Rubric: Explanation of Hardware/Software Code 5)*

Suggested order for the video (about 2-3 minutes). File names are clickable in the repo.

| # | File | What to say |
|---|------|-------------|
| 1 | `app/core/board.py` | Official board radii; `classify_point(x,y)` converts polar geometry to a segment: radius picks the ring, angle `atan2(x,y)` shifted by 9 degrees picks one of 20 sectors from `SECTOR_ORDER`. Pure function, 100 % unit-tested (every one of the 62 segments round-trips). |
| 2 | `app/vision/calibration.py` | Four wire intersections (20/1, 6/10, 3/19, 11/14) on the outer double ring are clicked once. `cv2.getPerspectiveTransform` builds a homography so any camera angle maps to millimetres. Degenerate/collinear clicks are rejected. |
| 3 | `app/vision/detector.py` | Gaussian blur + `absdiff` between the frame before and after the throw, threshold, morphological opening, largest contour = the dart. Tip = contour pixel nearest the projected bullseye (shaft/flight project radially outward for an on-axis camera). Confidence = elongation (darts are long and thin) + plausible area. A huge change (hand, lighting) returns `obstruction` instead of a wrong score. |
| 4 | `app/vision/pipeline.py` | State machine: `baseline_set -> ok / low_confidence / no_change / obstruction / takeout`. Only `ok` is auto-scored. Board-clear detection (diff against the empty reference) = darts removed -> next player. |
| 5 | `app/core/game.py` | X01 engine: double-in/out, bust rules (over, leaves 1, non-double finish), reverts to turn start, snapshot stack for undo, JSON (de)serialisation so games survive restarts. |
| 6 | `app/core/checkout.py` | Exhaustive search over the 62 throws, fewest darts first, ranked by pro-style preferences (T20 set-ups, D20/D16/D8 finishes). `170 -> T20 T20 DB`. |
| 7 | `app/services/game_service.py` | The only place that touches engine + vision + database. `simulate()` renders a virtual dart, pushes it through the *real* pipeline, and scores it. |
| 8 | `app/api/routes.py`, `app/main.py` | Thin REST + WebSocket layer, JWT bearer auth, domain errors mapped to JSON `{error:{code,message}}`. Auto docs at `/docs`. |
| 9 | `scripts/edge_camera_client.py` | **Hardware side**: Raspberry Pi loop - capture, motion gate (wait until the scene is still for 0.6 s), POST JPEG to the backend. |
| 9b | `app/vision/yolo_bridge.py` + `scripts/yolo_bridge.py` | **YOLO hardware path.** `class_to_label` maps model classes (`triple_20`) to board labels (`T20`). `DartTracker` turns the noisy per-frame detections into events: ignore low confidence, require the same picture for N frames, reconcile each stable picture with the darts believed to be on the board - count-based, so a dart re-labelled as a neighbouring segment (T20 -> S20) is matched to the nearest known dart and a dart that fell out simply disappears - and score only the leftovers as new throws; emit `takeout` when the board is empty. The script loads the weights, reads the webcam, and POSTs events to `/throws/detected` and `/takeout`. Pure logic is unit-tested without a camera. |
| 9c | `app/services/game_service.py` -> `throw_detected`, `takeout` | Two small service methods behind the new endpoints: store the dart with `source=yolo` + confidence, and an idempotent hand-over when the board is cleared. |
| 10 | `tests/` | 83 tests: geometry, rules, checkout, calibration, vision (noise, hand-in-frame, take-out), YOLO bridge (mapping, tracker, end-to-end), services, auth, HTTP + WebSocket. |

## Model side (separate repository)
`Train.py` / `Webcam.py` / `data.yaml` and the trained weights live in the model repo. The bridge only needs the path to `best.pt` (`--weights`).

## Hardware configuration notes
* Webcam fixed in place beside the board at the same angle as the training photos - moving it degrades the model. Fix focus/exposure if the camera allows it.
* Even, glare-free lighting matches the training data best.
* The OpenCV geometry path (calibration, `/vision/frame`) assumes a camera near the board's axis; re-run calibration only if the camera or board is moved.
