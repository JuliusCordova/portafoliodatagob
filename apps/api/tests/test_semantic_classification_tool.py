from __future__ import annotations

import unittest

from atlas_datagob.agents.semantic_classification_tool import classify_project_capabilities


class FakeToolContext:
    def __init__(self) -> None:
        self.state: dict = {}


class SemanticClassificationToolTest(unittest.TestCase):
    def _classify(self, **overrides):
        payload = {
            "requires_data_integration": False,
            "requires_dashboard": False,
            "requires_prediction": False,
            "requires_optimization": False,
            "requires_anomaly_detection": False,
            "requires_generation": False,
            "requires_knowledge_retrieval": False,
            "requires_document_understanding": False,
            "requires_agentic_orchestration": False,
            "writes_to_systems": False,
            "requires_data_governance": False,
            "requires_streaming": False,
            "requires_cdc": False,
            "candidate_subtype": "",
            "agent_design": "none",
            "evidence": [],
            "tool_context": FakeToolContext(),
        }
        payload.update(overrides)
        return classify_project_capabilities(**payload)

    def test_prediction_is_primary_and_dashboard_is_secondary(self):
        result = self._classify(
            requires_prediction=True,
            requires_dashboard=True,
            requires_data_integration=True,
            candidate_subtype="forecasting",
            evidence=["anticipar demanda", "mostrar alertas en dashboard"],
        )

        self.assertEqual(result["primary_type"], "machine_learning")
        self.assertEqual(result["subtype"], "forecasting")
        self.assertEqual(result["secondary_capabilities"], ["dashboard_analytics", "data_engineering"])

    def test_document_qa_without_actions_is_genai_not_agentic(self):
        result = self._classify(
            requires_knowledge_retrieval=True,
            requires_document_understanding=True,
            candidate_subtype="rag",
            evidence=["responder preguntas sobre contratos"],
        )

        self.assertEqual(result["primary_type"], "generative_ai")
        self.assertEqual(result["subtype"], "rag")
        self.assertIsNone(result["agent_type"])

    def test_system_write_forces_action_agent(self):
        result = self._classify(
            requires_agentic_orchestration=True,
            writes_to_systems=True,
            agent_design="recommendation_agent",
            candidate_subtype="recommendation_agent",
            evidence=["actualiza tickets luego de evaluar el caso"],
        )

        self.assertEqual(result["primary_type"], "agentic_ai")
        self.assertEqual(result["agent_type"], "action_agent")
        self.assertEqual(result["subtype"], "action_agent")
        self.assertTrue(result["capabilities"]["writes_to_systems"])

    def test_unknown_when_no_capability_is_evidenced(self):
        result = self._classify()
        self.assertEqual(result["primary_type"], "unknown")
        self.assertEqual(result["confidence"], 0.0)


if __name__ == "__main__":
    unittest.main()
