"""Prioritization scoring for ATLAS DataGob."""
from __future__ import annotations

from atlas_datagob.domain.models import ScoringInput, ScoringResult


# Source of truth: docs/specs/05-scoring-and-mvp-gates.md
_WEIGHTS = {
    "business_value": 0.30,
    "strategic_alignment": 0.20,
    "data_readiness": 0.15,
    "technical_feasibility": 0.15,
    "execution_effort": 0.10,
    "risk_control": 0.10,
}


def _validate_range(name: str, value: int) -> None:
    if value < 1 or value > 5:
        raise ValueError(f"{name} must be between 1 and 5")


def calculate_priority_score(input_data: ScoringInput) -> ScoringResult:
    """Calculate the governed weighted 1-to-5 prioritization score."""

    raw = input_data.__dict__

    for name, value in raw.items():
        _validate_range(name, value)

    components = {
        name: round(raw[name] * weight, 4)
        for name, weight in _WEIGHTS.items()
    }

    score = round(sum(components.values()), 2)

    if score >= 4.0:
        priority = "Alta"
    elif score >= 3.2:
        priority = "Media"
    elif score >= 2.5:
        priority = "Backlog"
    else:
        priority = "Reformular"

    rationale = (
        f"Prioridad {priority} por score ponderado {score}. "
        "La decisión final debe ser tomada por comité humano."
    )

    return ScoringResult(
        score=score,
        priority=priority,
        rationale=rationale,
        components=components,
    )
