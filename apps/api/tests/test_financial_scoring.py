from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from atlas_datagob.domain.models import ScoringInput
from atlas_datagob.services.demand_backlog import create_demand_record, update_demand_record_scoring
from atlas_datagob.services.financial_scoring import (
    FinancialAssumptions,
    GovernedScoringInput,
    calculate_financial_metrics,
    calculate_governed_scoring,
)


class FinancialScoringTest(unittest.TestCase):
    def test_financial_metrics_are_calculated_from_explicit_assumptions(self) -> None:
        metrics = calculate_financial_metrics(
            FinancialAssumptions(
                initial_investment_usd=100000,
                annual_benefit_usd=60000,
                annual_operating_cost_usd=10000,
                time_horizon_years=3,
                discount_rate=0.10,
            )
        )

        self.assertGreater(metrics["van_usd"], 0)
        self.assertEqual(metrics["cashflows"], [-100000, 50000, 50000, 50000])
        self.assertEqual(metrics["roi"], 0.5)
        self.assertEqual(metrics["payback_months"], 24.0)
        self.assertIsNotNone(metrics["tir"])

    def test_governed_scoring_combines_priority_and_financials(self) -> None:
        result = calculate_governed_scoring(
            GovernedScoringInput(
                scoring=ScoringInput(
                    strategic_alignment=5,
                    business_value=5,
                    urgency=4,
                    data_readiness=4,
                    governance_risk=2,
                    technical_feasibility=4,
                ),
                financials=FinancialAssumptions(
                    initial_investment_usd=50000,
                    annual_benefit_usd=40000,
                    annual_operating_cost_usd=5000,
                    time_horizon_years=3,
                    discount_rate=0.12,
                ),
            )
        )

        self.assertEqual(result["priority"], "Alta")
        self.assertGreaterEqual(result["score"], 4.0)
        self.assertIn("financials", result)
        self.assertEqual(result["financial_signal"], "positive")
        self.assertEqual(result["model_version"], "scoring-financial-v1")

    def test_scoring_result_is_persisted_with_audit_event(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "demand_backlog.json"
            demand = create_demand_record(
                {
                    "structured_request": {
                        "title": "Dashboard ejecutivo de ventas",
                        "description": "Caso priorizado para tablero de ventas.",
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
                    "operative_committee": {
                        "suggested_decision": "approved_for_scoring",
                        "committee_stage": "operative_committee_review",
                    },
                    "committee_summary": "Caso listo para scoring.",
                    "agent_trace": ["Intake Conversation Agent"],
                },
                path=path,
            )
            scoring = calculate_governed_scoring(
                GovernedScoringInput(
                    scoring=ScoringInput(
                        strategic_alignment=5,
                        business_value=5,
                        urgency=4,
                        data_readiness=4,
                        governance_risk=2,
                        technical_feasibility=4,
                    ),
                    financials=FinancialAssumptions(
                        initial_investment_usd=75000,
                        annual_benefit_usd=50000,
                        annual_operating_cost_usd=5000,
                    ),
                )
            )

            updated = update_demand_record_scoring(
                demand["demand_id"],
                scoring_result=scoring,
                actor="Portfolio Owner",
                comment="Supuestos financieros validados por comité.",
                path=path,
            )

            self.assertIsNotNone(updated)
            assert updated is not None
            self.assertEqual(updated["status"], "scored")
            self.assertEqual(updated["scoring"]["priority"], "Alta")
            self.assertGreater(updated["financials"]["van_usd"], 0)
            self.assertEqual(updated["events"][-1]["type"], "scoring_updated")
            self.assertEqual(updated["events"][-1]["actor"], "Portfolio Owner")


if __name__ == "__main__":
    unittest.main()
