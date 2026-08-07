import unittest

from atlas_datagob.domain.enums import InitiativeType
from atlas_datagob.domain.models import DemandRequest
from atlas_datagob.services.classifier import classify_demand


class ClassifierTests(unittest.TestCase):
    def test_classifies_data_engineering_request(self):
        result = classify_demand(DemandRequest(
            title="Crear pipeline CDC para ventas",
            description="Necesitamos ingesta incremental, procesamiento bronze silver gold y orquestacion batch hacia BigQuery.",
        ))
        self.assertEqual(result.initiative_type, InitiativeType.DATA_ENGINEERING)
        self.assertGreater(result.confidence, 0.4)
        self.assertIn("pipeline", result.signals)

    def test_classifies_governance_request(self):
        result = classify_demand(DemandRequest(
            title="Definir diccionario y reglas de calidad",
            description="El data owner necesita catalogo, linaje, steward y politicas de acceso para el dominio cliente.",
        ))
        self.assertEqual(result.initiative_type, InitiativeType.DATA_GOVERNANCE)
        self.assertIn("diccionario", result.signals)

    def test_classifies_hybrid_request(self):
        result = classify_demand(DemandRequest(
            title="Chatbot con RAG para gobierno de datos",
            description="Queremos un agente LLM que consulte catalogo, dominios, reglas de calidad y proyectos similares.",
        ))
        self.assertEqual(result.initiative_type, InitiativeType.HYBRID)
        self.assertIn(InitiativeType.AGENTIC_AI, result.secondary_types)


if __name__ == "__main__":
    unittest.main()
