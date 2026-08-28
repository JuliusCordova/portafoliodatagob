from datetime import datetime, timezone
import unittest

from atlas_datagob.agentops.contracts import (
    AgentRun,
    AgentRunStep,
    AgentSystem,
    CostAttribution,
    GovernedAgent,
    LLMUsage,
)


NOW = datetime.now(timezone.utc)


class AgentOpsContractsTest(unittest.TestCase):
    def test_shared_identity_and_run_correlation(self):
        system = AgentSystem(
            agent_system_id="ATLAS-DATAGOB",
            name="ATLAS DataGob",
            environment="preview",
        )
        agent = GovernedAgent(
            agent_system_id=system.agent_system_id,
            agent_id="atlas_architecture_validation_agent",
            canonical_name="Especialista de Arquitectura",
            runtime="google-adk",
            model_provider="google",
            model_name="gemini",
        )
        run = AgentRun(
            agent_system_id=system.agent_system_id,
            agent_id=agent.agent_id,
            run_id="RUN-001",
            trace_id="TRACE-001",
            environment="preview",
            status="completed",
            started_at=NOW,
        )
        step = AgentRunStep(
            run_id=run.run_id,
            trace_id=run.trace_id,
            step_id="STEP-001",
            agent_id=agent.agent_id,
            step_type="specialist",
            execution_mode="adk_agent",
            status="completed",
            started_at=NOW,
        )
        usage = LLMUsage(
            agent_system_id=system.agent_system_id,
            run_id=run.run_id,
            trace_id=run.trace_id,
            session_id="SESSION-001",
            requested_by="business.user@atlas.local",
            agent_id=agent.agent_id,
            model_provider="google",
            model_name="gemini-2.5-flash",
            total_tokens=1200,
            latency_ms=450,
            status="SUCCESS",
            observed_at=NOW,
        )

        self.assertEqual(run.agent_system_id, agent.agent_system_id)
        self.assertEqual(step.run_id, run.run_id)
        self.assertEqual(usage.agent_system_id, run.agent_system_id)
        self.assertEqual(usage.trace_id, run.trace_id)
        self.assertEqual(usage.session_id, "SESSION-001")
        self.assertEqual(usage.status, "SUCCESS")
        self.assertEqual(step.execution_mode, "adk_agent")

    def test_cost_semantics_are_explicit(self):
        billed = CostAttribution(
            cost_record_id="COST-001",
            cost_semantics="billed",
            amount=10.25,
            currency="USD",
            period_start=NOW,
            period_end=NOW,
        )
        attributed = CostAttribution(
            cost_record_id="COST-002",
            cost_semantics="attributed",
            amount=2.10,
            currency="USD",
            period_start=NOW,
            period_end=NOW,
            attribution_method="direct-resource-evidence",
        )
        self.assertEqual(billed.cost_semantics, "billed")
        self.assertEqual(attributed.cost_semantics, "attributed")


if __name__ == "__main__":
    unittest.main()
