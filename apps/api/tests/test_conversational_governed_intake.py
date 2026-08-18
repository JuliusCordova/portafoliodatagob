from __future__ import annotations

import unittest

from atlas_datagob.agents.conversational_intake_tools import (
    build_business_case_snapshot,
    capture_business_context,
    classify_project_need,
    evaluate_data_readiness,
    evaluate_governance_policies,
    validate_gcp_architecture,
)


class FakeToolContext:
    def __init__(self) -> None:
        self.state: dict = {}


class ConversationalGovernedIntakeTest(unittest.TestCase):
    def test_dashboard_classification(self):
        context = FakeToolContext()
        result = classify_project_need(
            title="Tablero ejecutivo de ventas",
            business_problem="La gerencia no tiene indicadores consolidados.",
            desired_outcome="Visualizar KPI de ventas en un dashboard ejecutivo.",
            additional_context="Reporte diario para decisiones comerciales.",
            tool_context=context,
        )

        self.assertEqual(result["primary_type"], "dashboard_analytics")
        self.assertEqual(result["subtype"], "executive_dashboard")
        self.assertGreater(result["confidence"], 0)
        self.assertEqual(context.state["project_classification"], result)

    def test_machine_learning_classification(self):
        context = FakeToolContext()
        result = classify_project_need(
            title="Pronóstico de demanda",
            business_problem="Los quiebres de stock se detectan tarde.",
            desired_outcome="Predecir demanda y anticipar quiebres.",
            additional_context="Usaremos ventas históricas e inventario.",
            tool_context=context,
        )

        self.assertEqual(result["primary_type"], "machine_learning")
        self.assertEqual(result["subtype"], "forecasting")

    def test_agentic_classification_includes_agent_type(self):
        context = FakeToolContext()
        result = classify_project_need(
            title="Agente para gestión de incidencias",
            business_problem="El equipo ejecuta manualmente acciones repetitivas.",
            desired_outcome="Un agente debe evaluar el caso y ejecutar acciones en el sistema.",
            additional_context="El agente utilizará herramientas y workflow gobernado.",
            tool_context=context,
        )

        self.assertEqual(result["primary_type"], "agentic_ai")
        self.assertEqual(result["agent_type"], "action_agent")

    def test_architecture_uses_versioned_approved_gcp_pattern(self):
        context = FakeToolContext()
        result = validate_gcp_architecture(
            project_type="machine_learning",
            proposed_architecture="",
            tool_context=context,
        )

        self.assertEqual(result["pattern_id"], "GCP-ML-001")
        self.assertEqual(result["pattern_version"], "1.0")
        self.assertEqual(result["status"], "approved_baseline_selected")
        self.assertIn("Vertex AI", result["gcp_services"])

    def test_policy_evaluation_returns_versioned_catalog_references(self):
        context = FakeToolContext()
        result = evaluate_governance_policies(
            project_type="agentic_ai",
            known_controls=[],
            sensitive_data=False,
            writes_to_systems=True,
            tool_context=context,
        )

        references = result["policy_references"]
        self.assertIn("DATA-001@1.0", references)
        self.assertIn("SEC-001@1.0", references)
        self.assertIn("GENAI-001@1.0", references)
        self.assertIn("AGENT-001@1.0", references)
        self.assertIn("FINOPS-001@1.0", references)
        self.assertIn("human_approval_for_material_actions", result["missing_controls"])
        self.assertIn("fallback_and_rollback", result["missing_controls"])

    def test_business_case_is_canonical_artifact_after_all_assessments(self):
        context = FakeToolContext()

        capture_business_context(
            business_problem="Los quiebres de stock se detectan de forma reactiva.",
            desired_outcome="Anticipar demanda y reducir quiebres de stock.",
            business_area="Comercial",
            impacted_process="Planificación y reposición de inventario",
            current_situation="SAP y archivos operativos se revisan manualmente.",
            stakeholders=["Comercial", "Logística"],
            success_metrics=["Reducir quiebres de stock"],
            data_sources=["SAP", "Inventario", "Ventas históricas"],
            tool_context=context,
        )
        classify_project_need(
            title="Pronóstico de demanda",
            business_problem="Los quiebres de stock se detectan de forma reactiva.",
            desired_outcome="Predecir demanda y reducir quiebres.",
            additional_context="Ventas históricas e inventario.",
            tool_context=context,
        )
        evaluate_data_readiness(
            data_sources=["SAP", "Inventario", "Ventas históricas"],
            data_owner_known=True,
            historical_data_known=True,
            quality_known=True,
            frequency_known=True,
            access_known=True,
            sensitive_data=False,
            tool_context=context,
        )
        validate_gcp_architecture(
            project_type="machine_learning",
            proposed_architecture="",
            tool_context=context,
        )
        evaluate_governance_policies(
            project_type="machine_learning",
            known_controls=[],
            sensitive_data=False,
            writes_to_systems=False,
            tool_context=context,
        )

        business_case = build_business_case_snapshot(context)

        self.assertEqual(business_case["completeness"], 100)
        self.assertTrue(business_case["ready_to_register"])
        self.assertEqual(
            business_case["project_classification"]["primary_type"],
            "machine_learning",
        )
        self.assertEqual(
            business_case["architecture_assessment"]["pattern_id"],
            "GCP-ML-001",
        )
        self.assertTrue(business_case["policy_assessment"]["policy_references"])


if __name__ == "__main__":
    unittest.main()
