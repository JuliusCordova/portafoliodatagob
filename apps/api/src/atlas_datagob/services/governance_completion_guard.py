"""Deterministic completion guard for mandatory governed Intake specialist assessments.

Gemini controls the conversation. This guard ensures that assessments which can be
resolved from already-known structured state are not skipped merely because an LLM
turn omitted a specialist delegation.
"""
from __future__ import annotations

from typing import Any

from atlas_datagob.agents.conversational_intake_tools import (
    evaluate_governance_policies,
    validate_gcp_architecture,
)


class StateToolContext:
    """Minimal ToolContext-compatible wrapper for deterministic specialist tools."""

    def __init__(self, state: dict[str, Any]) -> None:
        self.state = state


def complete_required_governance_assessments(
    state: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Complete assessments that are deterministically resolvable from current state.

    Returns only the state delta that must be persisted and an activity list explaining
    which completion guards ran. It never fabricates business facts, data sensitivity,
    ownership, quality or controls.
    """

    working = dict(state)
    context = StateToolContext(working)
    classification = dict(working.get("project_classification", {}))
    primary_type = str(classification.get("primary_type") or "").strip()
    activities: list[dict[str, str]] = []
    delta: dict[str, Any] = {}

    if primary_type and primary_type != "unknown" and not working.get("architecture_assessment"):
        architecture = validate_gcp_architecture(
            project_type=primary_type,
            proposed_architecture="",
            tool_context=context,
        )
        delta["architecture_assessment"] = architecture
        activities.append(
            {
                "specialist": "architecture",
                "agent_id": "atlas_architecture_validation_agent",
                "execution_mode": "runtime_guard",
                "summary": (
                    f"{architecture.get('pattern_id', 'Sin patrón')}@"
                    f"{architecture.get('pattern_version', '—')}"
                ),
            }
        )

    # Policy evaluation requires sensitivity to be explicitly known. Until Data
    # Readiness records this fact, the guard deliberately leaves Policy assessment
    # pending rather than assuming sensitive_data=False.
    readiness = dict(working.get("data_readiness", {}))
    architecture_ready = bool(working.get("architecture_assessment"))
    if (
        primary_type
        and primary_type != "unknown"
        and architecture_ready
        and not working.get("policy_assessment")
        and "sensitive_data" in readiness
    ):
        capabilities = dict(classification.get("capabilities", {}))
        policy = evaluate_governance_policies(
            project_type=primary_type,
            known_controls=[],
            sensitive_data=bool(readiness.get("sensitive_data")),
            writes_to_systems=bool(capabilities.get("writes_to_systems", False)),
            tool_context=context,
        )
        delta["policy_assessment"] = policy
        references = policy.get("policy_references", [])
        activities.append(
            {
                "specialist": "policies",
                "agent_id": "atlas_policy_controls_agent",
                "execution_mode": "runtime_guard",
                "summary": f"{len(references)} políticas aplicables",
            }
        )

    return delta, activities


def specialist_activity_snapshot(
    state: dict[str, Any],
    trace: list[str],
    guard_activities: list[dict[str, str]] | None = None,
) -> list[dict[str, Any]]:
    """Build business-facing specialist observability with technical traceability."""

    guards = {item.get("specialist"): item for item in (guard_activities or [])}
    readiness = dict(state.get("data_readiness", {}))
    architecture = dict(state.get("architecture_assessment", {}))
    policies = dict(state.get("policy_assessment", {}))

    specs = [
        {
            "key": "data_readiness",
            "label": "Especialista de Datos",
            "agent_id": "atlas_data_readiness_agent",
            "completed": bool(readiness),
            "summary": (
                f"{readiness.get('score')}% · {readiness.get('status')}"
                if readiness.get("score") is not None
                else "Pendiente"
            ),
        },
        {
            "key": "architecture",
            "label": "Especialista de Arquitectura",
            "agent_id": "atlas_architecture_validation_agent",
            "completed": bool(architecture),
            "summary": (
                f"{architecture.get('pattern_id')}@{architecture.get('pattern_version')}"
                if architecture.get("pattern_id")
                else "Pendiente"
            ),
        },
        {
            "key": "policies",
            "label": "Especialista de Políticas",
            "agent_id": "atlas_policy_controls_agent",
            "completed": bool(policies),
            "summary": (
                f"{len(policies.get('policy_references', []))} políticas aplicables"
                if policies
                else "Pendiente"
            ),
        },
    ]

    activity: list[dict[str, Any]] = []
    for spec in specs:
        guard = guards.get(spec["key"])
        if guard:
            mode = "runtime_guard"
        elif spec["agent_id"] in trace:
            mode = "adk_agent"
        elif spec["completed"]:
            mode = "session_state"
        else:
            mode = "not_run"
        activity.append({**spec, "execution_mode": mode})
    return activity
