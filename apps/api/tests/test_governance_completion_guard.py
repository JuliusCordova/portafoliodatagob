from __future__ import annotations

import unittest
from unittest.mock import patch

from atlas_datagob.services.governance_completion_guard import (
    complete_required_governance_assessments,
    specialist_activity_snapshot,
)


class GovernanceCompletionGuardTest(unittest.TestCase):
    def test_classified_initiative_gets_architecture_when_llm_skips_specialist(self):
        state = {
            "project_classification": {
                "primary_type": "dashboard_analytics",
                "capabilities": {"writes_to_systems": False},
            },
            "data_readiness": {},
            "architecture_assessment": {},
            "policy_assessment": {},
        }
        expected = {
            "status": "approved_baseline_selected",
            "pattern_id": "GCP-BI-001",
            "pattern_version": "1.1",
            "project_type": "dashboard_analytics",
        }

        def fake_validate(*, project_type, proposed_architecture, tool_context):
            self.assertEqual(project_type, "dashboard_analytics")
            self.assertEqual(proposed_architecture, "")
            tool_context.state["architecture_assessment"] = expected
            return expected

        with patch(
            "atlas_datagob.services.governance_completion_guard.validate_gcp_architecture_governed",
            side_effect=fake_validate,
        ):
            delta, activities = complete_required_governance_assessments(state)

        self.assertEqual(delta["architecture_assessment"], expected)
        self.assertEqual(activities[0]["specialist"], "architecture")
        self.assertEqual(activities[0]["execution_mode"], "runtime_guard")

    def test_policy_guard_does_not_assume_data_sensitivity(self):
        state = {
            "project_classification": {"primary_type": "agentic_ai"},
            "data_readiness": {},
            "architecture_assessment": {"pattern_id": "GCP-AGENT-001", "pattern_version": "1.0"},
            "policy_assessment": {},
        }

        with patch(
            "atlas_datagob.services.governance_completion_guard.evaluate_governance_policies_governed"
        ) as evaluate:
            delta, activities = complete_required_governance_assessments(state)

        evaluate.assert_not_called()
        self.assertNotIn("policy_assessment", delta)
        self.assertFalse(any(item["specialist"] == "policies" for item in activities))

    def test_policy_guard_runs_only_after_sensitivity_is_explicit(self):
        state = {
            "project_classification": {
                "primary_type": "agentic_ai",
                "capabilities": {"writes_to_systems": True},
            },
            "data_readiness": {"score": 100, "status": "ready", "sensitive_data": False},
            "architecture_assessment": {"pattern_id": "GCP-AGENT-001", "pattern_version": "1.0"},
            "policy_assessment": {},
        }
        expected = {
            "status": "controls_required",
            "policy_references": ["AGENT-001@1.1"],
            "missing_controls": ["human_approval_for_material_actions"],
        }

        def fake_evaluate(*, project_type, known_controls, sensitive_data, writes_to_systems, tool_context):
            self.assertEqual(project_type, "agentic_ai")
            self.assertEqual(known_controls, [])
            self.assertFalse(sensitive_data)
            self.assertTrue(writes_to_systems)
            tool_context.state["policy_assessment"] = expected
            return expected

        with patch(
            "atlas_datagob.services.governance_completion_guard.evaluate_governance_policies_governed",
            side_effect=fake_evaluate,
        ):
            delta, activities = complete_required_governance_assessments(state)

        self.assertEqual(delta["policy_assessment"], expected)
        self.assertEqual(activities[0]["specialist"], "policies")
        self.assertEqual(activities[0]["execution_mode"], "runtime_guard")

    def test_activity_snapshot_distinguishes_adk_and_runtime_guard(self):
        state = {
            "data_readiness": {"score": 83, "status": "ready"},
            "architecture_assessment": {
                "pattern_id": "GCP-BI-001",
                "pattern_version": "1.1",
            },
            "policy_assessment": {},
        }
        trace = ["atlas_data_readiness_agent"]
        guards = [
            {
                "specialist": "architecture",
                "agent_id": "atlas_architecture_validation_agent",
                "execution_mode": "runtime_guard",
                "summary": "GCP-BI-001@1.1",
            }
        ]

        activity = specialist_activity_snapshot(state, trace, guards)
        by_key = {item["key"]: item for item in activity}

        self.assertEqual(by_key["data_readiness"]["execution_mode"], "adk_agent")
        self.assertEqual(by_key["architecture"]["execution_mode"], "runtime_guard")
        self.assertEqual(by_key["policies"]["execution_mode"], "not_run")
        self.assertEqual(by_key["architecture"]["summary"], "GCP-BI-001@1.1")


if __name__ == "__main__":
    unittest.main()
