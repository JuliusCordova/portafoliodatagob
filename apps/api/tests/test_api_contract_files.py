from __future__ import annotations

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[3]


class ApiContractFilesTest(unittest.TestCase):
    def test_openapi_contract_is_versioned(self) -> None:
        contract_path = ROOT / "docs" / "api" / "openapi.yaml"
        content = contract_path.read_text(encoding="utf-8")

        self.assertIn("title: ATLAS DataGob API", content)
        self.assertIn("/metadata/data-dictionary:", content)
        self.assertIn("/metadata/er-model:", content)
        self.assertIn("/metadata/validate:", content)


if __name__ == "__main__":
    unittest.main()
