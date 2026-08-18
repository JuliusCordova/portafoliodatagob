from __future__ import annotations

import unittest

from atlas_datagob.services.adk_intake_runtime import materialize_business_case


class AdkIntakeRuntimeSnapshotTest(unittest.TestCase):
    def test_materializes_incomplete_business_case_without_llm_snapshot_tool(self):
        state = {
            "business_context": {
                "business_problem": "Comercial detecta quiebres de stock demasiado tarde.",
                "desired_outcome": "Anticipar productos con riesgo de quiebre.",
                "business_area": "Comercial",
                "impacted_process": "Planificación de inventario",
                "success_metrics": ["Reducir quiebres de stock 20%"],
                "data_sources": ["SAP"],
            },
            "project_classification": {
                "primary_type": "machine_learning",
                "subtype": "forecasting",
                "secondary_capabilities": ["dashboard_analytics", "data_engineering"],
            },
            "data_readiness": {},
            "architecture_assessment": {},
            "policy_assessment": {},
        }

        business_case = materialize_business_case(state)

        self.assertEqual(business_case["business_problem"], state["business_context"]["business_problem"])
        self.assertEqual(business_case["project_classification"]["primary_type"], "machine_learning")
        self.assertFalse(business_case["ready_to_register"])
        self.assertGreater(business_case["completeness"], 0)
        self.assertIn("data_readiness", business_case["gaps"])
        self.assertIn("architecture_assessment", business_case["gaps"])
        self.assertIn("policy_assessment", business_case["gaps"])

    def test_ready_snapshot_requires_all_structured_assessments(self):
        state = {
            "business_context": {
                "business_problem": "Comercial detecta quiebres de stock demasiado tarde.",
                "desired_outcome": "Anticipar productos con riesgo de quiebre.",
                "business_area": "Comercial",
                "impacted_process": "Planificación de inventario",
                "success_metrics": ["Reducir quiebres de stock 20%"],
                "data_sources": ["SAP"],
            },
            "project_classification": {
                "primary_type": "machine_learning",
                "subtype": "forecasting",
            },
            "data_readiness": {"score": 100, "status": "ready", "gaps": []},
            "architecture_assessment": {
                "status": "approved_baseline_selected",
                "pattern_id": "GCP-ML-001",
                "gaps": [],
            },
            "policy_assessment": {
                "status": "compliant",
                "policy_references": ["ML-001@1.0"],
                "missing_controls": [],
            },
        }

        business_case = materialize_business_case(state)

        self.assertEqual(business_case["completeness"], 100)
        self.assertTrue(business_case["ready_to_register"])
        self.assertEqual(business_case["recommendation"], "ready_for_user_confirmation")


if __name__ == "__main__":
    unittest.main()
