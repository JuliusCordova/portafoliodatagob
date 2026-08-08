from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from atlas_datagob.services.operational_readiness import operational_readiness_snapshot


class OperationalReadinessTest(unittest.TestCase):
    def test_snapshot_summarizes_portfolio_and_warnings(self) -> None:
        records = [
            {
                "demand_id": "DEM-001",
                "status": "scored",
                "scoring": {"score": 4.4, "priority": "Alta"},
                "policy_gaps": [],
                "architecture_gaps": [],
                "finops_gaps": [],
                "events": [{"type": "created"}],
            },
            {
                "demand_id": "DEM-002",
                "status": "operative_committee_review",
                "scoring": {"score": 3.2},
                "policy_gaps": ["owner missing"],
                "architecture_gaps": ["semantic model missing"],
                "finops_gaps": [],
                "events": [{"type": "created"}],
            },
        ]

        with patch.dict(os.environ, {}, clear=True):
            snapshot = operational_readiness_snapshot(records)

        self.assertEqual("ATLAS DataGob", snapshot["product"])
        self.assertEqual("warning", snapshot["status"])
        self.assertEqual(2, snapshot["portfolio"]["total_demands"])
        self.assertEqual(1, snapshot["portfolio"]["scored_demands"])
        self.assertEqual(1, snapshot["portfolio"]["active_review_demands"])
        self.assertEqual(2, snapshot["portfolio"]["total_governance_gaps"])
        self.assertEqual(2, snapshot["portfolio"]["total_audit_events"])
        self.assertIn("Alta", snapshot["portfolio"]["priority_counts"])
        self.assertTrue(snapshot["recommendations"])

    def test_snapshot_is_ok_when_pilot_conditions_are_met(self) -> None:
        records = [
            {
                "demand_id": f"DEM-{index:03d}",
                "status": "scored",
                "scoring": {"score": 4.2, "priority": "Alta"},
                "policy_gaps": [],
                "architecture_gaps": [],
                "finops_gaps": [],
                "events": [{"type": "created"}],
            }
            for index in range(10)
        ]

        with patch.dict(
            os.environ,
            {
                "ATLAS_AUTH_MODE": "header",
                "ATLAS_DEMAND_REPOSITORY": "firestore",
                "ATLAS_FIRESTORE_COLLECTION": "atlas_demands",
            },
            clear=True,
        ):
            snapshot = operational_readiness_snapshot(records)

        self.assertEqual("ok", snapshot["status"])
        self.assertEqual([], snapshot["recommendations"])
        self.assertEqual("header", snapshot["runtime"]["auth"]["mode"])
        self.assertEqual("firestore", snapshot["runtime"]["persistence"]["repository_adapter"])


if __name__ == "__main__":
    unittest.main()
