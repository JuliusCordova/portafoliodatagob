from __future__ import annotations

import unittest

from atlas_datagob.agents.business_context_tool import update_business_context


class FakeToolContext:
    def __init__(self) -> None:
        self.state: dict = {}


class BusinessContextToolTest(unittest.TestCase):
    def test_progressive_updates_preserve_previous_facts(self):
        context = FakeToolContext()

        first = update_business_context(
            {
                "business_problem": "Los quiebres de stock se detectan tarde.",
                "business_area": "Comercial",
            },
            context,
        )
        second = update_business_context(
            {
                "desired_outcome": "Anticipar demanda para reducir quiebres.",
                "data_sources": ["SAP", "Inventario"],
            },
            context,
        )

        self.assertIn("business_problem", first["updated_fields"])
        self.assertEqual(second["business_context"]["business_area"], "Comercial")
        self.assertEqual(
            second["business_context"]["desired_outcome"],
            "Anticipar demanda para reducir quiebres.",
        )
        self.assertEqual(second["business_context"]["data_sources"], ["SAP", "Inventario"])

    def test_empty_values_do_not_erase_previous_facts(self):
        context = FakeToolContext()
        update_business_context({"business_problem": "Problema definido"}, context)
        update_business_context({"business_problem": ""}, context)
        self.assertEqual(context.state["business_context"]["business_problem"], "Problema definido")

    def test_explicit_empty_data_sources_is_preserved_as_known_unknown(self):
        context = FakeToolContext()
        result = update_business_context({"data_sources": []}, context)
        self.assertIn("data_sources", result["business_context"])
        self.assertEqual(result["business_context"]["data_sources"], [])

    def test_unknown_fields_are_ignored(self):
        context = FakeToolContext()
        result = update_business_context(
            {
                "business_problem": "Problema",
                "preferred_database": "inventado",
            },
            context,
        )
        self.assertNotIn("preferred_database", result["business_context"])
        self.assertIn("preferred_database", result["ignored_fields"])


if __name__ == "__main__":
    unittest.main()
