import unittest

from app.core.board import throw_from_label as T
from app.core.game import X01Config, X01Game
from app.errors import Conflict, DomainError


def throw_all(game, *labels):
    out = None
    for label in labels:
        out = game.throw(T(label))
    return out


class GameTests(unittest.TestCase):
    def test_basic_scoring_and_turn_rotation(self):
        g = X01Game(["A", "B"], X01Config(501))
        o = throw_all(g, "T20", "T20", "T20")
        self.assertEqual(g.players[0]["remaining"], 321)
        self.assertTrue(o.turn_complete)
        self.assertEqual(g.view()["current_player"], "B")
        self.assertEqual(g.round, 1)
        throw_all(g, "S1", "S1", "S1")
        self.assertEqual(g.round, 2)
        self.assertEqual(g.view()["current_player"], "A")

    def test_bust_over_reverts_to_turn_start(self):
        g = X01Game(["A"], X01Config(101))
        throw_all(g, "T20", "S20")                 # 21 left
        o = g.throw(T("T20"))
        self.assertTrue(o.bust)
        self.assertEqual(o.bust_reason, "score_exceeded")
        self.assertEqual(g.players[0]["remaining"], 101)

    def test_bust_leaving_one(self):
        g = X01Game(["A"], X01Config(101))
        throw_all(g, "T20", "S20")
        o = g.throw(T("S20"))                      # 1 left
        self.assertTrue(o.bust)
        self.assertEqual(o.bust_reason, "left_on_one")

    def test_must_finish_on_double(self):
        g = X01Game(["A"], X01Config(101))
        g.players[0]["remaining"] = 20
        g.turn_start = 20
        o = g.throw(T("S20"))                      # exactly zero but not a double
        self.assertTrue(o.bust)
        self.assertEqual(o.bust_reason, "must_finish_on_double")
        self.assertEqual(g.players[0]["remaining"], 20)

    def test_win_on_double(self):
        g = X01Game(["A", "B"], X01Config(101))
        throw_all(g, "T20", "S1", "MISS")          # A: 40 left
        throw_all(g, "S1", "S1", "S1")             # B
        o = g.throw(T("D20"))
        self.assertTrue(o.winner)
        self.assertEqual(g.status, "finished")
        self.assertEqual(g.view()["winner"], "A")
        with self.assertRaises(Conflict):
            g.throw(T("S1"))

    def test_win_on_bullseye(self):
        g = X01Game(["A"], X01Config(101))
        g.players[0]["remaining"] = 50
        g.turn_start = 50
        self.assertTrue(g.throw(T("DB")).winner)

    def test_double_out_disabled(self):
        g = X01Game(["A"], X01Config(101, double_out=False))
        g.players[0]["remaining"] = 20
        self.assertTrue(g.throw(T("S20")).winner)

    def test_double_in(self):
        g = X01Game(["A"], X01Config(301, double_in=True))
        o = g.throw(T("T20"))
        self.assertEqual(o.scored, 0)
        self.assertEqual(g.players[0]["remaining"], 301)
        o = g.throw(T("D10"))
        self.assertEqual(o.scored, 20)
        self.assertEqual(g.players[0]["remaining"], 281)

    def test_undo_restores_everything(self):
        g = X01Game(["A", "B"], X01Config(301))
        throw_all(g, "T20", "T20", "T20")
        before = g.to_dict()
        g.throw(T("S5"))
        self.assertEqual(g.undo(), "throw")
        after = g.to_dict()
        self.assertEqual(before["players"], after["players"])
        self.assertEqual(before["current"], after["current"])
        self.assertEqual(g.undo(), "throw")        # undo across a turn boundary
        self.assertEqual(g.view()["current_player"], "A")
        self.assertEqual(g.darts_in_turn, 2)

    def test_undo_win(self):
        g = X01Game(["A"], X01Config(101))
        g.players[0]["remaining"] = 40
        g.throw(T("D20"))
        self.assertEqual(g.status, "finished")
        g.undo()
        self.assertEqual(g.status, "in_progress")
        self.assertIsNone(g.winner)

    def test_end_turn(self):
        g = X01Game(["A", "B"])
        with self.assertRaises(Conflict):
            g.end_turn()
        g.throw(T("S20"))
        g.end_turn()
        self.assertEqual(g.view()["current_player"], "B")
        self.assertEqual(g.undo(), "end_turn")
        self.assertEqual(g.view()["current_player"], "A")

    def test_serialisation_round_trip(self):
        g = X01Game(["A", "B"], X01Config(301))
        throw_all(g, "T20", "T19", "D8", "S1")
        clone = X01Game.from_dict(g.to_dict())
        self.assertEqual(clone.to_dict(), g.to_dict())
        clone.throw(T("S20"))
        self.assertEqual(clone.undo(), "throw")

    def test_checkout_hint_follows_darts_left(self):
        g = X01Game(["A"], X01Config(101))
        g.players[0]["remaining"] = 100
        self.assertEqual(g.checkout_hint(), ["T20", "D20"])
        g.darts_in_turn = 2
        self.assertIsNone(g.checkout_hint())

    def test_validation(self):
        for players in ([], ["A", "a"], ["A", " "], [str(i) for i in range(9)]):
            with self.assertRaises(DomainError):
                X01Game(players)
        with self.assertRaises(DomainError):
            X01Game(["A"], X01Config(start=500))


if __name__ == "__main__":
    unittest.main()
