from __future__ import annotations

import asyncio
import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from google.adk.agents import Agent

from atlas_datagob.agentops.adk_telemetry import (
    _insert_row,
    agentops_run_context,
    build_agentops_callbacks,
    build_llm_usage_row,
    instrument_adk_agent_tree,
)


class _FakeCallbackContext:
    def __init__(self) -> None:
        self.state: dict[str, object] = {}
        self.invocation_id = "INV-001"
        self.session = SimpleNamespace(id="SESSION-001")
        self.user_id = "tester@atlas.local"


class _FakeUsage:
    prompt_token_count = 125
    candidates_token_count = 45
    total_token_count = 170


class _FakeResponse:
    usage_metadata = _FakeUsage()
    error_code = None
    error_message = None


class AgentOpsAdkTelemetryTest(unittest.TestCase):
    def test_run_context_correlates_fact_extractor_and_main_runtime(self):
        callback_context = _FakeCallbackContext()
        with agentops_run_context(
            requested_by="business.user@atlas.local",
            run_id="RUN-TURN-001",
            trace_id="TRACE-TURN-001",
            environment="preview",
        ):
            row = build_llm_usage_row(
                callback_context=callback_context,  # type: ignore[arg-type]
                llm_response=_FakeResponse(),  # type: ignore[arg-type]
                agent_system_id="ATLAS-DATAGOB",
                agent_id="atlas_business_fact_extractor",
                model_name="gemini-2.5-flash",
                started_ns=None,
            )

        self.assertEqual(row["agent_system_id"], "ATLAS-DATAGOB")
        self.assertEqual(row["run_id"], "RUN-TURN-001")
        self.assertEqual(row["trace_id"], "TRACE-TURN-001")
        self.assertEqual(row["session_id"], "SESSION-001")
        self.assertEqual(row["requested_by"], "business.user@atlas.local")
        self.assertEqual(row["input_tokens"], 125)
        self.assertEqual(row["output_tokens"], 45)
        self.assertEqual(row["total_tokens"], 170)
        self.assertEqual(row["status"], "SUCCESS")
        self.assertNotIn("prompt", row)
        self.assertNotIn("response", row)

    def test_bigquery_insert_uses_schema_aware_path_for_native_json(self):
        table_id = "test-project.agentops.agent_llm_usage"
        row = {
            "agent_system_id": "ATLAS-DATAGOB",
            "run_id": "RUN-001",
            "agent_id": "atlas_intake_orchestrator",
            "metadata": {"environment": "preview", "telemetry_source": "google_adk_callback"},
        }
        fake_table = object()
        fake_client = MagicMock()
        fake_client.get_table.return_value = fake_table
        fake_client.insert_rows.return_value = []

        async def _exercise() -> list[dict]:
            with patch("google.cloud.bigquery.Client", return_value=fake_client):
                return await _insert_row(table_id, row)

        errors = asyncio.run(_exercise())

        self.assertEqual(errors, [])
        fake_client.get_table.assert_called_once_with(table_id)
        fake_client.insert_rows.assert_called_once_with(fake_table, [row])
        fake_client.insert_rows_json.assert_not_called()

    def test_callbacks_are_best_effort_when_bigquery_write_fails(self):
        callback_context = _FakeCallbackContext()
        before, after = build_agentops_callbacks(
            agent_system_id="ATLAS-DATAGOB",
            agent_id="atlas_intake_orchestrator",
            model_name="gemini-2.5-flash",
        )

        async def _exercise() -> None:
            with patch.dict(
                os.environ,
                {
                    "ATLAS_AGENTOPS_ENABLED": "true",
                    "GOOGLE_CLOUD_PROJECT": "test-project",
                    "ATLAS_AGENTOPS_DATASET": "agentops",
                },
                clear=False,
            ), patch(
                "atlas_datagob.agentops.adk_telemetry._insert_row",
                side_effect=RuntimeError("synthetic BigQuery outage"),
            ):
                await before(callback_context, SimpleNamespace())  # type: ignore[arg-type]
                result = await after(callback_context, _FakeResponse())  # type: ignore[arg-type]
                self.assertIsNone(result)

        asyncio.run(_exercise())

    def test_agent_tree_instrumentation_covers_orchestrator_and_specialist(self):
        specialist = Agent(
            name="atlas_test_specialist",
            model="gemini-2.5-flash",
            mode="single_turn",
            instruction="Test specialist",
        )
        root = Agent(
            name="atlas_test_orchestrator",
            model="gemini-2.5-flash",
            instruction="Test orchestrator",
            sub_agents=[specialist],
        )

        instrument_adk_agent_tree(root, agent_system_id="ATLAS-DATAGOB")

        self.assertTrue(callable(root.before_model_callback))
        self.assertTrue(callable(root.after_model_callback))
        self.assertTrue(callable(specialist.before_model_callback))
        self.assertTrue(callable(specialist.after_model_callback))


if __name__ == "__main__":
    unittest.main()
