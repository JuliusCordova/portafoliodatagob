"""FastAPI entry point for ATLAS DataGob MVP."""
from __future__ import annotations

import os
from pathlib import Path

from atlas_datagob.agents.policy_intake_agent import PolicyIntakeAgent
from atlas_datagob.domain.models import DemandRequest, ScoringInput
from atlas_datagob.services.canonical_catalog import (
    dictionary_to_response,
    er_model_to_response,
    load_data_dictionary,
    load_domains,
    load_er_model,
    validate_canonical_model,
)
from atlas_datagob.services.classifier import classify_demand
from atlas_datagob.services.demand_backlog import (
    create_demand_record,
    get_demand_record,
    list_demand_records,
    update_demand_record_scoring,
    update_demand_record_status,
)
from atlas_datagob.services.financial_scoring import (
    FinancialAssumptions,
    GovernedScoringInput,
    calculate_governed_scoring,
)
from atlas_datagob.services.policy_architecture_validation import (
    IntakeValidationContext,
    available_policies,
)
from atlas_datagob.services.scoring import calculate_priority_score

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
except Exception:  # pragma: no cover
    FastAPI = None  # type: ignore
    HTTPException = Exception  # type: ignore
    CORSMiddleware = None  # type: ignore
    BaseModel = object  # type: ignore
    Field = None  # type: ignore


DATA_ROOT = Path("data")
DOMAINS_PATH = DATA_ROOT / "synthetic" / "domains" / "domains.json"
DICTIONARY_PATH = DATA_ROOT / "canonical" / "data_dictionary.json"
ER_MODEL_PATH = DATA_ROOT / "canonical" / "entity_relationship_model.json"
API_VERSION = "0.6.0"


