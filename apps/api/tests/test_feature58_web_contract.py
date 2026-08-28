from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]
PAGE = ROOT / "apps/web/src/app/governance-catalog/page.tsx"
PROXY = ROOT / "apps/web/src/app/api/governance-catalog/route.ts"
NAVIGATION = ROOT / "apps/web/src/app/components/ProductNavigation.tsx"
CSS = ROOT / "apps/web/src/app/governance-catalog/GovernanceCatalog.module.css"


class Feature58WebContractTest(unittest.TestCase):
    def test_navigation_hides_governance_catalog_outside_committee(self):
        text = NAVIGATION.read_text()
        self.assertIn('href: "/governance-catalog"', text)
        self.assertIn('requiredRoles: ["committee_member"]', text)
        self.assertIn("strictRoles: true", text)
        self.assertIn("hiddenWhenRestricted: true", text)

    def test_page_requires_committee_and_directs_business_to_conversation(self):
        text = PAGE.read_text()
        self.assertIn('session?.roles.includes("committee_member")', text)
        self.assertIn("Esta capacidad es de uso exclusivo de miembros del Comité Operativo", text)
        self.assertIn("consultar las políticas vigentes únicamente a través del Intake conversacional", text)
        self.assertIn('href="/intake"', text)

    def test_web_proxy_denies_non_committee_before_backend_call(self):
        text = PROXY.read_text()
        self.assertIn('session.roles.includes("committee_member")', text)
        self.assertIn("if (!allowed)", text)
        self.assertIn("{ status: 403 }", text)
        self.assertIn("ATLAS_INTERNAL_GOVERNANCE_ADMIN_BASE", text)

    def test_catalog_ui_exposes_policy_architecture_and_audit_tabs(self):
        text = PAGE.read_text()
        self.assertIn("Políticas", text)
        self.assertIn("Patrones de arquitectura", text)
        self.assertIn("Historial / Auditoría", text)
        self.assertIn("Principio arquitectónico", text)
        self.assertIn("Motivo del cambio", text)
        self.assertIn("Nueva versión", text)
        self.assertIn("Retirar", text)

    def test_feature58_styles_exist(self):
        text = CSS.read_text()
        self.assertIn(".restricted", text)
        self.assertIn(".status_active", text)
        self.assertIn(".status_draft", text)
        self.assertIn(".status_retired", text)


if __name__ == "__main__":
    unittest.main()
