# Prototype Testing

| Type | Tooling | Where | Status |
|------|---------|-------|--------|
| Unit | `unittest` (pytest-compatible) | `tests/test_board.py, test_game.py, test_checkout.py, test_auth.py, test_vision.py, test_bridge.py` (YOLO class mapping + tracker) | passing |
| Integration (service <-> DB <-> vision) | unittest + SQLite in memory | `tests/test_service.py` | passing |
| Integration (HTTP + WebSocket) | FastAPI `TestClient` | `tests/test_api.py` |
| Integration (YOLO bridge <-> API <-> DB) | replayed detection streams through the real API | `tests/test_bridge.py` | passing | needs `pip install -r requirements.txt` |
| API integration | Postman / Newman | `docs/postman_collection.json` (`newman run docs/postman_collection.json`) | ready |
| Performance / accuracy | benchmark script | `python -m scripts.benchmark_vision` | simulation benchmark: ~97 % segment accuracy, ~1.3 mm mean error (YOLO model on real photos: mAP50 0.44 - see CURRENT_FUNCTIONALITY) |
| Usability | task walkthroughs with 3-5 users (start game, throw, correct a dart, read stats); feedback via Google Forms | to run on the physical rig | planned |
| Bug tracking | GitHub Issues with labels `severity:high/med/low`, `area:vision/api/engine` | repository Issues tab | set up |

Coverage of `core/` + `vision/`: run `python -m pytest --cov=app/core --cov=app/vision`.

Run everything: `python -m pytest -q`   (or `python -m unittest discover -s tests -t .`)
