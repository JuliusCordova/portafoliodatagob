"""Core dataclasses for the ATLAS DataGob MVP."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from atlas_datagob.domain.enums import DemandStatus, InitiativeType


@dataclass(frozen=True)
class DemandRequest:
    title: str
    description: str
    requester_area: str = "unknown"
    requester_role: str = "unknown"
    domain_hint: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: DemandStatus = DemandStatus.DRAFT


@dataclass(frozen=True)
class ClassificationResult:
    initiative_type: InitiativeType
    confidence: float
    rationale: str
    signals: list[str]
    secondary_types: list[InitiativeType] = field(default_factory=list)


@dataclass(frozen=True)
class ScoringInput:
    strategic_alignment: int
    business_value: int
    urgency: int
    data_readiness: int
    governance_risk: int
    technical_feasibility: int


@dataclass(frozen=True)
class ScoringResult:
    score: float
    priority: str
    rationale: str
    components: dict[str, float]


@dataclass(frozen=True)
class SimilarProject:
    project_id: str
    title: str
    initiative_type: InitiativeType
    domain: str
    similarity: float
    reusable_patterns: list[str]
    metadata: dict[str, str] = field(default_factory=dict)
