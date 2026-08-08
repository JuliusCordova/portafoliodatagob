from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from atlas_datagob.services.demand_backlog import load_demo_seed_records, load_demand_records, reset_demo_backlog


class DemoReadinessTest(unittest.TestCase):
    def test_demo_seed_contains_curated_cases(self) -> None:
        records = load_demo_seed_records()

        self.assertGreaterEqual(len(records), 10)
        self.assertTrue(any(record["status"] == "scored" for record in records))
        self.assertTrue(any(record["status"] == "operative_committee_review" for record in records))
        self.assertTrue(any(record["status"] == "approved_for_scoring" for record in records))
        self.assertTrue(any(record["status"] == "reformulation_required" for record in records))
        self.assertTrue(any(record["status"] == "rejected" for record in records))
        self.assertTrue(any(record.get("request", {}).get("domain_hint") == "Clientes" for record in records))
        self.assertTrue(any(record.get("request", {}).get("requester_area") == "Finanzas" for record in records))

    def test_demo_reset_replaces_runtime_backlog_with_audit_event(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target_path = Path(directory) / "demand_backlog.json"

            records = reset_demo_backlog(path=target_path, actor="Demo Operator")
            persisted = load_demand_records(target_path)

            self.assertEqual(len(persisted), len(records))
            self.assertGreaterEqual(len(persisted), 10)
            self.assertTrue(all(record["events"][-1]["type"] == "demo_reset" for record in persisted))
            self.assertTrue(all(record["events"][-1]["actor"] == "Demo Operator" for record in persisted))
            self.assertTrue(all(record["demand_id"].startswith("DEM-DEMO-") for record in persisted))

    def test_demo_seed_materializes_as_runtime_backlog_model_records(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            runtime_model_path = Path(directory) / "data" / "runtime" / "demand_backlog.json"

            reset_demo_backlog(path=runtime_model_path, actor="Demo Seed Script")
            persisted = load_demand_records(runtime_model_path)

            self.assertTrue(runtime_model_path.exists())
            self.assertGreaterEqual(len(persisted), 10)
            for record in persisted:
                self.assertIn("demand_id", record)
                self.assertIn("status", record)
                self.assertIn("request", record)
                self.assertIn("business_inputs", record)
                self.assertIn("committee_inputs", record)
                self.assertIn("events", record)
                self.assertIsInstance(record["events"], list)


if __name__ == "__main__":
    unittest.main()
