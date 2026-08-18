from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]
API = ROOT / "apps/api/src/atlas_datagob/api/main.py"
AUTHZ = ROOT / "apps/api/src/atlas_datagob/services/authz.py"
CONTROL = ROOT / "apps/web/src/app/components/DemoControls.tsx"
PROXY = ROOT / "apps/web/src/app/api/synthetic-data/generate/route.ts"
PAGE = ROOT / "apps/web/src/app/page.tsx"
OPENAPI = ROOT / "docs/api/openapi.yaml"


class SyntheticDataContractTest(unittest.TestCase):
    def test_api_exposes_generator(self):
        text = API.read_text()

        self.assertIn(
            '@app.post("/synthetic-data/generate")',
            text,
        )
        self.assertIn(
            "generate_synthetic_demand_records",
            text,
        )

    def test_data_steward_can_generate(self):
        text = AUTHZ.read_text()

        self.assertIn(
            '"synthetic:generate"',
            text,
        )
        self.assertIn(
            'path == "/synthetic-data/generate"',
            text,
        )

    def test_web_proxy_exists(self):
        text = PROXY.read_text()

        self.assertIn(
            "/synthetic-data/generate",
            text,
        )

    def test_user_interface_has_no_seed_language(self):
        text = CONTROL.read_text().lower()

        self.assertIn(
            "generar datos sintéticos",
            text,
        )
        self.assertNotIn(
            "ver seed",
            text,
        )
        self.assertNotIn(
            "semilla",
            text,
        )
        self.assertNotIn(
            "resetear demo",
            text,
        )

    def test_openapi_documents_synthetic_generator(self):
        text = OPENAPI.read_text()

        # Feature-specific contracts must survive future API version increments.
        self.assertIn(
            "version:",
            text,
        )
        self.assertIn(
            "/synthetic-data/generate:",
            text,
        )
        self.assertIn(
            "SyntheticDataPayload:",
            text,
        )
        self.assertIn(
            "SyntheticDataGenerateResponse:",
            text,
        )

    def test_grid_marks_synthetic_provenance(self):
        text = PAGE.read_text()

        self.assertIn(
            'data_origin?: "synthetic" | "operational"',
            text,
        )
        self.assertIn(
            'item.data_origin === "synthetic"',
            text,
        )


if __name__ == "__main__":
    unittest.main()
