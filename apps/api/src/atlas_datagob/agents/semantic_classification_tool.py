"""Semantic-to-deterministic project classification tool for Gemini ADK Intake."""
from __future__ import annotations

from typing import Any

try:
    from google.adk.tools.tool_context import ToolContext  # type: ignore
except Exception:  # pragma: no cover
    ToolContext = Any  # type: ignore


ALLOWED_SUBTYPES: dict[str, set[str]] = {
    "data_engineering": {"batch_data_pipeline", "streaming_pipeline", "cdc_pipeline", "data_product"},
    "dashboard_analytics": {"executive_dashboard", "operational_dashboard", "near_real_time_dashboard", "analytics_dashboard"},
    "machine_learning": {"forecasting", "predictive_classification", "anomaly_detection", "predictive_maintenance", "optimization"},
    "generative_ai": {"rag", "document_intelligence", "content_generation", "conversational_assistant"},
    "agentic_ai": {"knowledge_agent", "recommendation_agent", "workflow_agent", "action_agent", "multi_agent_system"},
    "data_governance": {"data_quality", "metadata_lineage_catalog", "governance_operating_model"},
}

AGENT_TYPES = {
    "knowledge_agent",
    "recommendation_agent",
    "workflow_agent",
    "action_agent",
    "multi_agent_system",
}


def _default_subtype(
    project_type: str,
    *,
    requires_streaming: bool,
    requires_cdc: bool,
    requires_prediction: bool,
    requires_optimization: bool,
    requires_anomaly_detection: bool,
    requires_knowledge_retrieval: bool,
    requires_document_understanding: bool,
    writes_to_systems: bool,
    agent_design: str,
) -> str:
    if project_type == "data_engineering":
        if requires_cdc:
            return "cdc_pipeline"
        if requires_streaming:
            return "streaming_pipeline"
        return "batch_data_pipeline"
    if project_type == "dashboard_analytics":
        return "near_real_time_dashboard" if requires_streaming else "analytics_dashboard"
    if project_type == "machine_learning":
        if requires_optimization:
            return "optimization"
        if requires_anomaly_detection:
            return "anomaly_detection"
        return "forecasting" if requires_prediction else "predictive_classification"
    if project_type == "generative_ai":
        if requires_document_understanding:
            return "document_intelligence"
        if requires_knowledge_retrieval:
            return "rag"
        return "conversational_assistant"
    if project_type == "agentic_ai":
        if writes_to_systems:
            return "action_agent"
        if agent_design in AGENT_TYPES:
            return agent_design
        return "workflow_agent"
    if project_type == "data_governance":
        return "governance_operating_model"
    return "general"


def classify_project_capabilities(
    requires_data_integration: bool,
    requires_dashboard: bool,
    requires_prediction: bool,
    requires_optimization: bool,
    requires_anomaly_detection: bool,
    requires_generation: bool,
    requires_knowledge_retrieval: bool,
    requires_document_understanding: bool,
    requires_agentic_orchestration: bool,
    writes_to_systems: bool,
    requires_data_governance: bool,
    requires_streaming: bool,
    requires_cdc: bool,
    candidate_subtype: str,
    agent_design: str,
    evidence: list[str],
    tool_context: ToolContext,
) -> dict:
    """Map semantic capabilities extracted by Gemini to the official ATLAS taxonomy.

    Gemini determines factual capability flags from the conversation. This tool owns the
    deterministic mapping to project type, approved subtype and agent autonomy class.
    """

    capabilities: list[str] = []
    if requires_agentic_orchestration or writes_to_systems or agent_design in AGENT_TYPES:
        capabilities.append("agentic_ai")
    if requires_prediction or requires_optimization or requires_anomaly_detection:
        capabilities.append("machine_learning")
    if requires_generation or requires_knowledge_retrieval or requires_document_understanding:
        capabilities.append("generative_ai")
    if requires_dashboard:
        capabilities.append("dashboard_analytics")
    if requires_data_integration or requires_streaming or requires_cdc:
        capabilities.append("data_engineering")
    if requires_data_governance:
        capabilities.append("data_governance")

    # Preserve order while removing duplicates. The order expresses business-capability
    # precedence: action/orchestration > prediction > generation > visualization > movement > governance.
    ranked = list(dict.fromkeys(capabilities))
    primary_type = ranked[0] if ranked else "unknown"
    secondary = ranked[1:]

    allowed = ALLOWED_SUBTYPES.get(primary_type, set())
    normalized_candidate = candidate_subtype.strip().lower().replace(" ", "_")
    if normalized_candidate in allowed:
        subtype = normalized_candidate
    else:
        subtype = _default_subtype(
            primary_type,
            requires_streaming=requires_streaming,
            requires_cdc=requires_cdc,
            requires_prediction=requires_prediction,
            requires_optimization=requires_optimization,
            requires_anomaly_detection=requires_anomaly_detection,
            requires_knowledge_retrieval=requires_knowledge_retrieval,
            requires_document_understanding=requires_document_understanding,
            writes_to_systems=writes_to_systems,
            agent_design=agent_design,
        )

    if primary_type == "agentic_ai":
        if writes_to_systems:
            agent_type = "action_agent"
        elif agent_design in AGENT_TYPES:
            agent_type = agent_design
        else:
            agent_type = subtype if subtype in AGENT_TYPES else "workflow_agent"
    elif "agentic_ai" in secondary:
        agent_type = "action_agent" if writes_to_systems else (agent_design if agent_design in AGENT_TYPES else "workflow_agent")
    else:
        agent_type = None

    evidence_clean = [item.strip() for item in evidence if item.strip()][:10]
    if primary_type == "unknown":
        confidence = 0.0
    else:
        evidence_factor = min(0.15, len(evidence_clean) * 0.03)
        ambiguity_penalty = min(0.15, max(0, len(ranked) - 2) * 0.05)
        confidence = round(max(0.55, min(0.95, 0.78 + evidence_factor - ambiguity_penalty)), 2)

    result = {
        "primary_type": primary_type,
        "subtype": subtype,
        "agent_type": agent_type,
        "secondary_capabilities": secondary,
        "confidence": confidence,
        "signals": evidence_clean,
        "classification_method": "gemini_semantic_extraction_plus_deterministic_mapping",
        "capabilities": {
            "data_integration": requires_data_integration,
            "dashboard": requires_dashboard,
            "prediction": requires_prediction,
            "optimization": requires_optimization,
            "anomaly_detection": requires_anomaly_detection,
            "generation": requires_generation,
            "knowledge_retrieval": requires_knowledge_retrieval,
            "document_understanding": requires_document_understanding,
            "agentic_orchestration": requires_agentic_orchestration,
            "writes_to_systems": writes_to_systems,
            "data_governance": requires_data_governance,
            "streaming": requires_streaming,
            "cdc": requires_cdc,
        },
    }
    tool_context.state["project_classification"] = result
    return result
