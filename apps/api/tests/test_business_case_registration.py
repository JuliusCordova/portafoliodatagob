from __future__ import annotations

import unittest

from atlas_datagob.services.business_case_registration import business_case_to_validation_result


class BusinessCaseRegistrationTest(unittest.TestCase):
    def _case(self, *, project_type: str = "dashboard_analytics") -> dict:
        return {
            "business_problem": "La gerencia no tiene una visión consolidada de ventas.",
            "desired_outcome": "Contar con indicadores diarios confiables para decidir.",
            "business_area": "Comercial",
            "stakeholders": ["Gerencia Comercial"],
            "impacted_process": "Seguimiento comercial",
            "current_situation": "La información se consolida manualmente.",
            "success_metrics": ["Reducir tiempo de consolidación"],
            "data_sources": ["SAP", "CRM"],
            "project_classification": {
                "primary_type": project_type,
                "subtype": "executive_dashboard" if project_type == "dashboard_analytics" else "forecasting",
                "agent_type": None,
                "secondary_capabilities": ["data_engineering"],
                "confidence": 0.91,
                "signals": ["dashboard", "kpi"],
            },
            "data_readiness": {
                "score": 83,
                "status": "ready",
                "gaps": [],
            },
            "architecture_assessment": {
                "status": "approved_baseline_selected",
                "pattern_id": "GCP-BI-001" if project_type == "dashboard_analytics" else "GCP-ML-001",
                "pattern_version": "1.0",
                "human_architecture_review_required": False,
                "gaps": [],
            },
            "policy_assessment": {
                "policy_references": ["DATA-001@1.0", "SEC-001@1.0", "FINOPS-001@1.0"],
                "missing_controls": ["cost_owner", "budget"],
            },
            "completeness": 100,
            "ready_to_register": True,
        }

    def test_preserves_feature54_project_classification(self):
        result = business_case_to_validation_result(self._case())

        self.assertEqual(result["classification"]["initiative_type"], "dashboard_analytics")
        self.assertEqual(result["classification"]["subtype"], "executive_dashboard")
        self.assertEqual(result["classification"]["classifier"], "feature54_conversational_governed_intake")
        self.assertEqual(result["architecture"]["pattern_id"], "GCP-BI-001")
        self.assertIn("DATA-001@1.0", [item["reference"] for item in result["policy_matches"]])

    def test_finops_gaps_are_derived_from_versioned_policy_controls(self):
        result = business_case_to_validation_result(self._case())
        self.assertEqual(result["finops_gaps"], ["cost_owner", "budget"])

    def test_insufficient_data_readiness_routes_to_refinement(self):
        business_case = self._case(project_type="machine_learning")
        business_case["data_readiness"] = {
            "score": 33,
            "status": "insufficient",
            "gaps": ["historical_data_known"],
        }

        result = business_case_to_validation_result(business_case)

        self.assertEqual(result["recommended_next_action"], "request_more_info")
        self.assertEqual(result["operative_committee"]["suggested_decision"], "reformulation_required")

    def test_architecture_exception_routes_to_architect_review(self):
        business_case = self._case()
        business_case["architecture_assessment"]["human_architecture_review_required"] = True
        business_case["architecture_assessment"]["gaps"] = ["Componente no canónico"]

        result = business_case_to_validation_result(business_case)

        self.assertEqual(result["recommended_next_action"], "architect_review")
        self.assertTrue(result["human_architecture_review_required"])


if __name__ == "__main__":
    unittest.main()
