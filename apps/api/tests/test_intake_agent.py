import unittest

from atlas_datagob.agents.intake_agent import classify_text


class IntakeAgentToolTests(unittest.TestCase):
    def test_classify_text_tool_returns_serializable_payload(self):
        result = classify_text(
            "Agente para intake de proyectos",
            "Chatbot con LLM y herramientas para clasificar solicitudes y recomendar preguntas.",
        )
        self.assertIn(result["initiative_type"], {"agentic_ai", "hybrid"})
        self.assertIn("confidence", result)
        self.assertIsInstance(result["signals"], list)


if __name__ == "__main__":
    unittest.main()
