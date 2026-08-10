from __future__ import annotations

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[3]


class ApiContractFilesTest(unittest.TestCase):
    def test_openapi_contract_is_versioned(self) -> None:
        contract_path = ROOT / "docs" / "api" / "openapi.yaml"
        content = contract_path.read_text(encoding="utf-8")

        self.assertIn("title: ATLAS DataGob API", content)
        self.assertIn("/metadata/data-dictionary:", content)
        self.assertIn("/metadata/er-model:", content)
        self.assertIn("/metadata/validate:", content)
        self.assertIn("/intake/policy-architecture-validate:", content)
        self.assertIn("PolicyArchitectureValidationResult", content)


    def test_scoring_contract_matches_mvp_spec(self) -> None:
        contract_path = ROOT / "docs" / "api" / "openapi.yaml"
        content = contract_path.read_text(encoding="utf-8")

        scoring_payload = (
            content
            .split("    ScoringPayload:", 1)[1]
            .split("    ScoringResult:", 1)[0]
        )

        required_fields = [
            "business_value",
            "strategic_alignment",
            "data_readiness",
            "technical_feasibility",
            "execution_effort",
            "risk_control",
        ]

        for field in required_fields:
            self.assertIn(f"{field}:", scoring_payload)

        self.assertNotIn("urgency:", scoring_payload)
        self.assertNotIn("governance_risk:", scoring_payload)

        scoring_result = content.split("    ScoringResult:", 1)[1]
        self.assertIn(
            "enum: [Alta, Media, Backlog, Reformular]",
            scoring_result,
        )


if __name__ == "__main__":
    unittest.main()
