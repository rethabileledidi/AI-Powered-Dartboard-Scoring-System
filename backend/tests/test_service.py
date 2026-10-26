import unittest

import cv2

from app.config import Settings
from app.core.stats import summarise
from app.db import Repository
from app.errors import AuthError, Conflict, DomainError, Forbidden, NotFound
from app.services.game_service import GameService
from app.vision.synthetic import SyntheticCamera


def make_service():
    return GameService(Repository(), Settings(pbkdf2_iterations=1000, jwt_secret="test"))


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.s = make_service()
        self.alice = self.s.register("alice", "password123")["user"]
        self.game = self.s.create_game(self.alice, ["Alice", "Bob"], 301)

    # ---- auth
    def test_register_login_and_token(self):
        tok = self.s.login("ALICE", "password123")["access_token"]      # case-insensitive username
        self.assertEqual(self.s.user_from_token(tok)["username"], "alice")
        with self.assertRaises(AuthError):
            self.s.login("alice", "wrong-password")
        with self.assertRaises(Conflict):
            self.s.register("Alice", "password123")
        with self.assertRaises(DomainError):
            self.s.register("a", "password123")
        with self.assertRaises(DomainError):
            self.s.register("bobby", "short")
        with self.assertRaises(AuthError):
            self.s.user_from_token("garbage")

    # ---- manual play & persistence
    def test_manual_throws_persist_and_rotate(self):
        gid = self.game["id"]
        for lab in ("T20", "T20", "T20"):
            res = self.s.throw_manual(self.alice, gid, label=lab)
        self.assertTrue(res["outcome"]["turn_complete"])
        view = self.s.get_game(self.alice, gid)
        self.assertEqual(view["current_player"], "Bob")
        self.assertEqual(view["players"][0]["remaining"], 121)
        self.assertEqual(len(self.s.list_throws(self.alice, gid)), 3)

    def test_coordinate_and_multiplier_entry(self):
        gid = self.game["id"]
        self.assertEqual(self.s.throw_manual(self.alice, gid, x_mm=0, y_mm=103)["outcome"]["throw"]["label"], "T20")
        self.assertEqual(self.s.throw_manual(self.alice, gid, multiplier=2, sector=25)["outcome"]["throw"]["label"], "DB")
        with self.assertRaises(DomainError):
            self.s.throw_manual(self.alice, gid, label="Q9")
        with self.assertRaises(DomainError):
            self.s.throw_manual(self.alice, gid, multiplier=3, sector=25)
        with self.assertRaises(DomainError):
            self.s.throw_manual(self.alice, gid)

    def test_undo_removes_db_row(self):
        gid = self.game["id"]
        self.s.throw_manual(self.alice, gid, label="S20")
        self.s.undo(self.alice, gid)
        self.assertEqual(self.s.list_throws(self.alice, gid), [])
        with self.assertRaises(Conflict):
            self.s.undo(self.alice, gid)

    def test_next_turn_then_undo_keeps_throw_rows(self):
        gid = self.game["id"]
        self.s.throw_manual(self.alice, gid, label="S20")
        self.s.next_turn(self.alice, gid)
        self.assertEqual(self.s.undo(self.alice, gid)["undone"], "end_turn")
        self.assertEqual(len(self.s.list_throws(self.alice, gid)), 1)

    def test_authorisation(self):
        bob = self.s.register("bobby", "password123")["user"]
        with self.assertRaises(Forbidden):
            self.s.get_game(bob, self.game["id"])
        with self.assertRaises(NotFound):
            self.s.get_game(self.alice, 9999)

    # ---- vision
    def test_simulated_game_runs_to_completion_through_vision(self):
        gid, last = self.game["id"], None
        for _ in range(200):
            last = self.s.simulate(self.alice, gid, sigma_mm=8)
            if last["game"]["status"] == "finished":
                break
        self.assertEqual(last["game"]["status"], "finished")
        self.assertIsNotNone(last["game"]["winner"])
        rows = self.s.list_throws(self.alice, gid)
        self.assertTrue(all(r["source"] == "vision" for r in rows))
        with self.assertRaises(Conflict):
            self.s.simulate(self.alice, gid)

    def test_simulate_exact_coordinates_score_correctly(self):
        res = self.s.simulate(self.alice, self.game["id"], x_mm=0, y_mm=103)
        self.assertEqual(res["outcome"]["throw"]["label"], "T20")
        self.assertEqual(res["vision"]["status"], "ok")

    def test_real_frame_upload_flow(self):
        gid = self.game["id"]
        cam = SyntheticCamera(seed=5)
        with self.assertRaises(Conflict):                       # not calibrated yet
            self.s.vision_baseline(self.alice, gid, b"x")
        self.s.save_calibration(self.alice, [list(p) for p in cam.calibration_points_px()])
        jpg = lambda f: cv2.imencode(".png", f)[1].tobytes()
        self.assertEqual(self.s.vision_baseline(self.alice, gid, jpg(cam.capture()))["status"], "baseline_set")
        cam.add_dart(0, 103)
        res = self.s.vision_frame(self.alice, gid, jpg(cam.capture()))
        self.assertEqual(res["outcome"]["throw"]["label"], "T20")
        cam.clear()                                             # darts pulled out mid-turn
        res = self.s.vision_frame(self.alice, gid, jpg(cam.capture()))
        self.assertEqual(res["vision"]["status"], "takeout")
        self.assertEqual(res["game"]["current_player"], "Bob")
        with self.assertRaises(DomainError):
            self.s.vision_frame(self.alice, gid, b"not an image")

    def test_calibration_validation(self):
        with self.assertRaises(DomainError):
            self.s.save_calibration(self.alice, [[0, 0], [1, 1], [2, 2], [3, 3]])
        with self.assertRaises(NotFound):
            self.s.get_calibration(self.alice)

    # ---- stats
    def test_statistics(self):
        gid = self.game["id"]
        for lab in ("T20", "T20", "T20"):
            self.s.throw_manual(self.alice, gid, label=lab)       # Alice 180
        for lab in ("S1", "S1", "S1"):
            self.s.throw_manual(self.alice, gid, label=lab)       # Bob 3
        dash = self.s.dashboard(self.alice)
        alice = next(p for p in dash["players"] if p["player"] == "Alice")
        self.assertEqual(alice["count_180"], 1)
        self.assertEqual(alice["three_dart_average"], 180.0)
        self.assertEqual(alice["highest_visit"], 180)
        self.assertEqual(dash["darts_total"], 6)
        self.assertTrue(self.s.leaderboard())

    def test_summarise_busts_and_checkout(self):
        row = lambda **k: {"game_id": 1, "turn_no": 1, "label": "S1", "scored": 0, "bust": 0, "is_win": 0, **k}
        rows = [row(turn_no=1, scored=60, label="T20"), row(turn_no=1, scored=60, label="T20"),
                row(turn_no=1, scored=0, bust=1, label="T20"),
                row(turn_no=2, scored=40, is_win=1, label="D20")]
        s = summarise(rows)
        self.assertEqual((s["busts"], s["best_checkout"], s["visits"]), (1, 40, 2))
        self.assertEqual(s["highest_visit"], 40)       # busted visit never counts as highest


if __name__ == "__main__":
    unittest.main()
