from __future__ import annotations

from pathlib import Path
import tempfile
import unittest

from atlas_datagob.services.policy_loader import chunk_policy_documents, load_policy_documents


class PolicyLoaderTest(unittest.TestCase):
    def test_loads_markdown_policies_recursively(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            nested = root / "data-lifecycle"
            nested.mkdir()
            (nested / "policy-001.md").write_text(
                "# Medallion Policy\n\n## Rule\nBronze, Silver and Gold are required.",
                encoding="utf-8",
            )

            documents = load_policy_documents(root)
            self.assertEqual(1, len(documents))
            self.assertEqual("Medallion Policy", documents[0].title)
            self.assertEqual("data-lifecycle", documents[0].category)

    def test_chunks_policy_documents(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "policy.md").write_text("# Policy\n\n## A\nText A\n\n## B\nText B", encoding="utf-8")

            documents = load_policy_documents(root)
            chunks = chunk_policy_documents(documents, max_chars=200)
            self.assertGreaterEqual(len(chunks), 2)
            self.assertTrue(all(chunk.policy_id == "policy" for chunk in chunks))


if __name__ == "__main__":
    unittest.main()
