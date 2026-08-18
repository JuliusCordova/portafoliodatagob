from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from atlas_datagob.services.demand_backlog import (
    generate_synthetic_demand_records,
)


ROOT = Path(__file__).resolve().parents[3]
TEMPLATE_PATH = (
    ROOT / "data" / "demo" / "demand_backlog_seed.json"
)


class SyntheticDataGeneratorTest(unittest.TestCase):
    def test_generation_preserves_existing_records(self):
        with tempfile.TemporaryDirectory() as tmp:
            backlog_path = Path(tmp) / "backlog.json"

            existing = [
                {
                    "demand_id": "DEM-REAL-001",
                    "created_at": "2026-08-18T00:00:00+00:00",
                    "updated_at": "2026-08-18T00:00:00+00:00",
                    "status": "intake_validated",
                    "decision": "pending",
                    "current_stage": "intake_validated",
                    "request": {
                        "title": "Demanda real",
                        "description": "Registro operativo existente.",
                        "requester_area": "Comercial",
                        "requester_role": "Data Owner",
                    },
                    "classification": {},
                    "architecture": {},
                    "committee": {},
                    "committee_summary": "",
                    "events": [],
                }
            ]

            backlog_path.write_text(
                json.dumps(existing)
            )

            result = generate_synthetic_demand_records(
                count=12,
                template_path=TEMPLATE_PATH,
                path=backlog_path,
            )

            records = json.loads(
                backlog_path.read_text()
            )

            self.assertEqual(result["count"], 12)
            self.assertEqual(
                result["total_backlog"],
                13,
            )
            self.assertEqual(
                records[0]["demand_id"],
                "DEM-REAL-001",
            )

            generated = [
                item
                for item in records
                if item.get("data_origin") == "synthetic"
            ]

            self.assertEqual(len(generated), 12)
            self.assertEqual(
                len(
                    {
                        item["demand_id"]
                        for item in generated
                    }
                ),
                12,
            )

            batch_ids = {
                item["synthetic_metadata"]["batch_id"]
                for item in generated
            }

            self.assertEqual(len(batch_ids), 1)

    def test_scored_synthetic_records_use_current_model(self):
        with tempfile.TemporaryDirectory() as tmp:
            backlog_path = Path(tmp) / "backlog.json"
            backlog_path.write_text("[]")

            result = generate_synthetic_demand_records(
                count=10,
                template_path=TEMPLATE_PATH,
                path=backlog_path,
            )

            scored = [
                item
                for item in result["demands"]
                if item.get("status") == "scored"
            ]

            self.assertTrue(scored)

            required = {
                "business_value",
                "strategic_alignment",
                "data_readiness",
                "technical_feasibility",
                "execution_effort",
                "risk_control",
            }

            for item in scored:
                components = set(
                    item["scoring"]["components"]
                )
                self.assertEqual(
                    components,
                    required,
                )

    def test_rejects_invalid_quantity(self):
        with tempfile.TemporaryDirectory() as tmp:
            backlog_path = Path(tmp) / "backlog.json"
            backlog_path.write_text("[]")

            for count in (0, 101):
                with self.subTest(count=count):
                    with self.assertRaises(ValueError):
                        generate_synthetic_demand_records(
                            count=count,
                            template_path=TEMPLATE_PATH,
                            path=backlog_path,
                        )


if __name__ == "__main__":
    unittest.main()
