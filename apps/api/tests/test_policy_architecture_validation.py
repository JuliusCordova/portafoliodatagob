from __future__ import annotations

import unittest

from atlas_datagob.agents.policy_intake_agent import PolicyIntakeAgent
from atlas_datagob.services.policy_architecture_validation import IntakeValidationContext, available_policies


class PolicyArchitectureValidationTest(unittest.TestCase):
    def test_available_policies_are_loaded(self) -> None:
        policies = available_policies()
        self.assertGreaterEqual(len(policies), 4)
        self.assertTrue(any("policy" in item["policy_id"] for item in policies))

    def test_bi_request_without_semantic_model_routes_to_committee_review(self) -> None:
        context = IntakeValidationContext(
            title="Dashboard de ventas ejecutivas",
            description="Crear dashboard BI desde fuentes ERP con bronze, silver y gold, pero aun sin modelo semantico.",
            requester_area="Comercial",
            requester_role="Domain Owner",
            target_consumption="BI",
        )

        result = PolicyIntakeAgent().validate(context)
        self.assertEqual("bi_reporting", result["architecture"]["architecture_pattern"])
        self.assertTrue(result["human_architecture_review_required"])
        self.assertEqual("architecture_exception_or_reformulation", result["recommended_next_action"])
        self.assertTrue(result["operative_committee"]["data_architect_final_validation_required"])
        self.assertIn("Architect", " ".join(result["operative_committee"]["required_review_roles"]))

    def test_genai_request_missing_knowledge_governance_is_flagged(self) -> None:
        context = IntakeValidationContext(
            title="Agente RAG para responder preguntas de negocio",
            description="Crear un agente con Gemini y documentos, sin definir trazabilidad de fuentes ni gobierno del retrieval.",
            requester_area="Innovacion",
            requester_role="Product Owner",
            target_consumption="GenAI",
        )

        result = PolicyIntakeAgent().validate(context)
        self.assertEqual("genai_rag", result["architecture"]["architecture_pattern"])
        self.assertTrue(result["human_architecture_review_required"])
        self.assertTrue(any("retrieval" in gap.lower() or "conocimiento" in gap.lower() for gap in result["policy_gaps"]))


if __name__ == "__main__":
    unittest.main()
