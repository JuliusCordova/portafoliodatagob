from __future__ import annotations

import unittest

from atlas_datagob.domain.enums import InitiativeType
from atlas_datagob.domain.models import DemandRequest
from atlas_datagob.services.architecture_compliance import validate_architecture_compliance


class ArchitectureComplianceTest(unittest.TestCase):
    def test_bi_request_complete_enough_goes_to_operative_committee(self) -> None:
        request = DemandRequest(
            title="Dashboard ejecutivo de ventas",
            description=(
                "Crear BI con fuentes, extraction, landing, bronze, silver, gold, "
                "dataset certificado, modelo semantico, serving, monitoring, finops, "
                "cuadratura, owner, steward, presupuesto, volumen y particionado."
            ),
        )

        result = validate_architecture_compliance(request, InitiativeType.DATA_ENGINEERING, target_consumption="BI")
        self.assertEqual("bi_reporting", result.architecture_pattern)
        self.assertFalse(result.human_architecture_review_required)
        self.assertEqual("operative_committee_review", result.recommended_next_action)

    def test_ml_request_missing_feature_layer_requires_architect_review(self) -> None:
        request = DemandRequest(
            title="Modelo de prediccion de churn",
            description="Entrenar modelo ML con datos historicos y servir score para negocio.",
        )

        result = validate_architecture_compliance(request, InitiativeType.MACHINE_LEARNING)
        self.assertEqual("machine_learning", result.architecture_pattern)
        self.assertIn("feature_layer", result.missing_components)
        self.assertTrue(result.human_architecture_review_required)

    def test_non_canonical_component_requires_architect_review(self) -> None:
        request = DemandRequest(
            title="Reporte en Snowflake",
            description="Usar Snowflake para BI sin pasar por arquitectura Google Cloud aprobada.",
        )

        result = validate_architecture_compliance(request, InitiativeType.DATA_ENGINEERING, target_consumption="BI")
        self.assertIn("snowflake", result.non_canonical_components)
        self.assertTrue(result.human_architecture_review_required)


if __name__ == "__main__":
    unittest.main()
