from __future__ import annotations

from pathlib import Path
import unittest

from atlas_datagob.services.canonical_catalog import (
    load_data_dictionary,
    load_domains,
    load_er_model,
    validate_canonical_model,
)

ROOT = Path(__file__).resolve().parents[3]


class CanonicalCatalogTest(unittest.TestCase):
    def test_canonical_model_is_valid(self) -> None:
        domains = load_domains(ROOT / "data" / "synthetic" / "domains" / "domains.json")
        dictionary = load_data_dictionary(ROOT / "data" / "canonical" / "data_dictionary.json")
        er_model = load_er_model(ROOT / "data" / "canonical" / "entity_relationship_model.json")

        self.assertEqual(validate_canonical_model(domains, dictionary, er_model), [])

    def test_dictionary_contains_required_core_entities(self) -> None:
        dictionary = load_data_dictionary(ROOT / "data" / "canonical" / "data_dictionary.json")
        entity_ids = {entity.entity_id for entity in dictionary.entities}

        self.assertIn("ENT-DEMAND-REQUEST", entity_ids)
        self.assertIn("ENT-INTAKE-CLASSIFICATION", entity_ids)
        self.assertIn("ENT-SCORING-ASSESSMENT", entity_ids)
        self.assertIn("ENT-COMMITTEE-DECISION", entity_ids)

    def test_domains_have_stewardship_metadata(self) -> None:
        domains = load_domains(ROOT / "data" / "synthetic" / "domains" / "domains.json")

        self.assertTrue(all(domain.owner_role for domain in domains))
        self.assertTrue(all(domain.steward_role for domain in domains))
        self.assertTrue(all(domain.subdomains for domain in domains))


if __name__ == "__main__":
    unittest.main()
