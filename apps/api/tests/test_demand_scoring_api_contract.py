from __future__ import annotations

import ast
import unittest
from pathlib import Path


class DemandScoringApiContractTest(unittest.TestCase):
    def test_governed_scoring_constructors_use_supported_keywords(self) -> None:
        path = Path("apps/api/src/atlas_datagob/api/main.py")
        tree = ast.parse(path.read_text())

        expected = {
            "GovernedDirectScoringInput",
            "GovernedScoringInput",
        }
        found: dict[str, set[str]] = {}

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if not isinstance(node.func, ast.Name):
                continue
            if node.func.id not in expected:
                continue

            found[node.func.id] = {
                keyword.arg
                for keyword in node.keywords
                if keyword.arg is not None
            }

        self.assertEqual(set(found), expected)

        for constructor, keywords in found.items():
            self.assertEqual(
                keywords,
                {"scoring", "financials"},
                f"{constructor} received unsupported API arguments: {keywords}",
            )


if __name__ == "__main__":
    unittest.main()
