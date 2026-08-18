from __future__ import annotations

import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

try:
    from fastapi.testclient import TestClient
    from atlas_datagob.api.feature54_app import app
except ImportError:  # Lightweight dependency-free CI still validates static contracts.
    TestClient = None  # type: ignore[assignment]
    app = None


@unittest.skipIf(app is None or TestClient is None, "FastAPI integration dependencies are not installed")
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

    def test_confirmed_ready_business_case_registers_and_enters_operative_committee(self):
        business_case = {
            "business_problem": "La gerencia consolida ventas manualmente.",
            "desired_outcome": "Contar con indicadores diarios confiables.",
            "business_area": "Comercial",
            "stakeholders": ["Gerencia Comercial"],
            "impacted_process": "Seguimiento comercial",
            "current_situation": "SAP y CRM se consolidan en archivos.",
            "success_metrics": ["Reducir tiempo de consolidación"],
            "data_sources": ["SAP", "CRM"],
            "project_classification": {
                "primary_type": "dashboard_analytics",
                "subtype": "executive_dashboard",
                "agent_type": None,
                "secondary_capabilities": ["data_engineering"],
                "confidence": 0.91,
                "signals": ["indicadores diarios", "gerencia"],
            },
            "data_readiness": {
                "score": 83,
                "status": "ready",
                "gaps": [],
            },
            "architecture_assessment": {
                "status": "approved_baseline_selected",
                "pattern_id": "GCP-BI-001",
                "pattern_version": "1.0",
                "human_architecture_review_required": False,
                "gaps": [],
            },
            "policy_assessment": {
                "policy_references": ["DATA-001@1.0", "SEC-001@1.0"],
                "missing_controls": [],
            },
            "preliminary_risk": "low",
            "gaps": [],
            "recommendation": "ready_for_user_confirmation",
            "completeness": 100,
            "ready_to_register": True,
        }
        fake_state = {"business_case": business_case}

        with tempfile.TemporaryDirectory() as tmp:
            backlog_path = Path(tmp) / "demands.json"
            with patch.dict(
                os.environ,
                {
                    "ATLAS_DEMAND_REPOSITORY": "local_json",
                    "ATLAS_DEMAND_BACKLOG_PATH": str(backlog_path),
                },
                clear=False,
            ), patch(
                "atlas_datagob.api.feature54_app.get_intake_session_state",
                new=AsyncMock(return_value=fake_state),
            ):
                response = self.client.post(
                    "/intake/business-case/register",
                    json={"session_id": "INTAKE-READY123", "confirmed": True},
                )

        self.assertEqual(response.status_code, 200, response.text)
        demand = response.json()["demand"]
        self.assertEqual(demand["status"], "operative_committee_review")
        self.assertEqual(demand["classification"]["initiative_type"], "dashboard_analytics")
        self.assertEqual(
            demand["business_inputs"]["canonical_business_case"]["project_classification"]["subtype"],
            "executive_dashboard",
        )
        event_types = [event["type"] for event in demand["events"]]
        self.assertIn("status_changed", event_types)

    def test_local_governance_catalog_is_visible_as_safe_metadata(self):
        with patch.dict(
            os.environ,
            {
                "ATLAS_GOVERNANCE_BUCKET": "",
                "ATLAS_GOVERNANCE_REQUIRE_GCS": "false",
            },
            clear=False,
        ):
            response = self.client.get("/intake/governance-catalog")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["source"], "local_json")
        self.assertGreaterEqual(payload["policy_count"], 1)
        self.assertGreaterEqual(payload["architecture_pattern_count"], 1)


if __name__ == "__main__":
    unittest.main()
