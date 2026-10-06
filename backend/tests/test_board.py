import math
import unittest

from app.core.board import (ALL_THROWS, SECTOR_ORDER, aim_point, classify_point, make_throw,
                            throw_from_label)


class BoardTests(unittest.TestCase):
    def test_cardinal_sectors(self):
        self.assertEqual(classify_point(0, 130).label, "S20")
        self.assertEqual(classify_point(130, 0).label, "S6")
        self.assertEqual(classify_point(0, -130).label, "S3")
        self.assertEqual(classify_point(-130, 0).label, "S11")

    def test_rings(self):
        self.assertEqual(classify_point(0, 0).label, "DB")
        self.assertEqual(classify_point(0, 10).label, "SB")
        self.assertEqual(classify_point(0, 103).label, "T20")
        self.assertEqual(classify_point(0, 166).label, "D20")
        self.assertEqual(classify_point(0, 171).label, "MISS")

    def test_ring_boundaries_are_inclusive_outward(self):
        self.assertEqual(classify_point(0, 170).label, "D20")
        self.assertEqual(classify_point(0, 162).label, "S20")
        self.assertEqual(classify_point(0, 107).label, "T20")
        self.assertEqual(classify_point(0, 99.0).label, "S20")

    def test_every_segment_round_trips(self):
        for t in ALL_THROWS:
            x, y = aim_point(t)
            self.assertEqual(classify_point(x, y), t, t.label)

    def test_sector_boundary_wire(self):
        r = 130
        for deg_cw, left, right in ((9, 20, 1), (27, 1, 18)):
            for eps, expected in ((-0.5, left), (0.5, right)):
                a = math.radians(deg_cw + eps)
                self.assertEqual(classify_point(r * math.sin(a), r * math.cos(a)).sector, expected)

    def test_points_and_labels(self):
        self.assertEqual(make_throw(3, 20).points, 60)
        self.assertEqual(make_throw(2, 25).points, 50)
        self.assertEqual(make_throw(0, 5).label, "MISS")
        self.assertEqual(throw_from_label("t19").points, 57)
        self.assertEqual(throw_from_label("db").points, 50)
        self.assertTrue(throw_from_label("DB").is_double)
        self.assertFalse(throw_from_label("SB").is_double)

    def test_invalid_input(self):
        for bad in ("X20", "T", "T21x", ""):
            with self.assertRaises(ValueError):
                throw_from_label(bad)
        with self.assertRaises(ValueError):
            make_throw(3, 25)
        with self.assertRaises(ValueError):
            make_throw(1, 21)

    def test_sector_order_is_a_permutation(self):
        self.assertEqual(sorted(SECTOR_ORDER), list(range(1, 21)))


if __name__ == "__main__":
    unittest.main()
