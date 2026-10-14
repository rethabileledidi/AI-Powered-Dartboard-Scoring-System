# Video Demo Script (~6 min)  *(maps 1:1 to the 40-mark rubric)*

| Time | Show | Rubric line |
|------|------|-------------|
| 0:00-0:30 | Title card, team, one-sentence problem: manual dart scoring is slow and error-prone | Lecturer discretion (3) |
| 0:30-1:15 | **docs/ARCHITECTURE.md** diagrams 1 + 3 (network schematic, UML) | System Architecture (5) |
| 1:15-1:45 | Diagram 2: hardware + software stack; physical rig on camera | Technology Stack (5) |
| 1:45-3:45 | **Live demo** - `uvicorn app.main:app`, open `/docs`; register, create game; run `python -m scripts.yolo_bridge --weights best.pt --game 1 ...` (webcam preview with detections); throw real darts -> scoreboard updates over WebSocket; pull darts -> next player; show a checkout hint, a bust, an undo, a throw with `source=yolo` + confidence, then `/api/stats/me` | Prototype Demo (10) |
| 3:45-5:00 | Code tour using **docs/CODE_WALKTHROUGH.md** (board -> calibration -> detector -> engine -> edge client) | Code Explanation (5) |
| 5:00-5:40 | `python -m pytest -q` green + benchmark numbers + what works (docs/CURRENT_FUNCTIONALITY.md) | Current Functionality (5) |
| 5:40-6:10 | Roadmap table (docs/ROADMAP.md) | Improvements & Next Steps (3) |
| 6:10-6:30 | Commit graph, Kanban board, who built what | Group Progress (4) |

Tips: record at 1080p, use a clean terminal font >= 18 pt, rehearse once, and keep a fallback: `python -m scripts.demo_match` (OpenCV geometry path, no hardware) or `--source clip.mp4` / `--dry-run` on a recorded clip if the camera misbehaves. Be upfront that the YOLO model is prototype quality (see CURRENT_FUNCTIONALITY) - a clear plan to improve it earns the Improvements marks.
