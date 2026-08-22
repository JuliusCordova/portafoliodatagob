from __future__ import annotations

import unittest
from unittest.mock import patch

from atlas_datagob.services.agent_discovery import GoogleAdkDiscoveryProvider
from atlas_datagob.services.agent_governance_service import AgentGovernanceService
from atlas_datagob.services.authz import (
    AuthContext,
    ROLE_DATA_STEWARD,
    ROLE_EXECUTIVE,
    has_permission,
    permission_for_request,
)


class _FakeResponse:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self.payload


class _FakeHttpClient:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.calls: list[dict] = []

    def get(self, url, *, headers, params):
        self.calls.append({"url": url, "headers": headers, "params": params})
        return _FakeResponse(self.payload)


class _FakeGovernanceRepository:
    def __init__(self, profile: dict, *, with_binding: bool = True) -> None:
        self.profile = profile
        self.agent = {
            "agent_id": "AGT-TEST0001",
            "canonical_name": "Test Agent",
            "governance_profile": self.profile,
            "bindings": [{"deployment_id": "google-adk:123"}] if with_binding else [],
        }
        self.findings: list[dict] = []
        self.assessment: dict | None = None

    def get_agent(self, agent_id: str):
        return self.agent if agent_id == self.agent["agent_id"] else None

    def update_governance_profile(self, agent_id: str, updates: dict, *, actor: str):
        self.profile.update(updates)
        self.agent["governance_profile"] = self.profile
        return self.profile

    def replace_findings(self, agent_id: str, findings: list[dict]) -> None:
        self.findings = findings

    def save_assessment(self, agent_id: str, assessment: dict, *, actor: str) -> None:
        self.assessment = assessment
        self.profile["governance_status"] = assessment["status"]
        self.profile["last_assessment"] = assessment


class Feature56DiscoveryTests(unittest.TestCase):
    def test_discovery_filters_to_google_adk_and_models_deployment(self) -> None:
        payload = {
            "reasoningEngines": [
                {
                    "name": "projects/p/locations/us-central1/reasoningEngines/123",
                    "displayName": "ADK Agent candidate 01",
                    "createTime": "2026-08-20T01:00:00Z",
                    "updateTime": "2026-08-20T01:01:00Z",
                    "spec": {
                        "agentFramework": "google-adk",
                        "serviceAccount": "agent@p.iam.gserviceaccount.com",
                        "deploymentSource": {"package": {}},
                    },
                },
                {
                    "name": "projects/p/locations/us-central1/reasoningEngines/999",
                    "displayName": "Other framework",
                    "spec": {"agentFramework": "langchain"},
                },
            ]
        }
        client = _FakeHttpClient(payload)
        provider = GoogleAdkDiscoveryProvider(
            project_id="p",
            location="us-central1",
            access_token="token",
            client=client,
        )

        deployments = provider.list_deployments()

        self.assertEqual(len(deployments), 1)
        deployment = deployments[0]
        self.assertEqual(deployment["deployment_id"], "google-adk:123")
        self.assertEqual(deployment["provider_deployment_id"], "123")
        self.assertEqual(deployment["framework"], "google-adk")
        self.assertEqual(deployment["service_account"], "agent@p.iam.gserviceaccount.com")
        self.assertEqual(deployment["deployment_source_kind"], "package")
        self.assertIsNone(deployment["model_name"])
        self.assertIsNone(deployment["resource_status"])
        self.assertEqual(deployment["binding_status"], "unbound")


class Feature56AssessmentTests(unittest.TestCase):
    @staticmethod
    def _complete_profile() -> dict:
        return {
            "business_owner": "Business Owner",
            "technical_owner": "Technical Owner",
            "business_purpose": "Support a governed business workflow",
            "business_area": "Operations",
            "business_criticality": "medium",
            "autonomy_level": "l1",
            "risk_level": "medium",
            "data_classification": ["internal"],
            "human_oversight": "required",
            "writes_to_systems": False,
            "required_controls": ["tool_allowlist"],
            "next_review_at": "2099-01-01T00:00:00+00:00",
            "governance_status": "not_assessed",
        }

    @patch(
        "atlas_datagob.services.agent_governance_service.load_policy_catalog",
        return_value=[
            {
                "id": "AGENT-001",
                "version": "1.0",
                "status": "active",
                "applies_to": {"project_types": ["agentic_ai"]},
                "mandatory_controls": ["tool_allowlist"],
            }
        ],
    )
    def test_complete_profile_can_be_governed(self, _catalog) -> None:
        repository = _FakeGovernanceRepository(self._complete_profile())
        service = AgentGovernanceService(repository=repository)  # type: ignore[arg-type]

        result = service.assess(agent_id="AGT-TEST0001", actor="tester")

        self.assertEqual(result["assessment"]["status"], "governed")
        self.assertEqual(result["assessment"]["score"], 100)
        self.assertEqual(result["findings"], [])
        self.assertEqual(repository.profile["applicable_policies"], ["AGENT-001@1.0"])

    @patch(
        "atlas_datagob.services.agent_governance_service.load_policy_catalog",
        return_value=[
            {
                "id": "AGENT-001",
                "version": "1.0",
                "status": "active",
                "applies_to": {"project_types": ["agentic_ai"]},
                "mandatory_controls": ["tool_allowlist"],
            }
        ],
    )
    def test_incomplete_profile_generates_findings(self, _catalog) -> None:
        repository = _FakeGovernanceRepository({"governance_status": "not_assessed"}, with_binding=False)
        service = AgentGovernanceService(repository=repository)  # type: ignore[arg-type]

        result = service.assess(agent_id="AGT-TEST0001", actor="tester")

        self.assertEqual(result["assessment"]["status"], "action_required")
        self.assertLess(result["assessment"]["score"], 100)
        self.assertGreater(len(result["findings"]), 0)
        self.assertTrue(any(item["check_key"] == "deployment_evidence_available" for item in result["findings"]))


class Feature56AuthorizationTests(unittest.TestCase):
    def test_read_is_available_but_mutations_are_operator_only(self) -> None:
        executive = AuthContext("exec", (ROLE_EXECUTIVE,), "header", True)
        steward = AuthContext("steward", (ROLE_DATA_STEWARD,), "header", True)

        self.assertTrue(has_permission(executive, "agent_governance:read"))
        self.assertFalse(has_permission(executive, "agent_governance:edit"))
        self.assertTrue(has_permission(steward, "agent_governance:edit"))
        self.assertTrue(has_permission(steward, "agent_governance:refresh"))

    def test_feature56_route_permission_mapping(self) -> None:
        self.assertEqual(
            permission_for_request("GET", "/agent-governance/summary"),
            "agent_governance:read",
        )
        self.assertEqual(
            permission_for_request("POST", "/agent-governance/discovery/refresh"),
            "agent_governance:refresh",
        )
        self.assertEqual(
            permission_for_request("POST", "/agent-governance/agents/AGT-1/assess"),
            "agent_governance:assess",
        )


if __name__ == "__main__":
    unittest.main()
