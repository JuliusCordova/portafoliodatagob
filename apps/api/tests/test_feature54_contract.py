from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]
AGENT = ROOT / "apps/api/src/atlas_datagob/agents/agent.py"
TOOLS = ROOT / "apps/api/src/atlas_datagob/agents/conversational_intake_tools.py"
CONTEXT_TOOL = ROOT / "apps/api/src/atlas_datagob/agents/business_context_tool.py"
FACT_EXTRACTOR = ROOT / "apps/api/src/atlas_datagob/agents/business_fact_extractor_agent.py"
BUSINESS_CASE_SNAPSHOT = ROOT / "apps/api/src/atlas_datagob/agents/business_case_snapshot.py"
SEMANTIC_TOOL = ROOT / "apps/api/src/atlas_datagob/agents/semantic_classification_tool.py"
RUNTIME = ROOT / "apps/api/src/atlas_datagob/services/adk_intake_runtime.py"
SESSION_BACKEND = ROOT / "apps/api/src/atlas_datagob/services/adk_session_backend.py"
API = ROOT / "apps/api/src/atlas_datagob/api/feature54_app.py"
AUTHZ = ROOT / "apps/api/src/atlas_datagob/services/authz.py"
DOCKERFILE = ROOT / "apps/api/Dockerfile"
REQUIREMENTS = ROOT / "apps/api/requirements.txt"
SPEC = ROOT / "docs/development/FEATURE_54_CONVERSATIONAL_GOVERNED_INTAKE_ADK.md"
ARCHITECTURE_CATALOG = ROOT / "data/governance/architecture_patterns/catalog.json"
POLICY_CATALOG = ROOT / "data/governance/policies/catalog.json"


class Feature54ContractTest(unittest.TestCase):
    def test_real_adk_root_agent_has_three_single_turn_specialists(self):
        text = AGENT.read_text()

        self.assertIn("from google.adk.agents import Agent", text)
        self.assertIn("root_agent = Agent(", text)
        self.assertIn("data_readiness_agent = Agent(", text)
        self.assertIn("architecture_validation_agent = Agent(", text)
        self.assertIn("policy_controls_agent = Agent(", text)
        self.assertGreaterEqual(text.count('mode="single_turn"'), 3)
        self.assertIn("sub_agents=[", text)
        self.assertIn("data_readiness_agent", text)
        self.assertIn("architecture_validation_agent", text)
        self.assertIn("policy_controls_agent", text)

    def test_root_agent_has_semantic_classifier_progressive_context_and_no_persistence_tool(self):
        text = AGENT.read_text()
        root = text[text.index("root_agent = Agent("):]

        self.assertIn("update_business_context", root)
        self.assertIn("classify_project_capabilities", root)
        self.assertIn("build_governed_business_case_snapshot", root)
        self.assertNotIn("create_demand_record", root)
        self.assertNotIn("update_demand_record", root)
        self.assertNotIn("Firestore", root)

    def test_mandatory_fact_extractor_is_schema_constrained_and_runtime_persists_state_delta(self):
        extractor = FACT_EXTRACTOR.read_text()
        runtime = RUNTIME.read_text()

        self.assertIn("class TurnBusinessFacts(BaseModel)", extractor)
        self.assertIn("business_fact_extractor_agent = Agent(", extractor)
        self.assertIn('mode="chat"', extractor)
        self.assertNotIn('mode="single_turn"', extractor)
        self.assertIn("output_schema=TurnBusinessFacts", extractor)
        self.assertIn("_extract_turn_business_facts", runtime)
        self.assertIn("EventActions", runtime)
        self.assertIn('"business_context": merged', runtime)
        self.assertIn('trace: list[str] = ["atlas_business_fact_extractor"]', runtime)

    def test_governed_snapshot_separates_definition_from_delivery_requirements(self):
        snapshot = BUSINESS_CASE_SNAPSHOT.read_text()
        self.assertIn('"definition_gaps": definition_gaps', snapshot)
        self.assertIn('"governance_requirements": governance_requirements', snapshot)
        self.assertIn('"gaps": definition_gaps', snapshot)
        self.assertIn("ready = completeness == 100", snapshot)

    def test_tools_use_adk_session_state_and_versioned_catalogs(self):
        tools = TOOLS.read_text()
        context_tool = CONTEXT_TOOL.read_text()
        semantic_tool = SEMANTIC_TOOL.read_text()

        self.assertIn('tool_context.state["business_context"]', context_tool)
        self.assertIn('tool_context.state["project_classification"]', semantic_tool)
        self.assertIn('tool_context.state["data_readiness"]', tools)
        self.assertIn('tool_context.state["architecture_assessment"]', tools)
        self.assertIn('tool_context.state["policy_assessment"]', tools)
        self.assertIn("load_architecture_catalog", tools)
        self.assertIn("load_policy_catalog", tools)
        self.assertIn("gemini_semantic_extraction_plus_deterministic_mapping", semantic_tool)

    def test_main_runner_supports_durable_sessions_and_fact_extractor_remains_ephemeral(self):
        runtime = RUNTIME.read_text()
        backend = SESSION_BACKEND.read_text()

        self.assertIn("build_adk_session_service", runtime)
        self.assertIn("InMemorySessionService", runtime)
        self.assertIn("VertexAiSessionService", backend)
        self.assertIn("ATLAS_ADK_SESSION_BACKEND", backend)
        self.assertIn("ATLAS_ADK_REQUIRE_DURABLE_SESSIONS", backend)
        self.assertIn("GOOGLE_CLOUD_AGENT_ENGINE_ID", backend)
        self.assertIn("Runner(", runtime)
        self.assertIn("runner.run_async(", runtime)
        self.assertIn("session_id", runtime)

    def test_runtime_prevents_blank_user_facing_response(self):
        runtime = RUNTIME.read_text()
        self.assertIn("deterministic_intake_fallback_message", runtime)
        self.assertIn("response_fallback_used = not bool(final_text)", runtime)
        self.assertIn('"response_fallback_used": response_fallback_used', runtime)

    def test_api_separates_conversation_from_registration(self):
        text = API.read_text()

        self.assertIn('@app.post("/intake/conversation")', text)
        self.assertIn('@app.post("/intake/business-case/register")', text)
        self.assertIn('@app.get("/intake/governance-catalog")', text)
        self.assertIn("if not payload.confirmed", text)
        self.assertIn('business_case.get("ready_to_register")', text)
        self.assertIn("business_case_to_validation_result", text)
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
