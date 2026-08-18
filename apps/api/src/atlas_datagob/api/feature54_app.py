"""Feature 54 FastAPI extension for the Gemini ADK conversational governed intake."""
from __future__ import annotations

from typing import Any

from atlas_datagob.api import main as main_api
from atlas_datagob.agents.policy_intake_agent import PolicyIntakeAgent
from atlas_datagob.services.adk_intake_runtime import (
    get_intake_session_state,
    run_intake_turn,
)
from atlas_datagob.services.authz import (
    AuthenticationError,
    AuthorizationError,
    context_from_headers,
    require_permission,
)
from atlas_datagob.services.demand_backlog import (
    create_demand_record,
    update_demand_record,
)
from atlas_datagob.services.governance_catalog import catalog_snapshot
from atlas_datagob.services.policy_architecture_validation import IntakeValidationContext

try:
    from fastapi import HTTPException, Request
    from pydantic import BaseModel, Field
except Exception:  # pragma: no cover
    HTTPException = Exception  # type: ignore
    Request = Any  # type: ignore
    BaseModel = object  # type: ignore
    Field = None  # type: ignore


API_VERSION = "0.8.0"
main_api.API_VERSION = API_VERSION
app = main_api.app
if app is not None:
    app.version = API_VERSION


class ConversationalIntakePayload(BaseModel):
    message: str = Field(min_length=2)
    session_id: str | None = None


class BusinessCaseRegistrationPayload(BaseModel):
    session_id: str = Field(min_length=5)
    confirmed: bool


def _authorized_user(request: Request, permission: str):
    try:
        context = context_from_headers(request.headers)
        require_permission(context, permission)
        return context
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except AuthorizationError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


def _target_consumption(project_type: str) -> str:
    return {
        "dashboard_analytics": "BI ejecutivo / dashboard",
        "machine_learning": "Machine Learning",
        "generative_ai": "GenAI / RAG",
        "agentic_ai": "GenAI / RAG / agente",
        "data_engineering": "Data platform / governed data product",
        "data_governance": "Gobierno de datos",
    }.get(project_type, "Por definir")


def _business_case_title(business_case: dict) -> str:
    classification = business_case.get("project_classification", {})
    subtype = str(classification.get("subtype") or classification.get("primary_type") or "iniciativa")
    outcome = str(business_case.get("desired_outcome") or business_case.get("business_problem") or "Caso de negocio")
    label = subtype.replace("_", " ").strip().title()
    return f"{label}: {outcome[:90]}"


def _business_case_description(business_case: dict) -> str:
    parts = [
        f"Problema de negocio: {business_case.get('business_problem', '')}",
        f"Resultado esperado: {business_case.get('desired_outcome', '')}",
        f"Situación actual: {business_case.get('current_situation', '')}",
        f"Proceso impactado: {business_case.get('impacted_process', '')}",
    ]
    sources = business_case.get("data_sources", [])
    if sources:
        parts.append("Fuentes conocidas: " + ", ".join(str(item) for item in sources))
    return "\n".join(part for part in parts if not part.endswith(": "))


@app.post("/intake/conversation")
async def conversational_intake(payload: ConversationalIntakePayload, request: Request) -> dict:
    """Run one Gemini ADK guided-intake turn without persisting a demand."""

    context = _authorized_user(request, "intake:validate")
    try:
        result = await run_intake_turn(
            user_id=context.user,
            message=payload.message,
            session_id=payload.session_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini ADK intake failed: {exc}") from exc
    return result


@app.get("/intake/governance-catalog")
def governance_catalog_readiness(request: Request) -> dict:
    """Expose safe catalog metadata for operational readiness diagnostics."""

    _authorized_user(request, "policy:read")
    try:
        return catalog_snapshot()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Governance catalog unavailable: {exc}") from exc


@app.post("/intake/business-case/register")
async def register_business_case(payload: BusinessCaseRegistrationPayload, request: Request) -> dict:
    """Persist a confirmed canonical Business Case through the existing governed demand lifecycle."""

    context = _authorized_user(request, "demand:create")
    if not payload.confirmed:
        raise HTTPException(status_code=409, detail="Explicit user confirmation is required before registration")

    try:
        state = await get_intake_session_state(user_id=context.user, session_id=payload.session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Intake session not found") from exc

    business_case = dict(state.get("business_case", {}))
    if not business_case:
        raise HTTPException(status_code=409, detail="No canonical Business Case has been generated for this session")
    if not business_case.get("ready_to_register"):
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Business Case is not ready to register",
                "completeness": business_case.get("completeness", 0),
                "gaps": business_case.get("gaps", []),
            },
        )

    classification = business_case.get("project_classification", {})
    project_type = str(classification.get("primary_type") or "unknown")
    validation_context = IntakeValidationContext(
        title=_business_case_title(business_case),
        description=_business_case_description(business_case),
        requester_area=str(business_case.get("business_area") or "unknown"),
        requester_role="Data Owner",
        domain_hint=None,
        target_consumption=_target_consumption(project_type),
    )
    validation = PolicyIntakeAgent().validate(validation_context)
    validation["agent_trace"] = [
        "ATLAS Intake Orchestrator",
        "Data Readiness Agent",
        "Architecture Validation Agent",
        "Policy & Controls Agent",
        *validation.get("agent_trace", []),
    ]

    demand = create_demand_record(validation, actor=context.user)
    demand = update_demand_record(
        demand["demand_id"],
        business_inputs={
            "canonical_business_case": business_case,
            "intake_session_id": payload.session_id,
            "business_case_confirmed": True,
        },
        validation_state={
            "business_case_defined": True,
            "business_case_confirmed": True,
            "conversational_intake": True,
            "business_case_completeness": business_case.get("completeness", 0),
        },
        actor=context.user,
        comment="Caso de negocio confirmado por el usuario y registrado desde Gemini ADK Conversational Intake.",
    )
    if demand is None:  # Defensive guard: creation and immediate governed update must be atomic from the caller perspective.
        raise HTTPException(status_code=500, detail="Demand was created but could not be reloaded after Business Case update")

    return {
        "demand": demand,
        "business_case": business_case,
        "validation": validation,
        "session_id": payload.session_id,
    }
