import unittest

from backend.quality_engine.lot import ManufacturingLot
from backend.quality_engine.anomaly_detector import detect_yield_anomaly


def make_lot(lot_id, product_id, passing_dies, tested_dies=10000):
    return ManufacturingLot(
        lot_id=lot_id,
        product_id=product_id,
        tested_dies=tested_dies,
        passing_dies=passing_dies,
        process_step="Final Test",
        equipment_id="TESTER-01",
        recipe_revision="REV-A",
    )


class TestYieldAnomalyDetector(unittest.TestCase):

    def setUp(self):
        self.references = [
            make_lot("REF-1", "CHIP-A", 9500),
            make_lot("REF-2", "CHIP-A", 9480),
            make_lot("REF-3", "CHIP-A", 9520),
        ]

    def test_low_yield_lot_triggers_alert(self):
        lot = make_lot("LOW-1", "CHIP-A", 8200)

        result = detect_yield_anomaly(lot, self.references)

        self.assertEqual(result["status"], "ALERT")
        self.assertEqual(result["baseline_yield_pct"], 95.0)
        self.assertEqual(result["yield_drop_percentage_points"], 13.0)

    def test_normal_yield_does_not_trigger_alert(self):
        lot = make_lot("NORMAL-1", "CHIP-A", 9400)

        result = detect_yield_anomaly(lot, self.references)

        self.assertEqual(result["status"], "NORMAL")

    def test_different_product_is_not_used_as_reference(self):
        lot = make_lot("OTHER-1", "CHIP-B", 8200)

        result = detect_yield_anomaly(lot, self.references)

        self.assertEqual(result["status"], "INSUFFICIENT_DATA")

    def test_current_lot_is_excluded_from_baseline(self):
        lot = make_lot("NEW-1", "CHIP-A", 8200)

        result = detect_yield_anomaly(
            lot, self.references + [lot]
        )

        self.assertEqual(result["baseline_yield_pct"], 95.0)

    def test_threshold_is_configurable(self):
        lot = make_lot("LOW-2", "CHIP-A", 9200)

        result = detect_yield_anomaly(
            lot,
            self.references,
            min_drop_percentage_points=2.0,
        )

        self.assertEqual(result["status"], "ALERT")

    def test_negative_threshold_is_rejected(self):
        lot = make_lot("LOW-3", "CHIP-A", 8200)

        with self.assertRaises(ValueError):
            detect_yield_anomaly(
                lot, self.references, -1.0
            )


    def test_drop_exactly_at_threshold_triggers_alert(self):
        # Baseline is 95%; observed yield is exactly 90%.
        lot = make_lot("BOUNDARY-EXACT", "CHIP-A", 9000)

        result = detect_yield_anomaly(
            lot, self.references, min_drop_percentage_points=5.0
        )

        self.assertEqual(result["status"], "ALERT")
        self.assertEqual(result["yield_drop_percentage_points"], 5.0)

    def test_drop_just_below_threshold_does_not_trigger_alert(self):
        # Baseline is 95%; observed yield is 90.01%.
        lot = make_lot("BOUNDARY-BELOW", "CHIP-A", 9001)

        result = detect_yield_anomaly(
            lot, self.references, min_drop_percentage_points=5.0
        )

        self.assertEqual(result["status"], "NORMAL")
        self.assertEqual(result["yield_drop_percentage_points"], 4.99)

    def test_median_is_robust_to_one_low_reference_outlier(self):
        references = [
            make_lot("ROBUST-1", "CHIP-A", 9500),
            make_lot("ROBUST-2", "CHIP-A", 9480),
            make_lot("ROBUST-3", "CHIP-A", 9520),
            make_lot("ROBUST-OUTLIER", "CHIP-A", 5000),
        ]
        lot = make_lot("ROBUST-TARGET", "CHIP-A", 9400)

        result = detect_yield_anomaly(lot, references)

        # Median of 95.0, 94.8, 95.2 and 50.0 is 94.9.
        self.assertEqual(result["baseline_yield_pct"], 94.9)
        self.assertEqual(result["status"], "NORMAL")


if __name__ == "__main__":
    unittest.main()
