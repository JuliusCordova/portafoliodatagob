from __future__ import annotations

import ast
import unittest
from pathlib import Path


class DemandUpdateApiContractTest(unittest.TestCase):
    def test_validation_state_accepts_structured_object(self) -> None:
        path = Path("apps/api/src/atlas_datagob/api/main.py")
        tree = ast.parse(path.read_text())

        annotation = None

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == "DemandUpdatePayload":
                for item in node.body:
                    if (
                        isinstance(item, ast.AnnAssign)
                        and isinstance(item.target, ast.Name)
                        and item.target.id == "validation_state"
                    ):
                        annotation = ast.unparse(item.annotation)
                        break

        self.assertIsNotNone(annotation)
        assert annotation is not None

        self.assertIn("dict[str, Any]", annotation)
        self.assertIn("str", annotation)
        self.assertIn("None", annotation)


if __name__ == "__main__":
    unittest.main()
