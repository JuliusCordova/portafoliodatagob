from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]
RUNTIME = ROOT / "apps/api/src/atlas_datagob/services/adk_intake_runtime.py"
PAGE = ROOT / "apps/web/src/app/components/ConversationalIntake.tsx"
CSS = ROOT / "apps/web/src/app/components/ConversationalIntake.module.css"


class Feature58SpecialistObservabilityContractTest(unittest.TestCase):
    def test_runtime_returns_specialist_activity_and_completion_guard(self):
        text = RUNTIME.read_text()
        self.assertIn("complete_required_governance_assessments", text)
        self.assertIn('"specialist_activity": specialist_activity', text)
        self.assertIn('invocation_prefix="governance-completion"', text)

    def test_intake_exposes_business_facing_specialist_panel(self):
        text = PAGE.read_text()
        self.assertIn("Especialistas ATLAS", text)
        self.assertIn("Validación garantizada por ATLAS", text)
        self.assertIn("specialist_activity", text)
        self.assertIn("execution_mode", text)
        self.assertIn("Ver trazabilidad técnica", text)

    def test_trace_keeps_internal_agent_ids_expanded_only(self):
        text = PAGE.read_text()
        self.assertIn("item.agent_id", text)
        self.assertIn("Trace ADK del turno", text)

    def test_specialist_styles_exist(self):
        text = CSS.read_text()
        self.assertIn(".specialistPanel", text)
        self.assertIn(".specialistGrid", text)
        self.assertIn(".specialistComplete", text)
        self.assertIn(".specialistPending", text)


if __name__ == "__main__":
    unittest.main()
