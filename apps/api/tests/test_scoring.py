import unittest

from atlas_datagob.domain.models import ScoringInput
from atlas_datagob.services.scoring import calculate_priority_score


class ScoringTests(unittest.TestCase):
    def test_calculates_high_priority(self):
        result = calculate_priority_score(
            ScoringInput(
                business_value=5,
                strategic_alignment=5,
                data_readiness=4,
                technical_feasibility=5,
                execution_effort=4,
                risk_control=4,
            )
        )

        self.assertEqual(result.priority, "Alta")
        self.assertEqual(result.score, 4.65)

    def test_calculates_medium_priority(self):
        result = calculate_priority_score(
            ScoringInput(
                business_value=4,
                strategic_alignment=3,
                data_readiness=3,
                technical_feasibility=3,
                execution_effort=3,
                risk_control=3,
            )
        )

        self.assertEqual(result.priority, "Media")
        self.assertEqual(result.score, 3.30)

    def test_calculates_backlog_priority(self):
        result = calculate_priority_score(
            ScoringInput(
                business_value=3,
                strategic_alignment=2,
                data_readiness=3,
                technical_feasibility=3,
                execution_effort=3,
                risk_control=3,
            )
        )

        self.assertEqual(result.priority, "Backlog")
        self.assertEqual(result.score, 2.80)

    def test_calculates_reformulation_priority(self):
        result = calculate_priority_score(
            ScoringInput(
                business_value=2,
                strategic_alignment=2,
                data_readiness=2,
                technical_feasibility=2,
                execution_effort=2,
                risk_control=2,
            )
        )

        self.assertEqual(result.priority, "Reformular")
        self.assertEqual(result.score, 2.0)

    def test_rejects_values_outside_range(self):
        with self.assertRaises(ValueError):
            calculate_priority_score(
                ScoringInput(
                    business_value=6,
                    strategic_alignment=5,
                    data_readiness=4,
                    technical_feasibility=5,
                    execution_effort=4,
                    risk_control=4,
                )
            )


if __name__ == "__main__":
    unittest.main()
