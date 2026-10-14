"""YOLO bridge: class mapping, frame-stream tracker, and an end-to-end run against the real API."""
import unittest

from app.vision.yolo_bridge import BridgeEvent, DartTracker, class_to_label, dispatch, label_distance

try:
    from fastapi.testclient import TestClient
    from app.config import Settings
    from app.main import create_app
    HAVE_FASTAPI = True
except ImportError:
    HAVE_FASTAPI = False


def feed(tracker, frames):
    """frames: list of detection lists; returns all events produced."""
    out = []
    for dets in frames:
        out += tracker.update(dets)
    return out


class ClassMappingTests(unittest.TestCase):
    def test_standard_classes(self):
        self.assertEqual(class_to_label("triple_20"), "T20")
        self.assertEqual(class_to_label("double_16"), "D16")
        self.assertEqual(class_to_label("single_5"), "S5")
        self.assertEqual(class_to_label("miss"), "MISS")

    def test_bullseye_is_configurable(self):
        self.assertEqual(class_to_label("bullseye"), "DB")
        self.assertEqual(class_to_label("bullseye", "SB"), "SB")

    def test_unmappable_classes_are_ignored(self):
        for bad in ("tdouble_19", "triple_21", "single_0", "double_x", "dart", ""):
            self.assertIsNone(class_to_label(bad), bad)

    def test_every_mapped_label_is_accepted_by_the_engine(self):
        from app.core.game import parse_throw
        for n in range(1, 21):
            for prefix in ("single", "double", "triple"):
                parse_throw(class_to_label(f"{prefix}_{n}"))        # must not raise


class TrackerTests(unittest.TestCase):
    def setUp(self):
        self.t = DartTracker(min_conf=0.5, stable_frames=3)

    def test_needs_a_stable_picture_before_scoring(self):
        ev = feed(self.t, [[("T20", 0.9)], [("T20", 0.9)]])
        self.assertEqual(ev, [])
        ev = feed(self.t, [[("T20", 0.9)]])
        self.assertEqual([e.label for e in ev], ["T20"])

    def test_dart_is_scored_once_however_long_it_stays(self):
        ev = feed(self.t, [[("T20", 0.9)]] * 30)
        self.assertEqual(len(ev), 1)

    def test_flicker_never_scores(self):
        frames = [[("T20", 0.9)], [("S1", 0.9)]] * 10
        self.assertEqual(feed(self.t, frames), [])

    def test_low_confidence_is_ignored(self):
        self.assertEqual(feed(self.t, [[("T20", 0.3)]] * 10), [])

    def test_second_dart_scores_only_the_new_one(self):
        feed(self.t, [[("T20", 0.9)]] * 3)
        ev = feed(self.t, [[("T20", 0.9), ("S5", 0.8)]] * 3)
        self.assertEqual([e.label for e in ev], ["S5"])

    def test_two_darts_in_same_segment_both_count(self):
        feed(self.t, [[("T20", 0.9)]] * 3)
        ev = feed(self.t, [[("T20", 0.9), ("T20", 0.8)]] * 3)
        self.assertEqual([e.label for e in ev], ["T20"])
        self.assertEqual(self.t.accepted["T20"], 2)

    def test_label_drift_does_not_rescore_a_dart(self):
        feed(self.t, [[("T20", 0.9)]] * 3)
        ev = feed(self.t, [[("S20", 0.9)]] * 3)       # same single dart, classified as a neighbour
        self.assertEqual(ev, [])

    def test_takeout_after_empty_board_then_next_turn_scores_again(self):
        feed(self.t, [[("T20", 0.9)]] * 3)
        ev = feed(self.t, [[]] * 3)
        self.assertEqual(ev, [BridgeEvent("takeout")])
        ev = feed(self.t, [[("T20", 0.9)]] * 3)
        self.assertEqual([e.label for e in ev], ["T20"])

    def test_empty_board_at_start_is_silent(self):
        self.assertEqual(feed(self.t, [[]] * 10), [])

    def test_darts_already_on_board_at_start_are_adopted_not_scored(self):
        ev = feed(self.t, [[("T20", .9), ("S1", .9), ("D5", .9), ("S7", .9)]] * 3)
        self.assertEqual(ev, [])
        self.assertEqual(sum(self.t.accepted.values()), 4)

    def test_simultaneous_new_darts_ordered_by_confidence(self):
        ev = feed(self.t, [[("S1", 0.6), ("T20", 0.95)]] * 3)
        self.assertEqual([e.label for e in ev], ["T20", "S1"])


