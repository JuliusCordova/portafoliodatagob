from __future__ import annotations

import re
import unittest

from atlas_datagob.services.adk_intake_runtime import (
    deterministic_intake_fallback_message,
    new_intake_session_id,
)


class Feature54RuntimeHardeningTest(unittest.TestCase):
    def test_generated_intake_session_id_is_agent_platform_compatible(self):
        session_id = new_intake_session_id()

        self.assertLessEqual(len(session_id), 63)
        self.assertRegex(session_id, re.compile(r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$"))
        self.assertTrue(session_id.startswith("intake-"))

    def test_fallback_message_never_leaves_incomplete_case_blank(self):
        message = deterministic_intake_fallback_message(
            {
                "ready_to_register": False,
                "definition_gaps": ["impacted_process", "success_metrics"],
            }
        )

        self.assertTrue(message.strip())
        self.assertIn("proceso impactado", message)
        self.assertIn("métrica de éxito", message)

    def test_fallback_message_allows_confirmation_only_when_ready(self):
        message = deterministic_intake_fallback_message(
            {
                "ready_to_register": True,
                "definition_gaps": [],
            }
        )

        self.assertTrue(message.strip())
        self.assertIn("lista para tu confirmación", message)


if __name__ == "__main__":
    unittest.main()
