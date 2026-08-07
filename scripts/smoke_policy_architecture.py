"""Smoke test for local policy and architecture validation runtime."""
from __future__ import annotations

import json

from atlas_datagob.services.policy_architecture_validation import (
    IntakeValidationContext,
    validate_policy_architecture,
)


def main() -> None:
    context = IntakeValidationContext(
        title="Dashboard ejecutivo de calidad de clientes",
        description=(
            "Necesitamos integrar datos de clientes desde fuentes operacionales, llevarlos a Bronze, "
            "Silver y Gold, crear controles de calidad y publicar un dashboard ejecutivo. "
            "Aun no se ha definido cuadratura, modelo semantico ni presupuesto."
        ),
        requester_area="Negocio",
        requester_role="Domain Owner",
        domain_hint="Clientes",
        target_consumption="BI ejecutivo / dashboard",
    )

    result = validate_policy_architecture(context)

    assert result.classification["initiative_type"] in {
        "data_engineering",
        "data_governance",
        "hybrid",
        "unknown",
    }
    assert result.architecture["architecture_pattern"] in {
        "bi_reporting",
        "data_engineering",
        "machine_learning",
        "genai_rag",
        "streaming",
        "unknown",
    }
    assert result.operative_committee["data_architect_final_validation_required"] is True
    assert result.committee_summary

    print("policy architecture smoke OK")
    print(
        json.dumps(
            {
                "initiative_type": result.classification["initiative_type"],
                "architecture_pattern": result.architecture["architecture_pattern"],
                "policy_gaps": len(result.policy_gaps),
                "architecture_gaps": len(result.architecture_gaps),
                "finops_gaps": len(result.finops_gaps),
                "recommended_next_action": result.recommended_next_action,
                "similar_projects": len(result.similar_projects),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
