from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from atlas_datagob.services.demand_backlog import create_demand_record, list_demand_records
from atlas_datagob.services.persistence_config import (
    DEFAULT_REPOSITORY_ADAPTER,
    FIRESTORE_REPOSITORY_ADAPTER,
    persistence_configuration_snapshot,
    validate_persistence_configuration,
)


def sample_validation_result() -> dict:
    return {
        "structured_request": {
            "title": "Caso configurado por ambiente",
            "description": "Validar que el backlog usa el path configurado por variable de entorno.",
            "requester_area": "Gobierno de Datos",
            "requester_role": "Data Owner",
            "domain_hint": "Clientes",
            "target_consumption": "BI ejecutivo / dashboard",
        },
        "classification": {"initiative_type": "bi_reporting", "confidence": 0.8, "rationale": "Caso BI."},
        "architecture": {"architecture_pattern": "bi_reporting"},
        "policy_gaps": [],
        "architecture_gaps": [],
        "finops_gaps": [],
        "operative_committee": {
            "suggested_decision": "approved_for_scoring",
            "committee_stage": "operative_committee_review",
        },
        "committee_summary": "Caso listo para probar persistencia configurable.",
        "agent_trace": ["Intake Conversation Agent"],
    }


class PersistenceConfigurationTest(unittest.TestCase):
    def test_default_persistence_configuration_is_local_json(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            snapshot = persistence_configuration_snapshot()

        self.assertEqual(DEFAULT_REPOSITORY_ADAPTER, snapshot["repository_adapter"])
        self.assertEqual("data/runtime/demand_backlog.json", snapshot["demand_backlog_path"])
        self.assertEqual("data/demo/demand_backlog_seed.json", snapshot["demo_seed_path"])
        self.assertIn(DEFAULT_REPOSITORY_ADAPTER, snapshot["supported_repository_adapters"])

    def test_firestore_persistence_configuration_is_supported(self) -> None:
        with patch.dict(
            os.environ,
            {
                "ATLAS_DEMAND_REPOSITORY": FIRESTORE_REPOSITORY_ADAPTER,
                "ATLAS_FIRESTORE_COLLECTION": "atlas_test_demands",
            },
            clear=True,
        ):
            snapshot = persistence_configuration_snapshot()

        self.assertEqual(FIRESTORE_REPOSITORY_ADAPTER, snapshot["repository_adapter"])
        self.assertEqual("atlas_test_demands", snapshot["firestore_collection"])
        self.assertIn(FIRESTORE_REPOSITORY_ADAPTER, snapshot["supported_repository_adapters"])

    def test_invalid_repository_adapter_fails_fast(self) -> None:
        with patch.dict(os.environ, {"ATLAS_DEMAND_REPOSITORY": "unsupported_store"}, clear=True):
            with self.assertRaises(ValueError):
                validate_persistence_configuration()

    def test_demand_backlog_uses_configured_runtime_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            runtime_path = Path(directory) / "configured_backlog.json"
            with patch.dict(os.environ, {"ATLAS_DEMAND_BACKLOG_PATH": str(runtime_path)}, clear=False):
                record = create_demand_record(sample_validation_result())
                records = list_demand_records()

            self.assertTrue(runtime_path.exists())
            self.assertEqual(1, len(records))
            self.assertEqual(record["demand_id"], records[0]["demand_id"])
            self.assertEqual("approved_for_scoring", records[0]["status"])


if __name__ == "__main__":
    unittest.main()
