from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from atlas_datagob.services.demand_backlog import (
    create_demand_record,
    get_demand_record,
    list_demand_records,
    update_demand_record_status,
)


def sample_validation_result() -> dict:
    return {
        "structured_request": {
            "title": "Dashboard ejecutivo de clientes",
            "description": "Crear dashboard con calidad y gobierno.",
            "requester_area": "Negocio",
            "requester_role": "Domain Owner",
            "domain_hint": "Clientes",
            "target_consumption": "BI",
        },
        "classification": {
            "initiative_type": "data_engineering",
            "confidence": 0.72,
            "rationale": "Señales de integración y consumo BI.",
        },
        "architecture": {
            "architecture_pattern": "bi_reporting",
            "is_compliant": False,
            "missing_components": ["semantic_model"],
            "architecture_gaps": ["Falta modelo semántico."],
            "human_architecture_review_required": True,
        },
        "policy_gaps": ["Definir dataset certificado."],
        "architecture_gaps": ["Falta modelo semántico."],
        "finops_gaps": ["Definir presupuesto."],
        "operative_committee": {
            "committee_stage": "operative_committee_policy_review",
            "suggested_decision": "reformulation_required",
            "data_architect_final_validation_required": True,
            "required_review_roles": ["Data Architect", "Data Owner", "Data Steward"],
        },
        "committee_summary": "Debe pasar por Comité Operativo.",
        "recommended_next_action": "reformulation_required",
        "agent_trace": [
            "Intake Conversation Agent",
            "Policy Retrieval Agent",
            "Architecture Compliance Agent",
            "Operative Committee Routing Agent",
        ],
    }


class DemandBacklogTest(unittest.TestCase):
    def test_create_and_list_demand_record(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "demand_backlog.json"
            record = create_demand_record(sample_validation_result(), path=path)

            self.assertTrue(record["demand_id"].startswith("DEM-"))
            self.assertEqual("reformulation_required", record["status"])
            self.assertEqual("reformulation_required", record["decision"])
            self.assertEqual(1, len(record["events"]))

            records = list_demand_records(path=path)
            self.assertEqual(1, len(records))
            self.assertEqual(record["demand_id"], records[0]["demand_id"])

    def test_get_and_update_status_appends_trace_event(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "demand_backlog.json"
            record = create_demand_record(sample_validation_result(), path=path)

            updated = update_demand_record_status(
                record["demand_id"],
                status="approved_for_scoring",
                decision="approved_for_scoring",
                comment="Aprobado por Arquitecto de Datos para scoring.",
                actor="Data Architect",
                path=path,
            )

            self.assertIsNotNone(updated)
            self.assertEqual("approved_for_scoring", updated["status"])
            self.assertEqual(2, len(updated["events"]))
            self.assertEqual("status_changed", updated["events"][-1]["type"])

            fetched = get_demand_record(record["demand_id"], path=path)
            self.assertEqual("approved_for_scoring", fetched["status"])


if __name__ == "__main__":
    unittest.main()
