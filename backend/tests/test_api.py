"""HTTP-level integration tests (needs: pip install -r requirements.txt)."""
import unittest

try:
    from fastapi.testclient import TestClient
    from app.config import Settings
    from app.main import create_app
    HAVE_FASTAPI = True
except ImportError:                      # core tests still run without the web stack
    HAVE_FASTAPI = False


@unittest.skipUnless(HAVE_FASTAPI, "fastapi/httpx not installed")
class ApiTests(unittest.TestCase):
    def setUp(self):
        app = create_app(Settings(db_path=":memory:", pbkdf2_iterations=1000, jwt_secret="t"))
        self.client = TestClient(app)
        r = self.client.post("/api/auth/register", json={"username": "alice", "password": "password123"})
        self.assertEqual(r.status_code, 201)
        self.h = {"Authorization": f"Bearer {r.json()['access_token']}"}
        g = self.client.post("/api/games", headers=self.h, json={"players": ["A", "B"], "start": 301})
        self.assertEqual(g.status_code, 201)
        self.gid = g.json()["id"]

    def test_health_and_public_board_endpoints(self):
        self.assertEqual(self.client.get("/health").json()["status"], "ok")
        self.assertEqual(self.client.get("/api/board/classify", params={"x_mm": 0, "y_mm": 103}).json()["label"], "T20")
        self.assertIn("radii_mm", self.client.get("/api/board/spec").json())

    def test_auth_required(self):
        self.assertEqual(self.client.get("/api/games").status_code, 401)
        self.assertEqual(self.client.get("/api/games", headers={"Authorization": "Bearer nope"}).status_code, 401)
        bad = self.client.post("/api/auth/login", json={"username": "alice", "password": "wrong-pass"})
        self.assertEqual(bad.status_code, 401)
        self.assertEqual(bad.json()["error"]["code"], "unauthorized")

    def test_validation_errors(self):
        self.assertEqual(self.client.post("/api/games", headers=self.h, json={"players": []}).status_code, 422)
        self.assertEqual(self.client.post("/api/games", headers=self.h,
                                          json={"players": ["A"], "start": 500}).status_code, 422)
        self.assertEqual(self.client.post(f"/api/games/{self.gid}/throws", headers=self.h, json={}).status_code, 422)
        self.assertEqual(self.client.post(f"/api/games/{self.gid}/throws", headers=self.h,
                                          json={"label": "Z99"}).status_code, 400)

    def test_manual_throw_undo_checkout(self):
        r = self.client.post(f"/api/games/{self.gid}/throws", headers=self.h, json={"label": "T20"})
        self.assertEqual(r.json()["outcome"]["remaining"], 241)
        self.assertEqual(self.client.get(f"/api/games/{self.gid}/checkout", headers=self.h).status_code, 200)
        self.assertEqual(self.client.post(f"/api/games/{self.gid}/undo", headers=self.h).json()["undone"], "throw")
        self.assertEqual(self.client.post(f"/api/games/{self.gid}/undo", headers=self.h).status_code, 409)

    def test_simulate_and_dashboard(self):
        r = self.client.post(f"/api/games/{self.gid}/simulate", headers=self.h, json={"x_mm": 0, "y_mm": 103})
        self.assertEqual(r.json()["outcome"]["throw"]["label"], "T20")
        self.assertEqual(self.client.get("/api/stats/me", headers=self.h).json()["darts_total"], 1)

    def test_other_users_cannot_access_game(self):
        r = self.client.post("/api/auth/register", json={"username": "mallory", "password": "password123"})
        h2 = {"Authorization": f"Bearer {r.json()['access_token']}"}
        self.assertEqual(self.client.get(f"/api/games/{self.gid}", headers=h2).status_code, 403)

    def test_websocket_receives_live_updates(self):
        token = self.h["Authorization"].split()[1]
        with self.client.websocket_connect(f"/ws/games/{self.gid}?token={token}") as ws:
            self.assertEqual(ws.receive_json()["type"], "snapshot")
            self.client.post(f"/api/games/{self.gid}/throws", headers=self.h, json={"label": "S20"})
            self.assertEqual(ws.receive_json()["type"], "throw")


    def test_oversized_frame_rejected(self):
        app = create_app(Settings(db_path=":memory:", pbkdf2_iterations=1000, jwt_secret="t", max_frame_bytes=1000))
        client = TestClient(app)
        r = client.post("/api/auth/register", json={"username": "bob_b", "password": "password123"})
        h = {"Authorization": f"Bearer {r.json()['access_token']}"}
        gid = client.post("/api/games", headers=h, json={"players": ["A"], "start": 301}).json()["id"]
        big = client.post(f"/api/games/{gid}/vision/frame", headers=h, content=b"x" * 5000)
        self.assertEqual(big.status_code, 413)
        self.assertEqual(big.json()["error"]["code"], "payload_too_large")


if __name__ == "__main__":
    unittest.main()
