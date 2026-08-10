from __future__ import annotations

import unittest

from atlas_datagob.api.main import DemandUpdatePayload


class DemandUpdateApiContractTest(unittest.TestCase):
    def test_validation_state_accepts_structured_object(self) -> None:
        state = {
            "data_owner_inputs_complete": True,
            "committee_inputs_complete": False,
        }

        payload = DemandUpdatePayload(validation_state=state)

        self.assertEqual(payload.validation_state, state)
        self.assertIsInstance(payload.validation_state, dict)


if __name__ == "__main__":
    unittest.main()
