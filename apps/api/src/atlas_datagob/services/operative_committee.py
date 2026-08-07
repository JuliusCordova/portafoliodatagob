"""Operative committee routing for policy and architecture validation."""
from __future__ import annotations

from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class OperativeCommitteeRoute:
    committee_stage: str
    data_architect_final_validation_required: bool
    suggested_decision: str
    rejection_allowed: bool
    rationale: str
    required_review_roles: list[str]


def route_to_operative_committee(
    *,
    is_architecture_compliant: bool,
    policy_gaps: list[str],
    architecture_gaps: list[str],
    human_architecture_review_required: bool,
) -> OperativeCommitteeRoute:
    """Route the validated intake to the next human governance step."""

    if human_architecture_review_required:
        return OperativeCommitteeRoute(
            committee_stage="operative_committee_architect_review",
            data_architect_final_validation_required=True,
            suggested_decision="architecture_exception_or_reformulation",
            rejection_allowed=True,
            rationale=(
                "El requerimiento requiere revisión del Arquitecto de Datos porque no calza "
                "plenamente con políticas o arquitectura canónica. El rechazo solo procede "
                "después de esta validación final."
            ),
            required_review_roles=["Data Architect", "Data Owner", "Data Steward"],
        )

    if policy_gaps or architecture_gaps or not is_architecture_compliant:
        return OperativeCommitteeRoute(
            committee_stage="operative_committee_policy_review",
            data_architect_final_validation_required=True,
            suggested_decision="reformulation_required",
            rejection_allowed=True,
            rationale=(
                "El requerimiento tiene brechas corregibles. Debe pasar por Comité Operativo "
                "y validación final del Arquitecto de Datos antes de aprobar, reformular o rechazar."
            ),
            required_review_roles=["Data Architect", "Data Owner", "Data Steward"],
        )

    return OperativeCommitteeRoute(
        committee_stage="operative_committee_ready_for_review",
        data_architect_final_validation_required=True,
        suggested_decision="approve_for_scoring",
        rejection_allowed=False,
        rationale=(
            "El intake no detectó brechas críticas, pero el Comité Operativo y el Arquitecto "
            "de Datos conservan la decisión final antes del scoring."
        ),
        required_review_roles=["Data Architect", "Data Owner", "Data Steward"],
    )


def committee_route_as_dict(route: OperativeCommitteeRoute) -> dict:
    return asdict(route)
