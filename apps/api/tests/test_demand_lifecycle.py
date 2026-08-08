from __future__ import annotations

import unittest

from atlas_datagob.services.demand_lifecycle import (
    DEMAND_RECORD_SCHEMA_VERSION,
    assert_transition_allowed,
    normalize_demand_record,
    validate_demand_record,
)


def minimal_record() -> dict:
    return {
        "demand_id": "DEM-TEST-001",
        "created_at": "2026-08-08T00:00:00+00:00",
        "updated_at": "2026-08-08T00:00:00+00:00",
        "status": "operative_committee_review",
        "decision": "pending_committee_validation",
        "current_stage": "operative_committee_review",
        "request": {
            "title": "Caso de prueba",
            "description": "Demanda sintética para validar contrato de modelo.",
            "requester_area": "Gobierno de Datos",
            "requester_role": "Data Owner",
            "domain_hint": "Clientes",
        },
        "classification": {},
        "architecture": {},
        "policy_gaps": [],
        "architecture_gaps": [],
        "finops_gaps": [],
        "committee": {},
        "committee_summary": "Caso mínimo válido.",
        "agent_trace": [],
        "events": [],
    }


class DemandLifecycleContractTest(unittest.TestCase):
    def test_normalize_adds_schema_version_and_default_sections(self) -> None:
        record = minimal_record()
        record.pop("events")

        normalized = normalize_demand_record(record)

        self.assertEqual(normalized["schema_version"], DEMAND_RECORD_SCHEMA_VERSION)
        self.assertEqual(normalized["events"], [])
        self.assertEqual(normalized["business_inputs"], {})
        self.assertEqual(normalized["committee_inputs"], {})

    def test_validate_accepts_minimum_valid_record(self) -> None:
        normalized = normalize_demand_record(minimal_record())

        validate_demand_record(normalized)

    def test_valid_transition_is_allowed(self) -> None:
        assert_transition_allowed("operative_committee_review", "scored")
        assert_transition_allowed("scored", "mvp_candidate")
        assert_transition_allowed("mvp_candidate", "production_candidate")

    def test_invalid_transition_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            assert_transition_allowed("archived", "operative_committee_review")

    def test_missing_required_request_fields_are_rejected(self) -> None:
        record = minimal_record()
        record["request"].pop("description")

        with self.assertRaises(ValueError):
            validate_demand_record(normalize_demand_record(record))


if __name__ == "__main__":
    unittest.main()
