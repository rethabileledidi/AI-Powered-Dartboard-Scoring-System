# AI-Powered Dart Board Scoring System - Backend

Computer-vision backend that turns dartboard camera input into scores. Two detection paths feed one X01 game engine + REST/WebSocket API: a **YOLOv8 webcam bridge** (live hardware) and an **OpenCV geometry pipeline** (calibration -> detection -> board coordinates; used by the simulator and CI).

```
app/core      pure rules: board geometry, X01 engine, checkout, stats
app/vision    calibration, detector, pipeline, synthetic camera
app/services  orchestration + WebSocket hub
app/api       REST/WebSocket routes        app/main.py  application factory
scripts/      yolo_bridge, demo_match, benchmark_vision, seed_demo, edge_camera_client, make_postman
tests/        83 tests (98% coverage of core/ + vision/)      docs/  architecture, walkthrough, functionality, roadmap, testing, demo script
```

## Quick start
```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m pytest -q                                    # run the test-suite
python -m scripts.demo_match --seed 4                  # full match through the vision pipeline (no server)
python -m scripts.benchmark_vision                     # accuracy numbers
python -m scripts.seed_demo                            # mock data: demo / demo-password
uvicorn app.main:app --reload                          # API + Swagger UI at http://localhost:8000/docs

# live webcam with the trained YOLO model (needs weights + extra deps)
pip install -r requirements-bridge.txt
python -m scripts.yolo_bridge --weights path/to/best.pt --game 1 --user demo --password demo-password --show
python -m scripts.yolo_bridge --weights path/to/best.pt --dry-run --show      # detect + print only, no API calls
```
Docker: `docker build -t dartboard . && docker run -p 8000:8000 -v darts:/data dartboard`

## API summary
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register`, `/api/auth/login` | JWT auth |
| POST/GET | `/api/games`, `/api/games/{id}` | create / read games |
| POST | `/api/games/{id}/throws` | manual score or correction (`label`, `multiplier+sector`, or `x_mm+y_mm`) |
| POST | `/api/games/{id}/throws/detected` | dart reported by the YOLO bridge (`label`, `confidence`; stored with `source=yolo`) |
| POST | `/api/games/{id}/takeout` | board cleared -> next player (idempotent) |
| POST | `/api/games/{id}/undo`, `/next-turn` | undo / hand over |
| GET | `/api/games/{id}/checkout` | finishing route |
| PUT | `/api/vision/calibration` | 4 pixel points: 20\|1, 6\|10, 3\|19, 11\|14 |
| POST | `/api/games/{id}/vision/baseline`, `/vision/frame` | raw JPEG/PNG body from the camera |
| POST | `/api/games/{id}/simulate` | virtual dart through the real pipeline (no hardware) |
| GET | `/api/stats/me`, `/api/leaderboard` | dashboard data |
| WS | `/ws/games/{id}?token=...` | live updates |
| GET | `/api/board/classify?x_mm=&y_mm=`, `/api/board/spec`, `/health` | utilities |

Config via env: `DARTS_DB`, `DARTS_JWT_SECRET` (**change in production**), `DARTS_JWT_TTL`, `DARTS_ALLOW_SIM`, `DARTS_CORS`, `DARTS_MAX_FRAME_BYTES` (upload limit, default 8 MB).

See `docs/` for diagrams (rubric items 1-2), code walkthrough, functionality, roadmap, testing, group-progress template and the video script.
