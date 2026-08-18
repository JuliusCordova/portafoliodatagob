from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]
AGENT = ROOT / "apps/api/src/atlas_datagob/agents/agent.py"
TOOLS = ROOT / "apps/api/src/atlas_datagob/agents/conversational_intake_tools.py"
RUNTIME = ROOT / "apps/api/src/atlas_datagob/services/adk_intake_runtime.py"
API = ROOT / "apps/api/src/atlas_datagob/api/feature54_app.py"
AUTHZ = ROOT / "apps/api/src/atlas_datagob/services/authz.py"
DOCKERFILE = ROOT / "apps/api/Dockerfile"
REQUIREMENTS = ROOT / "apps/api/requirements.txt"
SPEC = ROOT / "docs/development/FEATURE_54_CONVERSATIONAL_GOVERNED_INTAKE_ADK.md"
ARCHITECTURE_CATALOG = ROOT / "data/governance/architecture_patterns/catalog.json"
POLICY_CATALOG = ROOT / "data/governance/policies/catalog.json"


class Feature54ContractTest(unittest.TestCase):
    def test_real_adk_root_agent_has_three_specialists(self):
        text = AGENT.read_text()

        self.assertIn("from google.adk.agents import Agent", text)
        self.assertIn("root_agent = Agent(", text)
        self.assertIn("data_readiness_agent = Agent(", text)
        self.assertIn("architecture_validation_agent = Agent(", text)
        self.assertIn("policy_controls_agent = Agent(", text)
        self.assertIn("sub_agents=[", text)
        self.assertIn("data_readiness_agent", text)
        self.assertIn("architecture_validation_agent", text)
        self.assertIn("policy_controls_agent", text)

    def test_root_agent_has_no_demand_persistence_tool(self):
        text = AGENT.read_text()
        root = text[text.index("root_agent = Agent("):]

        self.assertIn("build_business_case_snapshot", root)
        self.assertNotIn("create_demand_record", root)
        self.assertNotIn("update_demand_record", root)
        self.assertNotIn("Firestore", root)

    def test_tools_use_adk_session_state_and_versioned_catalogs(self):
        text = TOOLS.read_text()

        self.assertIn('tool_context.state["business_context"]', text)
        self.assertIn('tool_context.state["project_classification"]', text)
        self.assertIn('tool_context.state["data_readiness"]', text)
        self.assertIn('tool_context.state["architecture_assessment"]', text)
        self.assertIn('tool_context.state["policy_assessment"]', text)
        self.assertIn('tool_context.state["business_case"]', text)
        self.assertIn("load_architecture_catalog", text)
        self.assertIn("load_policy_catalog", text)

    def test_runner_uses_in_memory_adk_sessions_for_feature54_mvp(self):
        text = RUNTIME.read_text()

        self.assertIn("InMemorySessionService", text)
        self.assertIn("Runner(", text)
        self.assertIn("runner.run_async(", text)
        self.assertIn("session_id", text)

    def test_api_separates_conversation_from_registration(self):
        text = API.read_text()

        self.assertIn('@app.post("/intake/conversation")', text)
        self.assertIn('@app.post("/intake/business-case/register")', text)
        self.assertIn('@app.get("/intake/governance-catalog")', text)
        self.assertIn("if not payload.confirmed", text)
        self.assertIn('business_case.get("ready_to_register")', text)
        self.assertIn("create_demand_record", text)
        self.assertIn('API_VERSION = "0.8.0"', text)

    def test_authz_maps_feature54_routes(self):
        text = AUTHZ.read_text()

        self.assertIn('path == "/intake/conversation"', text)
        self.assertIn('path == "/intake/governance-catalog"', text)
        self.assertIn('path == "/intake/business-case/register"', text)

    def test_container_starts_feature54_app(self):
        text = DOCKERFILE.read_text()
        self.assertIn("atlas_datagob.api.feature54_app:app", text)

    def test_dependencies_are_current_adk_major_and_gcs_enabled(self):
        text = REQUIREMENTS.read_text()
        self.assertIn("google-adk[gcp]>=2.0.0,<3.0.0", text)
        self.assertIn("google-cloud-storage", text)

    def test_governance_catalogs_exist_and_spec_declares_business_case_contract(self):
        self.assertTrue(ARCHITECTURE_CATALOG.exists())
        self.assertTrue(POLICY_CATALOG.exists())
        spec = SPEC.read_text()
        self.assertIn("Canonical Business Case", spec)
        self.assertIn("Gemini ADK", spec)
        self.assertIn("Architecture Validation Agent", spec)
        self.assertIn("Policy & Controls Agent", spec)
        self.assertIn("Data Readiness Agent", spec)


if __name__ == "__main__":
    unittest.main()
