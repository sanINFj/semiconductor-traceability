import unittest

from backend.quality_engine.investigation import QualityInvestigation


class TestQualityInvestigation(unittest.TestCase):

    def setUp(self):
        self.case = QualityInvestigation(
            alert_id="ALERT-001",
            lot_id="LOT-004",
        )

    def test_new_case_starts_open(self):
        self.assertEqual(self.case.status, "OPEN")

    def test_investigation_can_start(self):
        self.case.start_investigation()
        self.assertEqual(self.case.status, "INVESTIGATING")

    def test_cannot_record_hypothesis_before_starting(self):
        with self.assertRaises(ValueError):
            self.case.record_hypothesis("Possible cause", "Evidence")

    def test_hypothesis_requires_evidence(self):
        self.case.start_investigation()
        with self.assertRaises(ValueError):
            self.case.record_hypothesis("Possible cause", "  ")

    def test_cannot_close_without_verification(self):
        self.case.start_investigation()
        self.case.record_corrective_action("Review recipe history")

        with self.assertRaises(ValueError):
            self.case.close()

    def test_complete_investigation_can_close(self):
        self.case.start_investigation()
        self.case.record_hypothesis(
            "Possible recipe association",
            "The affected lot used a different recipe revision.",
        )
        self.case.record_corrective_action("Review and validate recipe")
        self.case.record_verification(
            "Follow-up lot did not reproduce the issue.",
            issue_recurred=False,
        )
        self.case.close()

        self.assertEqual(self.case.status, "CLOSED")
        self.assertFalse(self.case.issue_recurred)

    def test_cannot_close_without_corrective_action(self):
        self.case.start_investigation()
        self.case.record_verification(
            "Follow-up check completed.",
            issue_recurred=False,
        )

        with self.assertRaises(ValueError):
            self.case.close()


if __name__ == "__main__":
    unittest.main()