def _allowed_origins() -> list[str]:
    raw = os.getenv("ATLAS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _allowed_origin_regex() -> str:
    """Allow local web previews such as Google Cloud Shell during development."""
    return os.getenv(
        "ATLAS_ALLOWED_ORIGIN_REGEX",
        r"https://.*\.cloudshell\.dev",
    )


if FastAPI:
    app = FastAPI(title="ATLAS DataGob API", version=API_VERSION)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_origin_regex=_allowed_origin_regex(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class DemandPayload(BaseModel):
        title: str = Field(min_length=3)
        description: str = Field(min_length=10)
        requester_area: str = "unknown"
        requester_role: str = "unknown"
        domain_hint: str | None = None

    class PolicyArchitecturePayload(DemandPayload):
        target_consumption: str | None = None

    class DemandStatusPayload(BaseModel):
        status: str = Field(min_length=3)
        decision: str | None = None
        comment: str | None = None
        actor: str = "Data Architect"

    class ScoringPayload(BaseModel):
        strategic_alignment: int = Field(ge=1, le=5)
        business_value: int = Field(ge=1, le=5)
        urgency: int = Field(ge=1, le=5)
        data_readiness: int = Field(ge=1, le=5)
        governance_risk: int = Field(ge=1, le=5)
        technical_feasibility: int = Field(ge=1, le=5)

    class DemandFinancialScoringPayload(ScoringPayload):
        initial_investment_usd: float = Field(ge=0)
        annual_benefit_usd: float = Field(ge=0)
        annual_operating_cost_usd: float = Field(default=0, ge=0)
        time_horizon_years: int = Field(default=3, ge=1, le=10)
        discount_rate: float = Field(default=0.12, ge=0, le=1)
        actor: str = "Portfolio Owner"
        comment: str | None = None

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "product": "ATLAS DataGob", "version": API_VERSION}

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

    @app.post("/intake/policy-architecture-validate")
    def validate_policy_architecture_endpoint(payload: PolicyArchitecturePayload) -> dict:
        context = IntakeValidationContext(**payload.model_dump())
        return PolicyIntakeAgent().validate(context)

    @app.post("/demands/validate-and-create")
    def validate_and_create_demand(payload: PolicyArchitecturePayload) -> dict:
        context = IntakeValidationContext(**payload.model_dump())
        validation = PolicyIntakeAgent().validate(context)
        demand = create_demand_record(validation)
        return {"demand": demand, "validation": validation}

    @app.get("/demands/backlog")
    def demand_backlog(status: str | None = None) -> dict:
        records = list_demand_records(status=status)
        return {"count": len(records), "demands": records}

    @app.get("/demands/{demand_id}")
    def demand_detail(demand_id: str) -> dict:
        record = get_demand_record(demand_id)
        if not record:
            raise HTTPException(status_code=404, detail="Demand record not found")
        return {"demand": record}

    @app.patch("/demands/{demand_id}/status")
    def demand_status_update(demand_id: str, payload: DemandStatusPayload) -> dict:
        try:
            record = update_demand_record_status(
                demand_id,
                status=payload.status,
                decision=payload.decision,
                comment=payload.comment,
                actor=payload.actor,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if not record:
            raise HTTPException(status_code=404, detail="Demand record not found")
        return {"demand": record}

    @app.post("/demands/{demand_id}/score")
    def demand_score_update(demand_id: str, payload: DemandFinancialScoringPayload) -> dict:
        try:
            scoring_input = ScoringInput(
                strategic_alignment=payload.strategic_alignment,
                business_value=payload.business_value,
                urgency=payload.urgency,
                data_readiness=payload.data_readiness,
                governance_risk=payload.governance_risk,
                technical_feasibility=payload.technical_feasibility,
            )
            financial_input = FinancialAssumptions(
                initial_investment_usd=payload.initial_investment_usd,
                annual_benefit_usd=payload.annual_benefit_usd,
                annual_operating_cost_usd=payload.annual_operating_cost_usd,
                time_horizon_years=payload.time_horizon_years,
                discount_rate=payload.discount_rate,
            )
            scoring_result = calculate_governed_scoring(
                GovernedScoringInput(scoring=scoring_input, financials=financial_input)
            )
            record = update_demand_record_scoring(
                demand_id,
                scoring_result=scoring_result,
                actor=payload.actor,
                comment=payload.comment,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if not record:
            raise HTTPException(status_code=404, detail="Demand record not found")
        return {"demand": record, "scoring": scoring_result}

    @app.get("/policies")
    def policies() -> dict:
        return {"policies": available_policies()}

    @app.post("/scoring/calculate")
    def scoring(payload: ScoringPayload) -> dict:
        result = calculate_priority_score(ScoringInput(**payload.model_dump()))
        return {
            "score": result.score,
            "priority": result.priority,
            "rationale": result.rationale,
            "components": result.components,
        }

    @app.get("/metadata/domains")
    def metadata_domains() -> dict:
        if not DOMAINS_PATH.exists():
            raise HTTPException(status_code=404, detail="Domain catalog not found")
        domains = load_domains(DOMAINS_PATH)
        return {
            "version": API_VERSION,
            "domains": [
                {
                    "domain_id": domain.domain_id,
                    "name": domain.name,
                    "description": domain.description,
                    "owner_role": domain.owner_role,
                    "steward_role": domain.steward_role,
                    "subdomains": [
                        {
                            "subdomain_id": subdomain.subdomain_id,
                            "name": subdomain.name,
                            "description": subdomain.description,
                            "owner_role": subdomain.owner_role,
                            "steward_role": subdomain.steward_role,
                        }
                        for subdomain in domain.subdomains
                    ],
                }
                for domain in domains
            ],
        }

    @app.get("/metadata/data-dictionary")
    def metadata_data_dictionary() -> dict:
        if not DICTIONARY_PATH.exists():
            raise HTTPException(status_code=404, detail="Data dictionary not found")
        return dictionary_to_response(load_data_dictionary(DICTIONARY_PATH))

    @app.get("/metadata/er-model")
    def metadata_er_model() -> dict:
        if not ER_MODEL_PATH.exists():
            raise HTTPException(status_code=404, detail="Entity relationship model not found")
        return er_model_to_response(load_er_model(ER_MODEL_PATH))

    @app.get("/metadata/validate")
    def metadata_validate() -> dict:
        domains = load_domains(DOMAINS_PATH)
        dictionary = load_data_dictionary(DICTIONARY_PATH)
        er_model = load_er_model(ER_MODEL_PATH)
        errors = validate_canonical_model(domains, dictionary, er_model)
        return {"valid": len(errors) == 0, "errors": errors}
else:
    app = None
