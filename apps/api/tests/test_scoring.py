import unittest

from atlas_datagob.domain.models import ScoringInput
from atlas_datagob.services.scoring import calculate_priority_score


class ScoringTests(unittest.TestCase):
    def test_calculates_high_priority(self):
        result = calculate_priority_score(ScoringInput(
            strategic_alignment=5,
            business_value=5,
            urgency=4,
            data_readiness=4,
            governance_risk=2,
            technical_feasibility=5,
        ))
        self.assertEqual(result.priority, "Alta")
        self.assertGreaterEqual(result.score, 4.0)

    def test_rejects_values_outside_range(self):
        with self.assertRaises(ValueError):
            calculate_priority_score(ScoringInput(
                strategic_alignment=6,
                business_value=5,
                urgency=4,
                data_readiness=4,
                governance_risk=2,
                technical_feasibility=5,
            ))


if __name__ == "__main__":
    unittest.main()
