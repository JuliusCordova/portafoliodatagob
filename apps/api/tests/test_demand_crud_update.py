from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from atlas_datagob.services.demand_backlog import create_demand_record, update_demand_record


class DemandCrudUpdateTest(unittest.TestCase):
    def test_updates_editable_sections_and_appends_audit_event(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "demand_backlog.json"
            demand = create_demand_record(
                {
                    "structured_request": {
                        "title": "Dashboard ejecutivo de ventas",
                        "description": "Caso priorizado para ventas.",
                        "requester_area": "Comercial",
                        "requester_role": "Domain Owner",
                        "domain_hint": "Ventas",
                        "target_consumption": "BI ejecutivo / dashboard",
                    },
                    "classification": {"initiative_type": "bi_reporting"},
                    "architecture": {"architecture_pattern": "bi_reporting"},
                    "policy_gaps": [],
                    "architecture_gaps": [],
                    "finops_gaps": [],
                    "operative_committee": {"suggested_decision": "approved_for_scoring"},
                    "committee_summary": "Caso listo para scoring.",
                    "agent_trace": ["Intake Conversation Agent"],
                },
                path=path,
            )

            updated = update_demand_record(
                demand["demand_id"],
                request_update={
                    "demand_id": "SHOULD-NOT-CHANGE",
                    "requester_area": "Ventas",
                    "domain_hint": "Clientes",
                },
                business_inputs={
                    "operational_impact": 4,
                    "van_usd": 25500,
                    "roi_percent": 80,
                },
                committee_inputs={
                    "data_readiness": 4,
                    "technical_feasibility": 4,
                    "reuse_potential": 5,
                },
                validation_state="committee_validated",
                decision="ready_for_scoring",
                actor="Data Steward",
                comment="Checklist validado por comité operativo.",
                path=path,
            )

            self.assertIsNotNone(updated)
            assert updated is not None
            self.assertEqual(updated["demand_id"], demand["demand_id"])
            self.assertEqual(updated["request"]["requester_area"], "Ventas")
            self.assertEqual(updated["request"]["domain_hint"], "Clientes")
            self.assertEqual(updated["business_inputs"]["operational_impact"], 4)
            self.assertEqual(updated["business_inputs"]["van_usd"], 25500)
            self.assertEqual(updated["committee_inputs"]["reuse_potential"], 5)
            self.assertEqual(updated["validation_state"], "committee_validated")
            self.assertEqual(updated["decision"], "ready_for_scoring")
            self.assertEqual(updated["events"][-1]["type"], "demand_updated")
            self.assertEqual(updated["events"][-1]["actor"], "Data Steward")

    def test_returns_none_when_demand_does_not_exist(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "demand_backlog.json"
            result = update_demand_record(
                "DEM-NOT-FOUND",
                business_inputs={"operational_impact": 5},
                path=path,
            )
            self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
