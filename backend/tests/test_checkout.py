import unittest

from app.core.checkout import suggest_checkout


class CheckoutTests(unittest.TestCase):
    def test_known_finishes(self):
        self.assertEqual(suggest_checkout(170), ["T20", "T20", "DB"])
        self.assertEqual(suggest_checkout(100), ["T20", "D20"])
        self.assertEqual(suggest_checkout(40), ["D20"])
        self.assertEqual(suggest_checkout(32), ["D16"])
        self.assertEqual(suggest_checkout(50), ["DB"])

    def test_impossible_finishes(self):
        for n in (169, 168, 166, 165, 163, 162, 159, 1):
            self.assertIsNone(suggest_checkout(n), n)
        self.assertIsNone(suggest_checkout(171))
        self.assertIsNone(suggest_checkout(0))

    def test_dart_budget_is_respected(self):
        self.assertIsNone(suggest_checkout(100, darts_left=1))
        self.assertEqual(len(suggest_checkout(100, darts_left=2)), 2)
        self.assertEqual(suggest_checkout(3), ["S1", "D1"])

    def test_every_route_sums_and_ends_on_a_double(self):
        from app.core.board import throw_from_label
        for rem in range(2, 171):
            route = suggest_checkout(rem)
            if route is None:
                continue
            throws = [throw_from_label(l) for l in route]
            self.assertEqual(sum(t.points for t in throws), rem)
            self.assertTrue(throws[-1].is_double)

    def test_without_double_out(self):
        route = suggest_checkout(20, 1, double_out=False)
        self.assertEqual(len(route), 1)            # any single dart worth 20 is valid
        self.assertIn(route[0], ("S20", "D10"))
        self.assertEqual(suggest_checkout(180, 3, double_out=False), ["T20", "T20", "T20"])


if __name__ == "__main__":
    unittest.main()
