"""Canonical reusable contracts for Agent Governance and AgentOps.

The models intentionally avoid ATLAS-specific business semantics so they can be
used by other governed agent products. Product-specific evidence lives in
metadata or in profile-specific evaluation records.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


Environment = Literal["dev", "test", "preview", "prod", "unknown"]
GovernanceStatus = Literal[
    "not_assessed", "compliant", "action_required", "restricted", "retired"
]
ExecutionMode = Literal[
    "adk_agent", "runtime_guard", "tool", "session_state", "not_run"
]
CostSemantics = Literal["billed", "attributed", "unattributed"]
Severity = Literal["info", "warning", "high", "critical"]


class AgentSystem(BaseModel):
    agent_system_id: str = Field(min_length=3, max_length=120)
    name: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    business_owner: str | None = Field(default=None, max_length=240)
    technical_owner: str | None = Field(default=None, max_length=240)
    environment: Environment = "unknown"
    status: str = "active"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class GovernedAgent(BaseModel):
    agent_system_id: str = Field(min_length=3, max_length=120)
    agent_id: str = Field(min_length=3, max_length=160)
    canonical_name: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    agent_type: str | None = Field(default=None, max_length=120)
    runtime: str | None = Field(default=None, max_length=120)
    model_provider: str | None = Field(default=None, max_length=120)
    model_name: str | None = Field(default=None, max_length=160)
    status: str = "active"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class GovernanceProfile(BaseModel):
    agent_id: str = Field(min_length=3, max_length=160)
    business_owner: str | None = None
    technical_owner: str | None = None
    business_purpose: str | None = None
    business_area: str | None = None
    business_criticality: str = "not_assessed"
    autonomy_level: str = "not_assessed"
    risk_level: str = "not_assessed"
    data_classification: list[str] = Field(default_factory=list)
    human_oversight: str = "not_assessed"
    writes_to_systems: bool | None = None
    applicable_policies: list[str] = Field(default_factory=list)
    required_controls: list[str] = Field(default_factory=list)
    governance_status: GovernanceStatus = "not_assessed"
    last_assessed_at: datetime | None = None
    next_review_at: datetime | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None


class ObservedDeployment(BaseModel):
    deployment_id: str = Field(min_length=3, max_length=500)
    provider: str = Field(min_length=2, max_length=80)
    project_id: str | None = None
    region: str = Field(min_length=2, max_length=120)
    runtime_resource: str | None = None
    runtime_version: str | None = None
    image_uri: str | None = None
    environment: Environment = "unknown"
    discovery_status: str = "discovered"
    first_seen_at: datetime | None = None
    last_seen_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class DeploymentBinding(BaseModel):
    binding_id: str = Field(min_length=3, max_length=160)
    agent_id: str = Field(min_length=3, max_length=160)
    deployment_id: str = Field(min_length=3, max_length=500)
    environment: Environment = "unknown"
    lifecycle_status: str = "active"
    is_current: bool = False
    binding_source: str = "human_confirmed"
    bound_by: str | None = None
    bound_at: datetime | None = None


class AgentRun(BaseModel):
    agent_system_id: str = Field(min_length=3, max_length=120)
    run_id: str = Field(min_length=3, max_length=240)
    agent_id: str | None = Field(default=None, max_length=160)
    deployment_id: str | None = Field(default=None, max_length=500)
    trace_id: str | None = Field(default=None, max_length=240)
    session_id: str | None = Field(default=None, max_length=240)
    environment: Environment = "unknown"
    status: str = Field(min_length=2, max_length=80)
    requested_by: str | None = Field(default=None, max_length=240)
    started_at: datetime
    finished_at: datetime | None = None
    duration_ms: int | None = Field(default=None, ge=0)
    error_code: str | None = Field(default=None, max_length=160)
    error_message: str | None = Field(default=None, max_length=4000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentRunStep(BaseModel):
    run_id: str = Field(min_length=3, max_length=240)
    step_id: str = Field(min_length=3, max_length=240)
    step_type: str = Field(min_length=2, max_length=120)
    status: str = Field(min_length=2, max_length=80)
    started_at: datetime
    trace_id: str | None = None
    parent_step_id: str | None = None
    agent_id: str | None = None
    tool_name: str | None = None
    execution_mode: ExecutionMode | None = None
    finished_at: datetime | None = None
    duration_ms: int | None = Field(default=None, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class LLMUsage(BaseModel):
    run_id: str = Field(min_length=3, max_length=240)
    agent_id: str = Field(min_length=3, max_length=160)
    model_provider: str = Field(min_length=2, max_length=120)
    model_name: str = Field(min_length=2, max_length=160)
    observed_at: datetime
    trace_id: str | None = None
    request_count: int = Field(default=1, ge=1)
    input_tokens: int | None = Field(default=None, ge=0)
    output_tokens: int | None = Field(default=None, ge=0)
    total_tokens: int | None = Field(default=None, ge=0)
    latency_ms: int | None = Field(default=None, ge=0)
    billing_reference: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentArtifact(BaseModel):
    artifact_id: str = Field(min_length=3, max_length=240)
    run_id: str = Field(min_length=3, max_length=240)
    artifact_type: str = Field(min_length=2, max_length=120)
    created_at: datetime
    agent_id: str | None = None
    name: str | None = None
    uri: str | None = None
    content_type: str | None = None
    checksum: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EvaluationEvidence(BaseModel):
    evaluation_id: str = Field(min_length=3, max_length=240)
    run_id: str = Field(min_length=3, max_length=240)
    profile_type: str = Field(min_length=2, max_length=120)
    status: str = Field(min_length=2, max_length=80)
    evaluated_at: datetime
    agent_id: str | None = None
    metric_name: str | None = None
    metric_value: float | None = None
    metric_unit: str | None = None
    evidence_uri: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentAlert(BaseModel):
    alert_id: str = Field(min_length=3, max_length=240)
    severity: Severity
    source: str = Field(min_length=2, max_length=160)
    title: str = Field(min_length=2, max_length=300)
    created_at: datetime
    agent_system_id: str | None = None
    agent_id: str | None = None
    run_id: str | None = None
    alert_type: str | None = None
    message: str | None = None
    acknowledged: bool = False
    acknowledged_by: str | None = None
    acknowledged_at: datetime | None = None


class HealthSnapshot(BaseModel):
    agent_system_id: str = Field(min_length=3, max_length=120)
    component: str = Field(min_length=2, max_length=160)
    status: str = Field(min_length=2, max_length=80)
    checked_at: datetime
    latency_ms: float | None = Field(default=None, ge=0)
    detail: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CostAttribution(BaseModel):
    cost_record_id: str = Field(min_length=3, max_length=240)
    cost_semantics: CostSemantics
    currency: str = Field(min_length=3, max_length=3)
    period_start: datetime
    period_end: datetime
    agent_system_id: str | None = None
    agent_id: str | None = None
    run_id: str | None = None
    service: str | None = None
    sku: str | None = None
    amount: float | None = Field(default=None, ge=0)
    attribution_method: str | None = None
    confidence: str | None = None
    billing_export_reference: str | None = None
    created_at: datetime | None = None
