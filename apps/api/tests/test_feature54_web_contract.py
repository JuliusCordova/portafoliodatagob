from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]
PAGE = ROOT / "apps/web/src/app/intake/page.tsx"
COMPONENT = ROOT / "apps/web/src/app/components/ConversationalIntake.tsx"
CONVERSATION_PROXY = ROOT / "apps/web/src/app/api/intake/conversation/route.ts"
REGISTER_PROXY = ROOT / "apps/web/src/app/api/intake/business-case/register/route.ts"
CATALOG_PROXY = ROOT / "apps/web/src/app/api/intake/governance-catalog/route.ts"
NAVIGATION = ROOT / "apps/web/src/app/components/ProductNavigation.tsx"
OPENAPI = ROOT / "docs/api/openapi.yaml"
MANIFEST = ROOT / "agents-cli-manifest.yaml"


class Feature54WebContractTest(unittest.TestCase):
    def test_intake_page_uses_conversational_component(self):
        page = PAGE.read_text()
        component = COMPONENT.read_text()

        self.assertIn("ConversationalIntake", page)
        self.assertIn("Intake conversacional gobernado", page)
        self.assertIn("Define tu necesidad conversando", component)
        self.assertIn("Caso de Negocio", component)
        self.assertIn("Confirmar y registrar requerimiento", component)
        self.assertIn("No necesitas definir tecnología", component)

    def test_frontend_calls_conversation_then_separate_registration_endpoint(self):
        component = COMPONENT.read_text()
        self.assertIn('fetch("/api/intake/conversation"', component)
        self.assertIn('fetch("/api/intake/business-case/register"', component)
        self.assertIn("confirmed: true", component)
        self.assertIn("ready_to_register", component)

    def test_nextjs_proxies_target_feature54_backend(self):
        self.assertIn("/intake/conversation", CONVERSATION_PROXY.read_text())
        self.assertIn("/intake/business-case/register", REGISTER_PROXY.read_text())
        self.assertIn("/intake/governance-catalog", CATALOG_PROXY.read_text())

    def test_product_navigation_surfaces_conversational_intake(self):
        text = NAVIGATION.read_text()
        self.assertIn('href: "/intake"', text)
        self.assertIn('label: "Intake conversacional"', text)
        self.assertIn("Gemini ADK guía", text)

    def test_openapi_is_feature54_version_and_documents_contract(self):
        text = OPENAPI.read_text()
        self.assertIn("version: 0.8.0", text)
        self.assertIn("/intake/conversation:", text)
        self.assertIn("/intake/business-case/register:", text)
        self.assertIn("/intake/governance-catalog:", text)
        self.assertIn("CanonicalBusinessCase:", text)

    def test_agents_cli_manifest_uses_current_session_type_key(self):
        text = MANIFEST.read_text()
        self.assertIn("session_type: in_memory", text)
        self.assertNotIn("session_storage:", text)


if __name__ == "__main__":
    unittest.main()
