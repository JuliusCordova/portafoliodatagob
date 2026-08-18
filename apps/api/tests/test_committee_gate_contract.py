from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]
COMMITTEE_PAGE = ROOT / "apps/web/src/app/page.tsx"
SPONSOR_PAGE = ROOT / "apps/web/src/app/sponsor-review/page.tsx"


class CommitteeExecutiveGateContractTest(unittest.TestCase):
    def test_committee_page_records_formal_gate_for_sponsor(self):
        text = COMMITTEE_PAGE.read_text()

        required_tokens = [
            "async function sendToExecutiveCommittee()",
            'committee_final_decision: "ready_for_executive_committee"',
            "committee_decision_recorded: true",
            'committee_next_step: "sponsor_review"',
            'decision: "ready_for_executive_committee"',
            "committee_decision_recorded_at: now",
            "Enviar a Comité Ejecutivo",
            "¿Enviar esta demanda al Comité Ejecutivo / Sponsor?",
        ]

        for token in required_tokens:
            with self.subTest(token=token):
                self.assertIn(token, text)

    def test_gate_prevents_stale_scoring_promotion(self):
        text = COMMITTEE_PAGE.read_text()

        self.assertIn(
            "Math.abs(persistedScore - scorePreview.score) > 0.001",
            text,
        )
        self.assertIn(
            "Recalcula el score antes de enviar.",
            text,
        )

    def test_sponsor_review_consumes_formal_committee_decision(self):
        text = SPONSOR_PAGE.read_text()

        self.assertIn("committee_final_decision", text)
        self.assertIn("committee_decision_recorded", text)
        self.assertIn("demands.filter(hasCommitteeDecision)", text)


if __name__ == "__main__":
    unittest.main()
