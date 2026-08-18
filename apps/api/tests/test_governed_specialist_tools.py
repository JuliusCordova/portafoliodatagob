from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from atlas_datagob.agents.governed_specialist_tools import (
    canonical_project_type,
    evaluate_data_readiness_governed,
    evaluate_governance_policies_governed,
    validate_gcp_architecture_governed,
)


class FakeToolContext:
    def __init__(self, state: dict | None = None) -> None:
        self.state = state or {}


class GovernedSpecialistToolsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.env = patch.dict(
            os.environ,
            {
                "ATLAS_GOVERNANCE_BUCKET": "",
                "ATLAS_GOVERNANCE_REQUIRE_GCS": "false",
            },
            clear=False,
        )
        self.env.start()

    def tearDown(self) -> None:
        self.env.stop()

    def test_canonical_type_prefers_shared_classification_state(self):
        context = FakeToolContext(
            {"project_classification": {"primary_type": "machine_learning"}}
        )
        self.assertEqual(
            canonical_project_type("Machine Learning, forecasting", context),
            "machine_learning",
        )

    def test_architecture_uses_canonical_state_even_when_llm_passes_narrative_label(self):
        context = FakeToolContext(
            {"project_classification": {"primary_type": "machine_learning"}}
        )
        result = validate_gcp_architecture_governed(
            project_type="Machine Learning, forecasting",
            proposed_architecture="",
            tool_context=context,
        )
        self.assertEqual(result["status"], "approved_baseline_selected")
        self.assertEqual(result["pattern_id"], "GCP-ML-001")
        self.assertEqual(result["project_type"], "machine_learning")

    def test_policies_use_canonical_state_and_return_ml_policy(self):
        context = FakeToolContext(
            {"project_classification": {"primary_type": "machine_learning"}}
        )
        result = evaluate_governance_policies_governed(
            project_type="Machine Learning",
            known_controls=[],
            sensitive_data=False,
            writes_to_systems=False,
            tool_context=context,
        )
        refs = result["policy_references"]
        self.assertIn("ML-001@1.0", refs)
        self.assertIn("DATA-001@1.0", refs)
        self.assertIn("SEC-001@1.0", refs)
        self.assertIn("FINOPS-001@1.0", refs)
        self.assertEqual(result["project_type"], "machine_learning")

    def test_sap_readiness_preserves_sources_and_adds_data_engineering_secondary(self):
        context = FakeToolContext(
            {
                "business_context": {
                    "business_problem": "Quiebres de stock",
                    "desired_outcome": "Anticiparlos",
                },
                "project_classification": {
                    "primary_type": "machine_learning",
                    "subtype": "forecasting",
                    "secondary_capabilities": ["dashboard_analytics"],
                    "classification_method": "gemini_semantic_extraction_plus_deterministic_mapping",
                    "capabilities": {
                        "prediction": True,
                        "dashboard": True,
                        "data_integration": False,
                    },
                },
            }
        )

        result = evaluate_data_readiness_governed(
            data_sources=["SAP ventas", "SAP inventarios"],
            data_owner_known=True,
            historical_data_known=True,
            quality_known=True,
            frequency_known=True,
            access_known=True,
            sensitive_data=False,
            tool_context=context,
        )

        self.assertEqual(result["score"], 100)
        self.assertEqual(
            context.state["business_context"]["data_sources"],
            ["SAP ventas", "SAP inventarios"],
        )
        classification = context.state["project_classification"]
        self.assertTrue(classification["capabilities"]["data_integration"])
        self.assertIn("data_engineering", classification["secondary_capabilities"])
        self.assertIn(
            "deterministic_enterprise_source_enrichment",
            classification["classification_method"],
        )


if __name__ == "__main__":
    unittest.main()
