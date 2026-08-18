from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]

BACKLOG = (
    ROOT
    / "apps/api/src/atlas_datagob/services/demand_backlog.py"
)

REPOSITORY = (
    ROOT
    / "apps/api/src/atlas_datagob/services/demand_repository.py"
)


class SyntheticDataSafetyContractTest(unittest.TestCase):
    def test_templates_bypass_runtime_repository(self):
        text = BACKLOG.read_text()

        self.assertIn(
            "def _load_synthetic_template_records(",
            text,
        )

        self.assertIn(
            'with path.open("r", encoding="utf-8") as file:',
            text,
        )

        generator_start = text.index(
            "def generate_synthetic_demand_records("
        )

        generator = text[generator_start:]

        self.assertIn(
            "_load_synthetic_template_records(",
            generator,
        )

    def test_generation_is_append_only(self):
        text = BACKLOG.read_text()

        generator_start = text.index(
            "def generate_synthetic_demand_records("
        )

        generator = text[generator_start:]

        self.assertIn(
            "append_demand_records(generated, path)",
            generator,
        )

        self.assertNotIn(
            "write_demand_records(existing + generated",
            generator,
        )

    def test_firestore_append_does_not_delete(self):
        text = REPOSITORY.read_text()

        firestore_start = text.index(
            "class FirestoreDemandRepository:"
        )

        factory_start = text.index(
            "\ndef demand_repository_for",
            firestore_start,
        )

        firestore = text[
            firestore_start:factory_start
        ]

        append_start = firestore.index(
            "    def append_many("
        )

        append_body = firestore[append_start:]

        self.assertIn(
            '.document(record["demand_id"]).set(record)',
            append_body,
        )

        self.assertNotIn(
            ".delete()",
            append_body,
        )


if __name__ == "__main__":
    unittest.main()
