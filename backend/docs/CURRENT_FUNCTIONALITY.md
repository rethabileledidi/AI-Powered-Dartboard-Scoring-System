# Current Functionality  *(Rubric: Current Functionality 5)*

## Working now (verified by automated tests - 83 tests, run `python -m pytest -q`)

| Area | Feature | Evidence |
|------|---------|----------|
| Auth | Register / login, PBKDF2 hashing, JWT (expiry, tamper and `alg=none` rejection), per-user game ownership | `tests/test_auth.py`, `test_service.py`, `test_api.py` |
| Board | All 62 segments + miss scored from mm coordinates; label parsing | `tests/test_board.py` |
| Vision | 4-point homography calibration; dart detection via background subtraction; confidence scoring; hand/lighting obstruction guard; take-out detection | `tests/test_vision.py` |
| Accuracy | **Simulation benchmark - 300 random darts, 100 % detected, 96.7 % exact segment, mean tip error 1.27 mm (p95 1.7 mm)** under sensor noise and calibration jitter (misses are darts within ~2 mm of a wire) | `python -m scripts.benchmark_vision` |
| Game | X01 301-1001, double-in / double-out, bust rules, undo, early end-of-turn, win detection, checkout suggestions (1-3 darts) | `tests/test_game.py`, `test_checkout.py` |
| Persistence | SQLite; game state survives restarts; every dart stored with source (`vision`/`manual`), confidence and coordinates | `tests/test_service.py` |
| Stats | 3-dart average, first-9 average, highest visit, 100+/140+/180 counts, busts, best checkout, favourite segments, leaderboard | `tests/test_service.py` |
| Realtime | WebSocket push of every throw/undo/turn change | `tests/test_api.py` |
| Demo | `/simulate` drives the whole pipeline with a synthetic camera - no hardware needed | `python -m scripts.demo_match` |
| Hardware bridge (OpenCV path) | Edge client uploads frames from a real camera | `scripts/edge_camera_client.py` |
| Hardware bridge (YOLO path) | Webcam -> trained YOLOv8 segment model -> confidence filter + stability tracker -> `POST /throws/detected` and `/takeout`; every throw stored with `source=yolo` and confidence | `scripts/yolo_bridge.py`, `app/vision/yolo_bridge.py`, `tests/test_bridge.py` (class mapping, tracker rules, full simulated session through the real API) |
| QA | Postman collection, GitHub Actions CI | `docs/postman_collection.json`, `.github/workflows/ci.yml` |

## YOLO model (team-trained) - measured results
| Item | Value |
|------|-------|
| Task | Detect which of 57 board-segment classes each dart is in (single / double / triple 1-20, bullseye, miss) |
| Data | Roboflow dataset v5: 507 images (450 train / 40 val / 17 test), photos from a side-angle webcam, 3 augmented copies per source image |
| Validation (final epoch 50) | mAP50 0.44, precision 0.66, recall 0.41 (best mAP50 0.46 at epoch 30) |
| Status | **Prototype quality** - detects roughly 4 in 10 darts reliably; this is why the bridge only scores stable, high-confidence detections and manual correction / undo stay available |

## Known limitations (be upfront - it earns marks under "Improvements")
* Single camera: darts that overlap/obscure each other, or lean heavily, can mis-locate the tip.
* Detection is classical CV (no neural network yet); accuracy was measured on the synthetic rig - real-board numbers to be collected in the next sprint.
* Only X01 is implemented (Cricket/Around-the-Clock planned).
* Vision baselines live in memory (a server restart needs a new baseline upload).
* Hardware integration is still to be validated on the physical rig; accuracy figures come from the synthetic camera.
* YOLO model: the class list has no `single_2`, `single_19`, `triple_4`, `triple_10`, `triple_11`, `triple_14` or outer bull, and `single_11` has no training examples, so those scores can never be produced by the model yet (see roadmap).
* The dataset has one `bullseye` class; the bridge scores it as DB (50) by default (`--bullseye-as SB` changes it).
* The YOLO bridge is tested with replayed detection streams, not yet end-to-end with a live board.
* Tracker limit: if a dart falls out and a new one lands within about two sectors of it before the picture settles, that is indistinguishable from re-labelling and the new dart is missed (use manual entry / undo; `max_drift` is configurable).
