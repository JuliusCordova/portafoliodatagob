"""Canonical Feature 54 Business Case materialization.

Registration readiness means the business requirement is sufficiently defined and has
completed specialist assessments. It does not mean every delivery/production control is
already implemented. Policy, architecture and data-readiness obligations remain visible
as governed requirements that continue through committee and delivery.
"""
from __future__ import annotations

from typing import Any

try:
    from google.adk.tools.tool_context import ToolContext  # type: ignore
except Exception:  # pragma: no cover
    ToolContext = Any  # type: ignore


def build_governed_business_case_snapshot(tool_context: ToolContext) -> dict:
    """Build the canonical Business Case and compute registration readiness deterministically."""

    context = dict(tool_context.state.get("business_context", {}))
    classification = dict(tool_context.state.get("project_classification", {}))
    data_readiness = dict(tool_context.state.get("data_readiness", {}))
    architecture = dict(tool_context.state.get("architecture_assessment", {}))
    policies = dict(tool_context.state.get("policy_assessment", {}))

    required = {
        "business_problem": bool(context.get("business_problem")),
        "desired_outcome": bool(context.get("desired_outcome")),
        "business_area": bool(context.get("business_area")),
        "impacted_process": bool(context.get("impacted_process")),
        "success_metrics": bool(context.get("success_metrics")),
        "data_sources_known_or_explicit": "data_sources" in context,
        "project_classification": bool(
            classification.get("primary_type")
            and classification.get("primary_type") != "unknown"
        ),
        "data_readiness": bool(data_readiness),
        "architecture_assessment": bool(architecture),
        "policy_assessment": bool(policies),
    }

    definition_gaps = [key for key, value in required.items() if not value]
    completeness = round(sum(1 for value in required.values() if value) / len(required) * 100)

    governance_requirements = list(
        dict.fromkeys(
            [
                *data_readiness.get("gaps", []),
                *architecture.get("gaps", []),
                *policies.get("missing_controls", []),
            ]
        )
    )

    project_type = classification.get("primary_type", "unknown")
    if project_type == "agentic_ai" and classification.get("agent_type") == "action_agent":
        preliminary_risk = "high"
    elif project_type in {"machine_learning", "generative_ai", "agentic_ai"}:
        preliminary_risk = "medium"
    else:
        preliminary_risk = "low"

    # The requirement can enter the governed lifecycle once its definition and the
    # mandatory assessments exist. Delivery controls remain obligations, not blockers
    # that the business user must implement during Intake.
    ready = completeness == 100

    business_case = {
        **context,
        "project_classification": classification,
        "data_readiness": data_readiness,
        "architecture_assessment": architecture,
        "policy_assessment": policies,
        "preliminary_risk": preliminary_risk,
        "definition_gaps": definition_gaps,
        "governance_requirements": governance_requirements,
        # Backward-compatible field used by existing API/UI. From Feature 54 onward,
        # `gaps` means only blockers to Business Case definition/registration.
        "gaps": definition_gaps,
        "recommendation": "ready_for_user_confirmation" if ready else "continue_refinement",
        "completeness": completeness,
        "ready_to_register": ready,
    }
    tool_context.state["business_case"] = business_case
    return business_case
