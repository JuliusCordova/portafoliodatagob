"""Feature 56 API: out-of-band governance for Google ADK agent deployments."""
from __future__ import annotations

from typing import Any

from atlas_datagob.api import feature54_app as feature54
from atlas_datagob.api import main as main_api
from atlas_datagob.services.agent_governance_service import agent_governance_service
from atlas_datagob.services.authz import (
    AuthenticationError,
    AuthorizationError,
    context_from_headers,
    require_permission,
)

try:
    from fastapi import HTTPException, Request
    from pydantic import BaseModel, Field
except Exception:  # pragma: no cover
    HTTPException = Exception  # type: ignore
    Request = Any  # type: ignore
    BaseModel = object  # type: ignore
    Field = None  # type: ignore


API_VERSION = "0.9.0"
main_api.API_VERSION = API_VERSION
app = feature54.app
if app is not None:
    app.version = API_VERSION


class GovernedAgentCreatePayload(BaseModel):
    canonical_name: str = Field(min_length=3, max_length=160)
    description: str | None = Field(default=None, max_length=1000)


class DeploymentBindingPayload(BaseModel):
    deployment_id: str = Field(min_length=5)
    environment: str | None = Field(default=None, max_length=80)
    is_current: bool = False


class GovernanceProfilePayload(BaseModel):
    business_owner: str | None = None
    technical_owner: str | None = None
    business_purpose: str | None = None
    business_area: str | None = None
    environment: str | None = None
    business_criticality: str | None = None
    autonomy_level: str | None = None
    risk_level: str | None = None
    data_classification: list[str] | None = None
    human_oversight: str | None = None
    writes_to_systems: bool | None = None
    applicable_policies: list[str] | None = None
    required_controls: list[str] | None = None
    next_review_at: str | None = None
    notes: str | None = None


def _authorized_user(request: Request, permission: str):
    try:
        context = context_from_headers(request.headers)
        require_permission(context, permission)
        return context
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except AuthorizationError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@app.get("/agent-governance/summary")
def agent_governance_summary(request: Request) -> dict:
    _authorized_user(request, "agent_governance:read")
    return agent_governance_service().summary()


@app.get("/agent-governance/deployments")
def agent_governance_deployments(request: Request) -> dict:
    _authorized_user(request, "agent_governance:read")
    deployments = agent_governance_service().list_deployments()
    return {"count": len(deployments), "deployments": deployments}


@app.post("/agent-governance/discovery/refresh")
def agent_governance_refresh(request: Request) -> dict:
    context = _authorized_user(request, "agent_governance:refresh")
    try:
        return agent_governance_service().refresh_discovery(actor=context.user)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"ADK discovery refresh failed: {exc}") from exc


@app.get("/agent-governance/agents")
def agent_governance_agents(request: Request) -> dict:
    _authorized_user(request, "agent_governance:read")
    agents = agent_governance_service().list_agents()
    return {"count": len(agents), "agents": agents}


@app.post("/agent-governance/agents")
def agent_governance_create_agent(payload: GovernedAgentCreatePayload, request: Request) -> dict:
    context = _authorized_user(request, "agent_governance:edit")
    try:
        agent = agent_governance_service().create_agent(
            canonical_name=payload.canonical_name,
            description=payload.description,
            actor=context.user,
        )
        return {"agent": agent}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/agent-governance/agents/{agent_id}")
def agent_governance_agent_detail(agent_id: str, request: Request) -> dict:
    _authorized_user(request, "agent_governance:read")
    agent = agent_governance_service().get_agent(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Governed agent not found")
    return {"agent": agent}


@app.patch("/agent-governance/agents/{agent_id}/profile")
def agent_governance_update_profile(
    agent_id: str,
    payload: GovernanceProfilePayload,
    request: Request,
) -> dict:
    context = _authorized_user(request, "agent_governance:edit")
    updates = payload.model_dump(exclude_unset=True)
    try:
        profile = agent_governance_service().update_profile(
            agent_id=agent_id,
            updates=updates,
            actor=context.user,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Governed agent not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"profile": profile}


@app.post("/agent-governance/agents/{agent_id}/deployments/bind")
def agent_governance_bind_deployment(
    agent_id: str,
    payload: DeploymentBindingPayload,
    request: Request,
) -> dict:
    context = _authorized_user(request, "agent_governance:bind")
    try:
        binding = agent_governance_service().bind_deployment(
            agent_id=agent_id,
            deployment_id=payload.deployment_id,
            actor=context.user,
            environment=payload.environment,
            is_current=payload.is_current,
        )
        return {"binding": binding}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Agent or deployment not found: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/agent-governance/agents/{agent_id}/assess")
def agent_governance_assess(agent_id: str, request: Request) -> dict:
    context = _authorized_user(request, "agent_governance:assess")
    try:
        return agent_governance_service().assess(agent_id=agent_id, actor=context.user)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Governed agent not found") from exc


@app.get("/agent-governance/findings")
def agent_governance_findings(request: Request) -> dict:
    _authorized_user(request, "agent_governance:read")
    findings = agent_governance_service().repository.list_findings()
    return {"count": len(findings), "findings": findings}
