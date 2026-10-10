import unittest

from backend.quality_engine.quality_metrics import (
    calculate_final_test_yield,
)


class TestFinalTestYield(unittest.TestCase):

    def test_normal_yield(self):
        self.assertAlmostEqual(
            calculate_final_test_yield(9400, 10000),
            94.0,
        )

    def test_all_dies_pass(self):
        self.assertEqual(
            calculate_final_test_yield(100, 100),
            100.0,
        )

    def test_no_dies_pass(self):
        self.assertEqual(
            calculate_final_test_yield(0, 100),
            0.0,
        )

    def test_zero_tested_dies_is_invalid(self):
        with self.assertRaises(ValueError):
            calculate_final_test_yield(0, 0)

    def test_passing_cannot_exceed_tested(self):
        with self.assertRaises(ValueError):
            calculate_final_test_yield(101, 100)

    def test_negative_count_is_invalid(self):
        with self.assertRaises(ValueError):
            calculate_final_test_yield(-1, 100)

    def test_non_integer_count_is_invalid(self):
        with self.assertRaises(ValueError):
            calculate_final_test_yield(94.5, 100)


if __name__ == "__main__":
    unittest.main()
