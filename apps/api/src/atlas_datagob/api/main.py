"""FastAPI entry point for ATLAS DataGob MVP."""
from __future__ import annotations

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
from atlas_datagob.services.policy_architecture_validation import (
    IntakeValidationContext,
    available_policies,
)
from atlas_datagob.services.scoring import calculate_priority_score

try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel, Field
except Exception:  # pragma: no cover
    FastAPI = None  # type: ignore
    HTTPException = Exception  # type: ignore
    BaseModel = object  # type: ignore
    Field = None  # type: ignore


DATA_ROOT = Path("data")
DOMAINS_PATH = DATA_ROOT / "synthetic" / "domains" / "domains.json"
DICTIONARY_PATH = DATA_ROOT / "canonical" / "data_dictionary.json"
ER_MODEL_PATH = DATA_ROOT / "canonical" / "entity_relationship_model.json"


if FastAPI:
    app = FastAPI(title="ATLAS DataGob API", version="0.4.0")

    class DemandPayload(BaseModel):
        title: str = Field(min_length=3)
        description: str = Field(min_length=10)
        requester_area: str = "unknown"
        requester_role: str = "unknown"
        domain_hint: str | None = None

    class PolicyArchitecturePayload(DemandPayload):
        target_consumption: str | None = None

    class ScoringPayload(BaseModel):
        strategic_alignment: int = Field(ge=1, le=5)
        business_value: int = Field(ge=1, le=5)
        urgency: int = Field(ge=1, le=5)
        data_readiness: int = Field(ge=1, le=5)
        governance_risk: int = Field(ge=1, le=5)
        technical_feasibility: int = Field(ge=1, le=5)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "product": "ATLAS DataGob", "version": "0.4.0"}

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
            "version": "0.4.0",
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
