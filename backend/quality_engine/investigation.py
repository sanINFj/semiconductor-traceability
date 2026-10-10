"""Engineer-led investigation records for quality alerts."""

from dataclasses import dataclass
from typing import Optional


VALID_STATUSES = {"OPEN", "INVESTIGATING", "CLOSED"}


@dataclass
class QualityInvestigation:
    alert_id: str
    lot_id: str
    status: str = "OPEN"
    hypothesis: Optional[str] = None
    supporting_evidence: Optional[str] = None
    corrective_action: Optional[str] = None
    verification_notes: Optional[str] = None
    issue_recurred: Optional[bool] = None

    def __post_init__(self):
        if not isinstance(self.alert_id, str) or not self.alert_id.strip():
            raise ValueError("alert_id must be a non-empty string")

        if not isinstance(self.lot_id, str) or not self.lot_id.strip():
            raise ValueError("lot_id must be a non-empty string")

        if self.status not in VALID_STATUSES:
            raise ValueError(
                f"status must be one of {sorted(VALID_STATUSES)}"
            )

        if self.issue_recurred is not None and not isinstance(
            self.issue_recurred, bool
        ):
            raise ValueError("issue_recurred must be True, False, or None")

    def start_investigation(self):
        if self.status != "OPEN":
            raise ValueError("Only an OPEN investigation can be started")
        self.status = "INVESTIGATING"

    def record_hypothesis(self, hypothesis: str, evidence: str):
        if self.status != "INVESTIGATING":
            raise ValueError("Start the investigation before recording findings")

        if not isinstance(hypothesis, str) or not hypothesis.strip():
            raise ValueError("hypothesis must not be empty")

        if not isinstance(evidence, str) or not evidence.strip():
            raise ValueError("Supporting evidence must not be empty")

        self.hypothesis = hypothesis.strip()
        self.supporting_evidence = evidence.strip()

    def record_corrective_action(self, action: str):
        if self.status != "INVESTIGATING":
            raise ValueError("Investigation must be in progress")

        if not isinstance(action, str) or not action.strip():
            raise ValueError("Corrective action must not be empty")

        self.corrective_action = action.strip()

    def record_verification(self, notes: str, issue_recurred: bool):
        if self.status != "INVESTIGATING":
            raise ValueError("Investigation must be in progress")

        if not isinstance(notes, str) or not notes.strip():
            raise ValueError("Verification notes must not be empty")

        if not isinstance(issue_recurred, bool):
            raise ValueError("issue_recurred must be True or False")

        self.verification_notes = notes.strip()
        self.issue_recurred = issue_recurred

    def close(self):
        if self.status != "INVESTIGATING":
            raise ValueError("Only an investigation in progress can be closed")

        if not self.corrective_action:
            raise ValueError("Record the corrective action before closing")

        if self.verification_notes is None or self.issue_recurred is None:
            raise ValueError("Record verification before closing")

        self.status = "CLOSED"
