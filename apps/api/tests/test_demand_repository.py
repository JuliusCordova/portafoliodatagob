from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from atlas_datagob.services.demand_lifecycle import DEMAND_RECORD_SCHEMA_VERSION
from atlas_datagob.services.demand_repository import LocalJsonDemandRepository, demand_repository_for


def valid_record() -> dict:
    return {
        "demand_id": "DEM-TEST-001",
        "created_at": "2026-08-08T00:00:00+00:00",
        "updated_at": "2026-08-08T00:00:00+00:00",
        "status": "intake_validated",
        "decision": "pending",
        "current_stage": "intake_validated",
        "request": {
            "title": "Caso sintético de clientes",
            "description": "Demanda de prueba para validar persistencia administrable.",
            "requester_area": "Comercial",
            "requester_role": "Data Owner",
            "domain_hint": "Clientes",
        },
        "classification": {"initiative_type": "bi_reporting"},
        "architecture": {"architecture_pattern": "bi_reporting"},
        "policy_gaps": [],
        "architecture_gaps": [],
        "finops_gaps": [],
        "committee": {},
        "committee_summary": "Caso listo para repositorio local.",
        "agent_trace": ["Intake Conversation Agent"],
        "events": [],
    }


class DemandRepositoryTest(unittest.TestCase):
    def test_local_repository_persists_normalized_records(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "demand_backlog.json"
            repository = LocalJsonDemandRepository(path)

            repository.replace_all([valid_record()])
            records = repository.load_all()

            self.assertEqual(1, len(records))
            self.assertEqual("DEM-TEST-001", records[0]["demand_id"])
            self.assertEqual(DEMAND_RECORD_SCHEMA_VERSION, records[0]["schema_version"])
            self.assertEqual([], records[0]["events"])

    def test_repository_factory_returns_local_adapter(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repository = demand_repository_for(Path(directory) / "demand_backlog.json")

            self.assertIsInstance(repository, LocalJsonDemandRepository)

    def test_local_repository_rejects_invalid_records_before_persisting(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "demand_backlog.json"
            repository = LocalJsonDemandRepository(path)
            record = valid_record()
            record["status"] = "invalid_status"

            with self.assertRaises(ValueError):
                repository.replace_all([record])

            self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
