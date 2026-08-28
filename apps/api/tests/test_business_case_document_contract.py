from __future__ import annotations

from pathlib import Path
import unittest

from atlas_datagob.services.authz import permission_for_request

ROOT = Path(__file__).resolve().parents[3]


class BusinessCaseDocumentContractTest(unittest.TestCase):
    def test_document_endpoint_is_versioned_and_governed(self) -> None:
        openapi = (ROOT / "docs" / "api" / "openapi.yaml").read_text(encoding="utf-8")
        requirements = (ROOT / "apps" / "api" / "requirements.txt").read_text(encoding="utf-8")

        self.assertIn("/intake/business-case/document:", openapi)
        self.assertIn("BusinessCaseDocumentPayload", openapi)
        self.assertIn(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            openapi,
        )
        self.assertIn("python-docx>=1.1,<2.0", requirements)
        self.assertEqual(
            permission_for_request("POST", "/intake/business-case/document"),
            "intake:validate",
        )

    def test_web_download_is_tied_to_definition_of_ready(self) -> None:
        component = (
            ROOT / "apps" / "web" / "src" / "app" / "components" / "ConversationalIntake.tsx"
        ).read_text(encoding="utf-8")
        proxy = (
            ROOT
            / "apps"
            / "web"
            / "src"
            / "app"
            / "api"
            / "intake"
            / "business-case"
            / "document"
            / "route.ts"
        ).read_text(encoding="utf-8")

        self.assertIn("Descargar Caso de Negocio (.docx)", component)
        self.assertIn("disabled={!ready || !sessionId || downloading}", component)
        self.assertIn("/api/intake/business-case/document", component)
        self.assertIn("/intake/business-case/document", proxy)
        self.assertIn("content-disposition", proxy)


if __name__ == "__main__":
    unittest.main()
