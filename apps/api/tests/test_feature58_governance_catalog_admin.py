from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from atlas_datagob.api.governance_admin_app import app
from atlas_datagob.services.authz import AUTH_MODE_HEADER, AuthorizationError, authorize_request
from atlas_datagob.services.governance_catalog_admin import (
    GovernanceCatalogAdminError,
    activate_version,
    clone_version,
    create_draft,
    delete_draft,
    list_audit_events,
    list_catalog_versions,
    retire_version,
    update_draft,
)


ACTIVE_POLICY = {
    "id": "ML-001",
    "version": "1.0",
    "status": "active",
    "name": "Machine Learning production readiness",
    "applies_to": {"project_types": ["machine_learning"]},
    "mandatory_controls": ["model_registry", "drift_monitoring"],
    "recommendation": "Models require governed production controls.",
}

NEW_POLICY = {
    "id": "AI-002",
    "version": "1.0",
    "status": "draft",
    "name": "AI human oversight",
    "applies_to": {"project_types": ["generative_ai", "agentic_ai"]},
    "mandatory_controls": ["human_oversight", "audit_logging"],
    "recommendation": "Material AI decisions require defined human oversight.",
}

ARCHITECTURE_DRAFT = {
    "id": "GCP-STREAMING-001",
    "version": "1.0",
    "status": "draft",
    "name": "Governed Streaming Lifecycle",
    "project_types": ["data_engineering"],
    "required_components": ["sources", "streaming_ingestion", "silver", "monitoring"],
    "gcp_services": ["Pub/Sub", "Dataflow", "BigQuery", "Cloud Monitoring"],
    "principle": "Streaming data must preserve governance, observability and controlled serving.",
}


