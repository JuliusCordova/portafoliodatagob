from __future__ import annotations

import unittest
from unittest.mock import patch

from atlas_datagob.services.agentops_read_model import get_agentops_overview, validate_days


class AgentOpsReadModelTest(unittest.TestCase):
    def test_validate_days_enforces_dashboard_window(self):
        self.assertEqual(validate_days(1), 1)
        self.assertEqual(validate_days(14), 14)
        self.assertEqual(validate_days(90), 90)
        with self.assertRaises(ValueError):
            validate_days(0)
        with self.assertRaises(ValueError):
            validate_days(91)

    def test_overview_keeps_observed_run_semantics_explicit(self):
        summary = {
            "observed_runs": 1,
            "llm_calls": 13,
            "observed_agents": 5,
            "input_tokens": 23052,
            "output_tokens": 1196,
            "total_tokens": 27454,
            "success_rate": 100.0,
            "avg_latency_ms": 2393.0,
            "p90_latency_ms": 5445,
            "first_observed_at": "2026-08-29T23:11:37+00:00",
            "last_observed_at": "2026-08-29T23:12:14+00:00",
        }
        agents = [
            {
                "agent_id": "atlas_intake_orchestrator",
                "model_name": "gemini-2.5-flash",
                "llm_calls": 6,
                "observed_runs": 1,
                "total_tokens": 20332,
                "success_rate": 100.0,
            }
        ]
        runs = [
            {
                "run_id": "RUN-9590140E24534EFC",
                "trace_id": "RUN-9590140E24534EFC",
                "llm_calls": 13,
                "observed_agents": 5,
                "agent_ids": "atlas_business_fact_extractor,atlas_intake_orchestrator",
                "total_tokens": 27454,
                "status": "SUCCESS",
            }
        ]
        artifacts = [
            {
                "artifact_id": "ART-001",
                "run_id": "RUN-9590140E24534EFC",
                "agent_id": "atlas_architecture_validation_agent",
                "artifact_type": "architecture_recommendation",
                "name": "Architecture recommendation",
                "uri": "gs://preview/artifacts/ART-001.json",
                "created_at": "2026-08-29T23:12:10+00:00",
            }
        ]
        alerts = [
            {
                "alert_id": "ALT-001",
                "agent_system_id": "ATLAS-DATAGOB",
                "agent_id": "atlas_policy_controls_agent",
                "run_id": "RUN-9590140E24534EFC",
                "severity": "WARNING",
                "title": "Latency threshold observed",
                "source": "agentops",
                "acknowledged": False,
                "created_at": "2026-08-29T23:12:12+00:00",
            }
        ]

        with patch(
            "atlas_datagob.services.agentops_read_model._table_id",
            return_value="test-project.agentops_preview.agent_llm_usage",
        ), patch(
            "atlas_datagob.services.agentops_read_model._query",
            side_effect=[[summary], agents, runs, artifacts, alerts],
        ) as query:
            result = get_agentops_overview(days=14)

        self.assertEqual(query.call_count, 5)
        self.assertEqual(result["summary"]["llm_calls"], 13)
        self.assertEqual(result["agents"][0]["agent_id"], "atlas_intake_orchestrator")
        self.assertEqual(result["runs"][0]["run_id"], "RUN-9590140E24534EFC")
        self.assertEqual(result["artifacts"][0]["artifact_id"], "ART-001")
        self.assertEqual(result["alerts"][0]["alert_id"], "ALT-001")
        self.assertEqual(
            result["source"]["run_semantics"],
            "distinct_run_id_observed_in_agent_llm_usage",
        )
        self.assertEqual(
            result["source"]["artifact_semantics"],
            "persisted_artifacts_linked_to_llm_observed_runs",
        )
        self.assertEqual(
            result["source"]["alert_semantics"],
            "persisted_alerts_for_agent_system_or_observed_runs",
        )
        self.assertFalse(result["source"]["run_lifecycle_instrumented"])
        self.assertEqual(result["source"]["cost_semantics"], "not_available_in_this_increment")


if __name__ == "__main__":
    unittest.main()
