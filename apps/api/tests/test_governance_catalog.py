from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from atlas_datagob.services.governance_catalog import (
    catalog_snapshot,
    load_architecture_catalog,
    load_policy_catalog,
)


class GovernanceCatalogTest(unittest.TestCase):
    def test_local_catalog_is_available_for_development(self):
        with patch.dict(
            os.environ,
            {
                "ATLAS_GOVERNANCE_BUCKET": "",
                "ATLAS_GOVERNANCE_REQUIRE_GCS": "false",
            },
            clear=False,
        ):
            policies = load_policy_catalog()
            patterns = load_architecture_catalog()
            snapshot = catalog_snapshot()

        self.assertGreaterEqual(len(policies), 7)
        self.assertGreaterEqual(len(patterns), 5)
        self.assertEqual(snapshot["source"], "local_json")
        self.assertFalse(snapshot["gcs_required"])

    def test_production_mode_fails_closed_without_bucket(self):
        with patch.dict(
            os.environ,
            {
                "ATLAS_GOVERNANCE_BUCKET": "",
                "ATLAS_GOVERNANCE_REQUIRE_GCS": "true",
            },
            clear=False,
        ):
            with self.assertRaisesRegex(RuntimeError, "ATLAS_GOVERNANCE_BUCKET"):
                load_policy_catalog()


if __name__ == "__main__":
    unittest.main()
