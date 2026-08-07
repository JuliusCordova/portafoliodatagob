"""Deterministic multi-agent intake orchestrator for Sprint 04 MVP."""
from __future__ import annotations

from atlas_datagob.services.policy_architecture_validation import (
    IntakeValidationContext,
    validate_policy_architecture,
    validation_result_as_dict,
)


class PolicyIntakeAgent:
    """Coordinates the MVP policy RAG and architecture validation flow.

    This is the deterministic shell that will later be connected to Gemini ADK.
    It keeps the product safe: agents recommend, the Operative Committee and
    Data Architect decide.
    """

    name = "PolicyIntakeAgent"

    def validate(self, context: IntakeValidationContext) -> dict:
        result = validate_policy_architecture(context)
        response = validation_result_as_dict(result)
        response["agent_trace"] = [
            "Intake Conversation Agent",
            "Requirement Structuring Agent",
            "Initiative Classification Agent",
            "Policy Retrieval Agent",
            "Architecture Compliance Agent",
            "FinOps Readiness Agent",
            "Operative Committee Routing Agent",
        ]
        return response
