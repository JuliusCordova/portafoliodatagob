from __future__ import annotations

import unittest

from atlas_datagob.agents.business_case_snapshot import build_governed_business_case_snapshot
from atlas_datagob.services.adk_intake_runtime import merge_turn_business_facts


class FakeToolContext:
    def __init__(self, state: dict | None = None) -> None:
        self.state = state or {}


class Feature54BusinessFactPersistenceTest(unittest.TestCase):
    def test_turn_fact_merge_preserves_problem_outcome_and_accumulates_lists(self):
        current = {
            "business_problem": "Los quiebres de stock se detectan demasiado tarde.",
            "stakeholders": ["Comercial"],
        }
        facts = {
            "desired_outcome": "Anticipar productos con riesgo de quiebre de stock.",
            "stakeholders": ["Planificación", "Comercial"],
            "success_metrics": ["Reducir los quiebres de stock al menos 20%"],
            "data_sources": ["SAP Ventas", "SAP Inventarios"],
        }

        merged = merge_turn_business_facts(current, facts)

        self.assertEqual(
            merged["business_problem"],
            "Los quiebres de stock se detectan demasiado tarde.",
        )
        self.assertEqual(
            merged["desired_outcome"],
            "Anticipar productos con riesgo de quiebre de stock.",
        )
        self.assertEqual(merged["stakeholders"], ["Comercial", "Planificación"])
        self.assertEqual(
            merged["success_metrics"],
            ["Reducir los quiebres de stock al menos 20%"],
        )
        self.assertEqual(merged["data_sources"], ["SAP Ventas", "SAP Inventarios"])

    def test_delivery_controls_are_governance_requirements_not_definition_blockers(self):
        context = FakeToolContext(
            {
                "business_context": {
                    "business_problem": "Los quiebres de stock se detectan demasiado tarde.",
                    "desired_outcome": "Anticipar productos con riesgo de quiebre.",
                    "business_area": "Planificación Comercial",
                    "impacted_process": "Planificación y reposición de inventario",
                    "success_metrics": ["Reducir los quiebres de stock al menos 20%"],
                    "data_sources": ["SAP Ventas", "SAP Inventarios"],
                },
                "project_classification": {
                    "primary_type": "machine_learning",
                    "subtype": "forecasting",
                    "secondary_capabilities": ["dashboard_analytics", "data_engineering"],
                },
                "data_readiness": {
                    "score": 100,
                    "status": "ready",
                    "gaps": [],
                },
                "architecture_assessment": {
                    "status": "approved_baseline_selected",
                    "pattern_id": "GCP-ML-001",
                    "pattern_version": "1.0",
                    "gaps": [],
                },
                "policy_assessment": {
                    "status": "controls_required",
                    "policy_references": [
                        "DATA-001@1.0",
                        "DATA-002@1.0",
                        "SEC-001@1.0",
                        "ML-001@1.0",
                        "FINOPS-001@1.0",
                    ],
                    "missing_controls": [
                        "model_registry",
                        "drift_monitoring",
                        "budget",
                        "lineage",
                    ],
                },
            }
        )

        business_case = build_governed_business_case_snapshot(context)

        self.assertEqual(business_case["completeness"], 100)
        self.assertTrue(business_case["ready_to_register"])
        self.assertEqual(business_case["definition_gaps"], [])
        self.assertEqual(business_case["gaps"], [])
        self.assertIn("model_registry", business_case["governance_requirements"])
        self.assertIn("drift_monitoring", business_case["governance_requirements"])
        self.assertIn("budget", business_case["governance_requirements"])
        self.assertEqual(
            business_case["recommendation"],
            "ready_for_user_confirmation",
        )

    def test_missing_business_problem_remains_a_definition_blocker(self):
        context = FakeToolContext(
            {
                "business_context": {
                    "desired_outcome": "Anticipar productos con riesgo de quiebre.",
                    "business_area": "Planificación Comercial",
                    "impacted_process": "Planificación y reposición de inventario",
                    "success_metrics": ["Reducir quiebres 20%"],
                    "data_sources": ["SAP"],
                },
                "project_classification": {"primary_type": "machine_learning"},
                "data_readiness": {"status": "ready", "gaps": []},
                "architecture_assessment": {"pattern_id": "GCP-ML-001", "gaps": []},
                "policy_assessment": {
                    "status": "controls_required",
                    "missing_controls": ["model_registry"],
                },
            }
        )

        business_case = build_governed_business_case_snapshot(context)

        self.assertFalse(business_case["ready_to_register"])
        self.assertIn("business_problem", business_case["definition_gaps"])
        self.assertIn("model_registry", business_case["governance_requirements"])


if __name__ == "__main__":
    unittest.main()
