"""Prioritization scoring for ATLAS DataGob."""
from __future__ import annotations

from atlas_datagob.domain.models import ScoringInput, ScoringResult

_WEIGHTS = {
    "strategic_alignment": 0.20,
    "business_value": 0.25,
    "urgency": 0.15,
    "data_readiness": 0.15,
    "governance_risk": 0.10,
    "technical_feasibility": 0.15,
}


def _validate_range(name: str, value: int) -> None:
    if value < 1 or value > 5:
        raise ValueError(f"{name} must be between 1 and 5")


def calculate_priority_score(input_data: ScoringInput) -> ScoringResult:
    """Calculate a weighted 1-to-5 score and priority bucket."""

    raw = input_data.__dict__
    for name, value in raw.items():
        _validate_range(name, value)

    components = {
        "strategic_alignment": raw["strategic_alignment"] * _WEIGHTS["strategic_alignment"],
        "business_value": raw["business_value"] * _WEIGHTS["business_value"],
        "urgency": raw["urgency"] * _WEIGHTS["urgency"],
        "data_readiness": raw["data_readiness"] * _WEIGHTS["data_readiness"],
        "governance_risk": (6 - raw["governance_risk"]) * _WEIGHTS["governance_risk"],
        "technical_feasibility": raw["technical_feasibility"] * _WEIGHTS["technical_feasibility"],
    }
    score = round(sum(components.values()), 2)

    if score >= 4.0:
        priority = "Alta"
    elif score >= 3.0:
        priority = "Media"
    else:
        priority = "Baja"

    rationale = (
        f"Prioridad {priority} por score ponderado {score}. "
        "La decisión final debe ser tomada por comité humano."
    )
    return ScoringResult(score=score, priority=priority, rationale=rationale, components=components)
