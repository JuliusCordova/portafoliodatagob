from __future__ import annotations

import os
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from atlas_datagob.api.feature54_app import app


@unittest.skipIf(app is None, "FastAPI is not installed")
class Feature54ApiRoutesTest(unittest.TestCase):
    def setUp(self) -> None:
        self.auth_patch = patch.dict(os.environ, {"ATLAS_AUTH_MODE": "disabled"})
        self.auth_patch.start()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.auth_patch.stop()

    def test_health_reports_feature54_api_version(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["version"], "0.8.0")

    def test_conversation_endpoint_returns_structured_state_without_registration(self):
        fake = {
            "session_id": "INTAKE-TEST123",
            "message": "Cuéntame qué resultado esperas conseguir.",
            "business_case": {},
            "business_context": {},
            "project_classification": {},
            "data_readiness": {},
            "architecture_assessment": {},
            "policy_assessment": {},
            "agent_trace": ["atlas_intake_orchestrator"],
        }
        with patch(
            "atlas_datagob.api.feature54_app.run_intake_turn",
            new=AsyncMock(return_value=fake),
        ):
            response = self.client.post(
                "/intake/conversation",
                json={"message": "Tenemos un problema con el inventario."},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["session_id"], "INTAKE-TEST123")
        self.assertNotIn("demand", response.json())

    def test_registration_requires_explicit_confirmation_before_session_lookup(self):
        response = self.client.post(
            "/intake/business-case/register",
            json={"session_id": "INTAKE-TEST123", "confirmed": False},
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn("confirmation", str(response.json()).lower())

    def test_local_governance_catalog_is_visible_as_safe_metadata(self):
        with patch.dict(os.environ, {"ATLAS_GOVERNANCE_BUCKET": ""}, clear=False):
            response = self.client.get("/intake/governance-catalog")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["source"], "local_json")
        self.assertGreaterEqual(payload["policy_count"], 1)
        self.assertGreaterEqual(payload["architecture_pattern_count"], 1)


if __name__ == "__main__":
    unittest.main()
