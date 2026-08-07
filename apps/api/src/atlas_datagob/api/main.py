"""FastAPI entry point for ATLAS DataGob MVP."""
from __future__ import annotations

from atlas_datagob.domain.models import DemandRequest, ScoringInput
from atlas_datagob.services.classifier import classify_demand
from atlas_datagob.services.scoring import calculate_priority_score

try:
    from fastapi import FastAPI
    from pydantic import BaseModel, Field
except Exception:  # pragma: no cover
    FastAPI = None  # type: ignore
    BaseModel = object  # type: ignore
    Field = None  # type: ignore


if FastAPI:
    app = FastAPI(title="ATLAS DataGob API", version="0.2.0")

    class DemandPayload(BaseModel):
        title: str = Field(min_length=3)
        description: str = Field(min_length=10)
        requester_area: str = "unknown"
        requester_role: str = "unknown"
        domain_hint: str | None = None

    class ScoringPayload(BaseModel):
        strategic_alignment: int = Field(ge=1, le=5)
        business_value: int = Field(ge=1, le=5)
        urgency: int = Field(ge=1, le=5)
        data_readiness: int = Field(ge=1, le=5)
        governance_risk: int = Field(ge=1, le=5)
        technical_feasibility: int = Field(ge=1, le=5)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "product": "ATLAS DataGob"}

    @app.post("/intake/classify")
    def classify(payload: DemandPayload) -> dict:
        request = DemandRequest(**payload.model_dump())
        result = classify_demand(request)
        return {
            "initiative_type": result.initiative_type.value,
            "confidence": result.confidence,
            "rationale": result.rationale,
            "signals": result.signals,
            "secondary_types": [item.value for item in result.secondary_types],
        }

    @app.post("/scoring/calculate")
    def scoring(payload: ScoringPayload) -> dict:
        result = calculate_priority_score(ScoringInput(**payload.model_dump()))
        return {
            "score": result.score,
            "priority": result.priority,
            "rationale": result.rationale,
            "components": result.components,
        }
else:
    app = None
