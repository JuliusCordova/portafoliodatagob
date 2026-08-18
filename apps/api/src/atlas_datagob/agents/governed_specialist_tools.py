"""Governed wrappers for Feature 54 ADK specialist tools.

The LLM may express a project type using natural language (for example,
"Machine Learning, forecasting"). These wrappers make specialist execution
independent from that phrasing by resolving the canonical project type from the
shared ADK session state before calling deterministic tools.
"""
from __future__ import annotations

from typing import Any

from atlas_datagob.agents.conversational_intake_tools import (
    evaluate_data_readiness,
    evaluate_governance_policies,
    validate_gcp_architecture,
)

try:
    from google.adk.tools.tool_context import ToolContext  # type: ignore
except Exception:  # pragma: no cover
    ToolContext = Any  # type: ignore


_CANONICAL_TYPES = {
    "data_engineering",
    "dashboard_analytics",
    "machine_learning",
    "generative_ai",
    "agentic_ai",
    "data_governance",
    "hybrid",
    "unknown",
}

_TYPE_ALIASES = {
    "data engineering": "data_engineering",
    "ingenieria de datos": "data_engineering",
    "ingeniería de datos": "data_engineering",
    "dashboard": "dashboard_analytics",
    "dashboard analytics": "dashboard_analytics",
    "analytics": "dashboard_analytics",
    "bi": "dashboard_analytics",
    "machine learning": "machine_learning",
    "ml": "machine_learning",
    "generative ai": "generative_ai",
    "genai": "generative_ai",
    "gen ai": "generative_ai",
    "agentic ai": "agentic_ai",
    "agentic": "agentic_ai",
    "data governance": "data_governance",
    "gobierno de datos": "data_governance",
}

_ENTERPRISE_SOURCE_SIGNALS = {
    "sap",
    "erp",
    "crm",
    "salesforce",
    "oracle",
    "sql server",
    "postgres",
    "postgresql",
    "mysql",
    "bigquery",
    "api",
    "datastream",
}


def canonical_project_type(value: str, tool_context: ToolContext) -> str:
    """Resolve the official ATLAS project type, preferring shared session state."""

    state_type = str(
        tool_context.state.get("project_classification", {}).get("primary_type") or ""
    ).strip()
    if state_type in _CANONICAL_TYPES:
        return state_type

    raw = (value or "").strip().lower().replace("-", " ")
    normalized = " ".join(raw.split())
    if normalized.replace(" ", "_") in _CANONICAL_TYPES:
        return normalized.replace(" ", "_")

    for alias, canonical in _TYPE_ALIASES.items():
        if alias in normalized:
            return canonical

    return "unknown"


def _enrich_integration_capability(
    data_sources: list[str],
    tool_context: ToolContext,
) -> None:
    """Add Data Engineering as a deterministic secondary capability when justified."""

    source_text = " ".join(str(item).lower() for item in data_sources)
    integration_required = any(signal in source_text for signal in _ENTERPRISE_SOURCE_SIGNALS)
    if not integration_required:
        return

    classification = dict(tool_context.state.get("project_classification", {}))
    if not classification:
        return

    capabilities = dict(classification.get("capabilities", {}))
    capabilities["data_integration"] = True
    classification["capabilities"] = capabilities

    primary = classification.get("primary_type")
    secondary = list(classification.get("secondary_capabilities", []))
    if primary != "data_engineering" and "data_engineering" not in secondary:
        secondary.append("data_engineering")
    classification["secondary_capabilities"] = secondary

    method = str(classification.get("classification_method") or "")
    suffix = "deterministic_enterprise_source_enrichment"
    if suffix not in method:
        classification["classification_method"] = (
            f"{method}+{suffix}" if method else suffix
        )

    tool_context.state["project_classification"] = classification


def evaluate_data_readiness_governed(
    data_sources: list[str],
    data_owner_known: bool,
    historical_data_known: bool,
    quality_known: bool,
    frequency_known: bool,
    access_known: bool,
    sensitive_data: bool,
    tool_context: ToolContext,
) -> dict:
    """Evaluate readiness and preserve source facts/capability implications in shared state."""

    result = evaluate_data_readiness(
        data_sources=data_sources,
        data_owner_known=data_owner_known,
        historical_data_known=historical_data_known,
        quality_known=quality_known,
        frequency_known=frequency_known,
        access_known=access_known,
        sensitive_data=sensitive_data,
        tool_context=tool_context,
    )

    business_context = dict(tool_context.state.get("business_context", {}))
    if data_sources:
        business_context["data_sources"] = list(
            dict.fromkeys(str(item).strip() for item in data_sources if str(item).strip())
        )
    tool_context.state["business_context"] = business_context

    _enrich_integration_capability(data_sources, tool_context)
    return result


def validate_gcp_architecture_governed(
    project_type: str,
    proposed_architecture: str,
    tool_context: ToolContext,
) -> dict:
    """Validate architecture using the canonical project type from session state."""

    canonical = canonical_project_type(project_type, tool_context)
    result = validate_gcp_architecture(
        project_type=canonical,
        proposed_architecture=proposed_architecture,
        tool_context=tool_context,
    )
    result["project_type"] = canonical
    return result


def evaluate_governance_policies_governed(
    project_type: str,
    known_controls: list[str],
    sensitive_data: bool,
    writes_to_systems: bool,
    tool_context: ToolContext,
) -> dict:
    """Evaluate policy applicability using the canonical project type from session state."""

    canonical = canonical_project_type(project_type, tool_context)
    return evaluate_governance_policies(
        project_type=canonical,
        known_controls=known_controls,
        sensitive_data=sensitive_data,
        writes_to_systems=writes_to_systems,
        tool_context=tool_context,
    )
