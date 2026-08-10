"""FastAPI entry point for ATLAS DataGob MVP."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from atlas_datagob.agents.policy_intake_agent import PolicyIntakeAgent
from atlas_datagob.domain.models import DemandRequest, ScoringInput
from atlas_datagob.services.authz import (
    AuthenticationError,
    AuthorizationError,
    AuthConfigurationError,
    auth_snapshot,
    authorize_request,
)
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
    load_demo_seed_records,
    reset_demo_backlog,
    update_demand_record,
    update_demand_record_scoring,
    update_demand_record_status,
)
from atlas_datagob.services.financial_scoring import (
    DirectFinancialMetrics,
    FinancialAssumptions,
    GovernedDirectScoringInput,
    GovernedScoringInput,
    calculate_governed_direct_scoring,
    calculate_governed_scoring,
)
from atlas_datagob.services.operational_readiness import operational_readiness_snapshot
from atlas_datagob.services.policy_architecture_validation import (
    IntakeValidationContext,
    available_policies,
)
from atlas_datagob.services.scoring import calculate_priority_score

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel, Field
except Exception:  # pragma: no cover
    FastAPI = None  # type: ignore
    HTTPException = Exception  # type: ignore
    CORSMiddleware = None  # type: ignore
    JSONResponse = None  # type: ignore
    BaseModel = object  # type: ignore
    Field = None  # type: ignore


DATA_ROOT = Path("data")
DOMAINS_PATH = DATA_ROOT / "synthetic" / "domains" / "domains.json"
DICTIONARY_PATH = DATA_ROOT / "canonical" / "data_dictionary.json"
ER_MODEL_PATH = DATA_ROOT / "canonical" / "entity_relationship_model.json"
API_VERSION = "0.6.4"


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

    @app.middleware("http")
    async def authz_middleware(request, call_next):
        try:
            authorize_request(request.method, request.url.path, request.headers)
        except AuthConfigurationError as exc:
            return JSONResponse(status_code=500, content={"detail": str(exc)})
        except AuthenticationError as exc:
            return JSONResponse(status_code=401, content={"detail": str(exc)})
        except AuthorizationError as exc:
            return JSONResponse(status_code=403, content={"detail": str(exc)})
        return await call_next(request)

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

    class DemandUpdatePayload(BaseModel):
        request_update: dict[str, Any] | None = None
        business_inputs: dict[str, Any] | None = None
        committee_inputs: dict[str, Any] | None = None
        validation_state: dict[str, Any] | str | None = None
        decision: str | None = None
        actor: str = "Data Steward"
        comment: str | None = None

    class ScoringPayload(BaseModel):
        business_value: int = Field(ge=1, le=5)
        strategic_alignment: int = Field(ge=1, le=5)
        data_readiness: int = Field(ge=1, le=5)
        technical_feasibility: int = Field(ge=1, le=5)
        execution_effort: int = Field(ge=1, le=5)
        risk_control: int = Field(ge=1, le=5)

    class DemandFinancialScoringPayload(ScoringPayload):
        # Data Owner direct financial metrics.
        roi_percent: float | None = None
        van_usd: float | None = None
        tir_percent: float | None = None
        payback_years: float | None = Field(default=None, ge=0)

        # Data Owner business checklist.
        operational_impact: int | None = Field(default=None, ge=1, le=5)
        operational_justification: str | None = None
        strategic_impact: int | None = Field(default=None, ge=1, le=5)
        strategic_impact_justification: str | None = None
        strategic_alignment_justification: str | None = None

        # Committee technical/governance checklist.
        data_readiness_justification: str | None = None
        technical_feasibility_justification: str | None = None
        execution_effort_justification: str | None = None
        risk_control_justification: str | None = None
        reuse_potential: int | None = Field(default=None, ge=1, le=5)
        reuse_potential_justification: str | None = None

        # Optional detailed assumptions for committee/portfolio modelling.
        initial_investment_usd: float | None = Field(default=None, ge=0)
        annual_benefit_usd: float | None = Field(default=None, ge=0)
        annual_operating_cost_usd: float = Field(default=0, ge=0)
        time_horizon_years: int = Field(default=3, ge=1, le=10)
        discount_rate: float = Field(default=0.12, ge=0, le=1)

        actor: str = "Data Owner"
        comment: str | None = None

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "product": "ATLAS DataGob", "version": API_VERSION}

    @app.get("/auth/permissions")
    def auth_permissions() -> dict:
        return auth_snapshot()

    @app.get("/ops/readiness")
    def ops_readiness() -> dict:
        return operational_readiness_snapshot()

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

    @app.get("/demo/cases")
    def demo_cases() -> dict:
        try:
            records = load_demo_seed_records()
        except ValueError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {
            "count": len(records),
            "demands": records,
            "note": "Curated demo records. Runtime backlog is not modified by this endpoint.",
        }

    @app.post("/demo/reset")
    def demo_reset() -> dict:
        try:
            records = reset_demo_backlog()
        except ValueError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {
            "count": len(records),
            "demands": records,
            "message": "Runtime backlog reset from curated demo seed records.",
        }

    @app.get("/demands/{demand_id}")
    def demand_detail(demand_id: str) -> dict:
        record = get_demand_record(demand_id)
        if not record:
            raise HTTPException(status_code=404, detail="Demand record not found")
        return {"demand": record}

    @app.patch("/demands/{demand_id}")
    def demand_update(demand_id: str, payload: DemandUpdatePayload) -> dict:
        record = update_demand_record(
            demand_id,
            request_update=payload.request_update,
            business_inputs=payload.business_inputs,
            committee_inputs=payload.committee_inputs,
            validation_state=payload.validation_state,
            decision=payload.decision,
            actor=payload.actor,
            comment=payload.comment,
        )
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
                business_value=payload.business_value,
                strategic_alignment=payload.strategic_alignment,
                data_readiness=payload.data_readiness,
                technical_feasibility=payload.technical_feasibility,
                execution_effort=payload.execution_effort,
                risk_control=payload.risk_control,
            )

            business_inputs = {
                "operational_impact": payload.operational_impact,
                "operational_justification": payload.operational_justification,
                "strategic_impact": payload.strategic_impact,
                "strategic_impact_justification": payload.strategic_impact_justification,
                "strategic_alignment_justification": payload.strategic_alignment_justification,
            }
            committee_inputs = {
                "data_readiness_justification": payload.data_readiness_justification,
                "technical_feasibility_justification": payload.technical_feasibility_justification,
                "execution_effort": payload.execution_effort,
                "execution_effort_justification": payload.execution_effort_justification,
                "risk_control": payload.risk_control,
                "risk_control_justification": payload.risk_control_justification,
                "reuse_potential": payload.reuse_potential,
                "reuse_potential_justification": payload.reuse_potential_justification,
            }

            if payload.van_usd is not None or payload.roi_percent is not None or payload.tir_percent is not None:
                scoring_result = calculate_governed_direct_scoring(
                    GovernedDirectScoringInput(
                        scoring=scoring_input,
                        financials=DirectFinancialMetrics(
                            roi_percent=payload.roi_percent,
                            van_usd=payload.van_usd,
                            tir_percent=payload.tir_percent,
                            payback_years=payload.payback_years,
                        ),
                    )
                )
            else:
                if payload.initial_investment_usd is None or payload.annual_benefit_usd is None:
                    raise ValueError(
                        "Either direct financial metrics or initial_investment_usd and annual_benefit_usd are required"
                    )
                scoring_result = calculate_governed_scoring(
                    GovernedScoringInput(
                        scoring=scoring_input,
                        financials=FinancialAssumptions(
                            initial_investment_usd=payload.initial_investment_usd,
                            annual_benefit_usd=payload.annual_benefit_usd,
                            annual_operating_cost_usd=payload.annual_operating_cost_usd,
                            time_horizon_years=payload.time_horizon_years,
                            discount_rate=payload.discount_rate,
                        ),
                    )
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