class TrackerRegressionTests(unittest.TestCase):
    """Bugs found in review: label drift and fallen-out darts must not corrupt later scoring."""

    def setUp(self):
        self.t = DartTracker(min_conf=0.5, stable_frames=3)

    def labels(self, frames):
        return [e.label for e in feed(self.t, frames) if e.kind == "throw"]

    def test_drifted_label_then_new_dart_scores_the_new_dart(self):
        self.assertEqual(self.labels([[("T20", .9)]] * 3), ["T20"])
        self.assertEqual(self.labels([[("S20", .95)]] * 3), [])                  # same dart, re-labelled
        # S20 is the MORE confident label, but D5 is the genuinely new dart
        self.assertEqual(self.labels([[("S20", .95), ("D5", .7)]] * 3), ["D5"])

    def test_drift_to_neighbouring_sector_then_new_dart(self):
        self.labels([[("T20", .9)]] * 3)
        self.assertEqual(self.labels([[("T1", .9)]] * 3), [])                    # adjacent sector
        self.assertEqual(self.labels([[("T1", .9), ("D16", .8)]] * 3), ["D16"])

    def test_dart_falls_out_then_new_dart_is_still_scored(self):
        self.assertEqual(self.labels([[("T20", .9)]] * 3 + [[("T20", .9), ("S5", .8)]] * 3), ["T20", "S5"])
        self.assertEqual(self.labels([[("T20", .9)]] * 3), [])                   # S5 fell out
        self.assertEqual(sum(self.t.accepted.values()), 1)                       # belief shrinks with the board
        self.assertEqual(self.labels([[("T20", .9), ("D10", .8)]] * 3), ["D10"])

    def test_one_falls_out_and_a_new_one_lands_far_away_in_one_step(self):
        self.labels([[("T20", .9)]] * 3 + [[("T20", .9), ("S5", .8)]] * 3)
        # S5 gone and D10 arrives before the picture settles: same count, but D10 is too far from S5
        self.assertEqual(self.labels([[("T20", .9), ("D10", .8)]] * 3), ["D10"])

    def test_dart_that_keeps_changing_label_never_scores_twice(self):
        self.labels([[("T20", .9)]] * 3)
        for lab in ("S20", "T20", "S1", "T20", "D20"):
            self.assertEqual(self.labels([[(lab, .9)]] * 3), [], lab)

    def test_takeout_still_works_after_darts_fell_out(self):
        self.labels([[("T20", .9)]] * 3 + [[("T20", .9), ("S5", .8)]] * 3 + [[("T20", .9)]] * 3)
        self.assertEqual(feed(self.t, [[]] * 3), [BridgeEvent("takeout")])

    def test_label_distance(self):
        self.assertEqual(label_distance("T20", "T20"), 0)
        self.assertEqual(label_distance("T20", "S20"), 0.5)
        self.assertEqual(label_distance("T20", "T1"), 1.0)
        self.assertEqual(label_distance("T20", "T5"), 1.0)           # 5 is next to 20 around the board
        self.assertGreater(label_distance("T20", "D3"), 2.0)
        self.assertEqual(label_distance("SB", "DB"), 0.5)
        self.assertGreater(label_distance("DB", "T20"), 2.0)
        self.assertGreater(label_distance("MISS", "S1"), 2.0)


@unittest.skipUnless(HAVE_FASTAPI, "fastapi/httpx not installed")
class BridgeEndToEndTests(unittest.TestCase):
    """Simulated webcam session -> tracker -> dispatch -> real API -> game state."""

    def setUp(self):
        app = create_app(Settings(db_path=":memory:", pbkdf2_iterations=1000, jwt_secret="t"))
        self.client = TestClient(app)
        r = self.client.post("/api/auth/register", json={"username": "alice", "password": "password123"})
        self.h = {"Authorization": f"Bearer {r.json()['access_token']}"}
        self.gid = self.client.post("/api/games", headers=self.h,
                                    json={"players": ["A", "B"], "start": 301}).json()["id"]

    def post(self, path, body):
        r = self.client.post(path, headers=self.h, **({"json": body} if body is not None else {}))
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def test_full_turn_through_the_real_api(self):
        t = DartTracker(min_conf=0.5, stable_frames=3)
        board = [("T20", .9)]
        for dets in ([board] * 3, [board + [("S5", .8)]] * 3, [board + [("S5", .8), ("D10", .7)]] * 3, [[]] * 3):
            dispatch(feed(t, dets), self.post, self.gid)
        game = self.client.get(f"/api/games/{self.gid}", headers=self.h).json()
        self.assertEqual(game["current_player"], "B")                      # turn handed over
        throws = self.client.get(f"/api/games/{self.gid}/throws", headers=self.h).json()
        self.assertEqual([x["label"] for x in throws], ["T20", "S5", "D10"])
        self.assertTrue(all(x["source"] == "yolo" for x in throws))        # provenance is stored
        self.assertEqual(throws[0]["confidence"], 0.9)

    def test_takeout_is_idempotent_and_safe_on_empty_turn(self):
        out = self.post(f"/api/games/{self.gid}/takeout", None)
        self.assertFalse(out["handed_over"])
        self.post(f"/api/games/{self.gid}/throws/detected", {"label": "S20", "confidence": 0.8})
        self.assertTrue(self.post(f"/api/games/{self.gid}/takeout", None)["handed_over"])
        self.assertFalse(self.post(f"/api/games/{self.gid}/takeout", None)["handed_over"])

    def test_detected_endpoint_validation_and_auth(self):
        url = f"/api/games/{self.gid}/throws/detected"
        self.assertEqual(self.client.post(url, headers=self.h, json={"label": "Z99"}).status_code, 400)
        self.assertEqual(self.client.post(url, headers=self.h, json={"label": "T20", "confidence": 1.5}).status_code, 422)
        self.assertEqual(self.client.post(url, json={"label": "T20"}).status_code, 401)


if __name__ == "__main__":
    unittest.main()