class LocalCatalogFixture(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        (self.root / "policies").mkdir(parents=True)
        (self.root / "architecture_patterns").mkdir(parents=True)
        (self.root / "policies" / "catalog.json").write_text(
            json.dumps([ACTIVE_POLICY], indent=2) + "\n",
            encoding="utf-8",
        )
        (self.root / "architecture_patterns" / "catalog.json").write_text("[]\n", encoding="utf-8")
        self.env = patch.dict(
            os.environ,
            {
                "ATLAS_GOVERNANCE_ADMIN_REQUIRE_GCS": "false",
                "ATLAS_GOVERNANCE_ADMIN_LOCAL_ROOT": str(self.root),
            },
            clear=True,
        )
        self.env.start()

    def tearDown(self) -> None:
        self.env.stop()
        self.temp_dir.cleanup()


class Feature58GovernanceCatalogStoreTest(LocalCatalogFixture):
    def test_create_update_activate_retire_preserves_versions_and_audit(self) -> None:
        created = create_draft(
            "policies",
            NEW_POLICY,
            actor="committee@example.com",
            change_note="Create human oversight policy draft",
        )
        self.assertEqual("draft", created["record"]["status"])

        updated = update_draft(
            "policies",
            "AI-002",
            "1.0",
            {"mandatory_controls": ["human_oversight", "audit_logging", "fallback"]},
            actor="committee@example.com",
            change_note="Add fallback control",
        )
        self.assertIn("fallback", updated["record"]["mandatory_controls"])

        activated = activate_version(
            "policies",
            "AI-002",
            "1.0",
            actor="committee@example.com",
            change_note="Approve policy for governed use",
        )
        self.assertEqual("active", activated["record"]["status"])

        retired = retire_version(
            "policies",
            "AI-002",
            "1.0",
            actor="committee@example.com",
            change_note="Retire policy from future evaluations",
        )
        self.assertEqual("retired", retired["record"]["status"])

        records = list_catalog_versions("policies")["records"]
        self.assertEqual(2, len(records))
        self.assertEqual("active", next(item for item in records if item["id"] == "ML-001")["status"])
        self.assertEqual("retired", next(item for item in records if item["id"] == "AI-002")["status"])

        audit = list_audit_events()
        self.assertEqual(4, audit["count"])
        self.assertEqual(
            {"draft_created", "draft_updated", "version_activated", "version_retired"},
            {event["action"] for event in audit["events"]},
        )
        self.assertTrue(all(event["actor"] == "committee@example.com" for event in audit["events"]))

    def test_activation_retires_previous_active_version_for_same_id(self) -> None:
        clone_version(
            "policies",
            "ML-001",
            "1.0",
            "1.1",
            actor="committee@example.com",
            change_note="Prepare policy revision",
        )
        activate_version(
            "policies",
            "ML-001",
            "1.1",
            actor="committee@example.com",
            change_note="Publish revised ML policy",
        )
        versions = list_catalog_versions("policies")["records"]
        by_version = {item["version"]: item for item in versions if item["id"] == "ML-001"}
        self.assertEqual("retired", by_version["1.0"]["status"])
        self.assertEqual("active", by_version["1.1"]["status"])

    def test_only_drafts_can_be_physically_deleted(self) -> None:
        with self.assertRaises(GovernanceCatalogAdminError):
            delete_draft(
                "policies",
                "ML-001",
                "1.0",
                actor="committee@example.com",
                change_note="Should not delete active policy",
            )

        create_draft(
            "policies",
            NEW_POLICY,
            actor="committee@example.com",
            change_note="Temporary draft",
        )
        delete_draft(
            "policies",
            "AI-002",
            "1.0",
            actor="committee@example.com",
            change_note="Discard unapproved draft",
        )
        ids = {item["id"] for item in list_catalog_versions("policies")["records"]}
        self.assertNotIn("AI-002", ids)

    def test_architecture_pattern_preserves_components_services_and_principle(self) -> None:
        created = create_draft(
            "architecture_patterns",
            ARCHITECTURE_DRAFT,
            actor="committee@example.com",
            change_note="Add governed streaming architecture",
        )
        record = created["record"]
        self.assertEqual("draft", record["status"])
        self.assertIn("Dataflow", record["gcp_services"])
        self.assertIn("streaming_ingestion", record["required_components"])
        self.assertTrue(record["principle"].startswith("Streaming data"))


class Feature58AuthorizationTest(unittest.TestCase):
    def test_direct_policy_catalog_is_committee_only(self) -> None:
        with patch.dict(os.environ, {"ATLAS_AUTH_MODE": AUTH_MODE_HEADER}, clear=True):
            with self.assertRaises(AuthorizationError):
                authorize_request(
                    "GET",
                    "/policies",
                    {"x-atlas-user": "owner@example.com", "x-atlas-roles": "data_owner"},
                )
            with self.assertRaises(AuthorizationError):
                authorize_request(
                    "GET",
                    "/policies",
                    {"x-atlas-user": "admin@example.com", "x-atlas-roles": "platform_admin"},
                )
            context = authorize_request(
                "GET",
                "/policies",
                {"x-atlas-user": "committee@example.com", "x-atlas-roles": "committee_member"},
            )
        self.assertEqual("committee@example.com", context.user)


@unittest.skipIf(app is None, "FastAPI not installed")
class Feature58GovernanceAdminApiTest(LocalCatalogFixture):
    def setUp(self) -> None:
        super().setUp()
        self.env.stop()
        self.env = patch.dict(
            os.environ,
            {
                "ATLAS_AUTH_MODE": AUTH_MODE_HEADER,
                "ATLAS_GOVERNANCE_ADMIN_REQUIRE_GCS": "false",
                "ATLAS_GOVERNANCE_ADMIN_LOCAL_ROOT": str(self.root),
            },
            clear=True,
        )
        self.env.start()
        self.client = TestClient(app)
        self.committee_headers = {
            "X-ATLAS-USER": "committee@example.com",
            "X-ATLAS-ROLES": "committee_member",
        }

    def test_health_is_public(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(200, response.status_code)
        self.assertEqual("committee_member", response.json()["access_boundary"])

    def test_business_and_platform_admin_without_committee_are_forbidden(self) -> None:
        business = self.client.get(
            "/governance/catalog/policies",
            headers={"X-ATLAS-USER": "owner@example.com", "X-ATLAS-ROLES": "data_owner"},
        )
        platform = self.client.get(
            "/governance/catalog/policies",
            headers={"X-ATLAS-USER": "admin@example.com", "X-ATLAS-ROLES": "platform_admin"},
        )
        self.assertEqual(403, business.status_code)
        self.assertEqual(403, platform.status_code)

    def test_committee_can_list_and_create_draft(self) -> None:
        listing = self.client.get("/governance/catalog/policies", headers=self.committee_headers)
        self.assertEqual(200, listing.status_code)
        self.assertEqual(1, listing.json()["count"])

        created = self.client.post(
            "/governance/catalog/policies",
            headers=self.committee_headers,
            json={
                "record": NEW_POLICY,
                "change_note": "Create policy for committee review",
            },
        )
        self.assertEqual(200, created.status_code)
        self.assertEqual("draft", created.json()["record"]["status"])


if __name__ == "__main__":
    unittest.main()
