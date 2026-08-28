"""Feature 54 FastAPI extension for the Gemini ADK conversational governed intake."""
from __future__ import annotations

from io import BytesIO
from typing import Any

from atlas_datagob.api import main as main_api
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
from atlas_datagob.services.business_case_document import (
    DOCX_CONTENT_TYPE,
    build_business_case_docx,
    business_case_document_filename,
)
from atlas_datagob.services.business_case_registration import business_case_to_validation_result
from atlas_datagob.services.demand_backlog import (
    create_demand_record,
    update_demand_record,
    update_demand_record_status,
)
from atlas_datagob.services.governance_catalog import catalog_snapshot

try:
    from fastapi import HTTPException, Request
    from fastapi.responses import StreamingResponse
    from pydantic import BaseModel, Field
except Exception:  # pragma: no cover
    HTTPException = Exception  # type: ignore
    Request = Any  # type: ignore
    StreamingResponse = None  # type: ignore
    BaseModel = object  # type: ignore
    Field = None  # type: ignore


API_VERSION = "0.8.1"
main_api.API_VERSION = API_VERSION
app = main_api.app
if app is not None:
    app.version = API_VERSION


class ConversationalIntakePayload(BaseModel):
    message: str = Field(min_length=2)
    session_id: str | None = None


class BusinessCaseDocumentPayload(BaseModel):
    session_id: str = Field(min_length=5)


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


async def _business_case_for_session(*, user_id: str, session_id: str) -> dict[str, Any]:
    try:
        state = await get_intake_session_state(user_id=user_id, session_id=session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Intake session not found") from exc

    business_case = dict(state.get("business_case", {}))
    if not business_case:
        raise HTTPException(
            status_code=409,
            detail="No canonical Business Case has been generated for this session",
        )
    return business_case


@app.post("/intake/conversation")
async def conversational_intake(payload: ConversationalIntakePayload, request: Request) -> dict:
    """Run one Gemini ADK guided-intake turn without persisting a demand."""

    context = _authorized_user(request, "intake:validate")
    try:
        return await run_intake_turn(
            user_id=context.user,
            message=payload.message,
            session_id=payload.session_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini ADK intake failed: {exc}") from exc


@app.get("/intake/governance-catalog")
def governance_catalog_readiness(request: Request) -> dict:
    """Expose safe catalog metadata for operational readiness diagnostics."""

    _authorized_user(request, "policy:read")
    try:
        return catalog_snapshot()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Governance catalog unavailable: {exc}") from exc


@app.post("/intake/business-case/document")
async def download_business_case_document(payload: BusinessCaseDocumentPayload, request: Request):
    """Download the canonical Business Case as a deterministic Word document."""

    context = _authorized_user(request, "intake:validate")
    business_case = await _business_case_for_session(
        user_id=context.user,
        session_id=payload.session_id,
    )
    if not business_case.get("ready_to_register"):
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Business Case document is available only after Definition of Ready is complete",
                "completeness": business_case.get("completeness", 0),
                "gaps": business_case.get("definition_gaps", business_case.get("gaps", [])),
            },
        )

    try:
        document = build_business_case_docx(
            business_case,
            session_id=payload.session_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Business Case document generation failed: {exc}") from exc

    filename = business_case_document_filename(payload.session_id)
    return StreamingResponse(
        BytesIO(document),
        media_type=DOCX_CONTENT_TYPE,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-ATLAS-Artifact": "canonical-business-case",
            "X-ATLAS-Business-Case-Completeness": str(business_case.get("completeness", 0)),
        },
    )


@app.post("/intake/business-case/register")
async def register_business_case(payload: BusinessCaseRegistrationPayload, request: Request) -> dict:
    """Persist a confirmed canonical Business Case through the existing governed demand lifecycle."""

    context = _authorized_user(request, "demand:create")
    if not payload.confirmed:
        raise HTTPException(status_code=409, detail="Explicit user confirmation is required before registration")

    business_case = await _business_case_for_session(
        user_id=context.user,
        session_id=payload.session_id,
    )
    if not business_case.get("ready_to_register"):
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Business Case is not ready to register",
                "completeness": business_case.get("completeness", 0),
                "gaps": business_case.get("gaps", []),
            },
        )

    validation = business_case_to_validation_result(business_case)
    demand = create_demand_record(validation, actor=context.user)
    demand_id = demand["demand_id"]
    demand = update_demand_record(
        demand_id,
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
    if demand is None:
        raise HTTPException(status_code=500, detail="Demand was created but could not be reloaded after Business Case update")

    if validation.get("recommended_next_action") == "operative_committee_review" and demand.get("status") != "operative_committee_review":
        transitioned = update_demand_record_status(
            demand_id,
            status="operative_committee_review",
            decision="business_case_confirmed_for_committee",
            actor=context.user,
            comment="Caso de Negocio confirmado; demanda enviada al Comité Operativo para evaluación gobernada.",
        )
        if transitioned is None:
            raise HTTPException(status_code=500, detail="Demand was registered but could not transition to Operative Committee")
        demand = transitioned

    return {
        "demand": demand,
        "business_case": business_case,
        "validation": validation,
        "session_id": payload.session_id,
    }
