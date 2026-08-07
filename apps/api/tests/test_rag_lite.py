import unittest

from atlas_datagob.domain.enums import InitiativeType
from atlas_datagob.domain.models import DemandRequest
from atlas_datagob.services.rag_lite import find_similar_projects


class RagLiteTests(unittest.TestCase):
    def test_finds_similar_project(self):
        projects = [
            {
                "project_id": "P001",
                "title": "Calidad de datos de clientes",
                "description": "Reglas de calidad, steward, data owner y linaje para dominio cliente",
                "initiative_type": "data_governance",
                "domain": "Clientes",
                "subdomain": "Maestro de clientes",
                "tags": ["calidad", "linaje", "cliente"],
                "reusable_patterns": ["quality-rules-template"],
            },
            {
                "project_id": "P002",
                "title": "Prediccion de churn",
                "description": "Modelo machine learning para prediccion de fuga",
                "initiative_type": "machine_learning",
                "domain": "Comercial",
                "subdomain": "Retencion",
                "tags": ["ml", "churn"],
                "reusable_patterns": ["ml-risk-checklist"],
            },
        ]
        matches = find_similar_projects(
            DemandRequest(title="Reglas de calidad para clientes", description="Necesitamos linaje y steward del dominio cliente"),
            projects,
            top_k=1,
        )
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0].project_id, "P001")
        self.assertEqual(matches[0].initiative_type, InitiativeType.DATA_GOVERNANCE)


if __name__ == "__main__":
    unittest.main()
