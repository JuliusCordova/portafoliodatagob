"""Deterministic tools used by the Gemini ADK conversational intake agents."""
from __future__ import annotations

import re
from typing import Any

from atlas_datagob.services.architecture_compliance import (
    detect_components,
    detect_non_canonical_components,
)
from atlas_datagob.services.governance_catalog import (
    load_architecture_catalog,
    load_policy_catalog,
)

try:  # Imported lazily enough for lightweight unit tests without ADK runtime.
    from google.adk.tools.tool_context import ToolContext  # type: ignore
except Exception:  # pragma: no cover
    ToolContext = Any  # type: ignore


PROJECT_SIGNALS: dict[str, set[str]] = {
    "data_engineering": {
        "pipeline", "etl", "elt", "ingesta", "integrar", "integracion", "integración",
        "cdc", "batch", "streaming", "lakehouse", "bronze", "silver", "gold", "dataflow",
    },
    "dashboard_analytics": {
        "dashboard", "tablero", "reporte", "reporting", "kpi", "indicador", "looker",
        "visualizar", "visualización", "analytics", "bi", "ejecutivo",
    },
    "machine_learning": {
        "predecir", "prediccion", "predicción", "forecast", "pronostico", "pronóstico",
        "machine learning", "modelo", "clasificar", "propension", "propensión", "churn",
        "fraude", "anomalia", "anomalía", "optimizar", "mantenimiento predictivo",
    },
    "generative_ai": {
        "rag", "resumir", "generar contenido", "document intelligence", "documentos",
        "llm", "gemini", "chat", "asistente conversacional", "busqueda semantica",
        "búsqueda semántica", "preguntas y respuestas",
    },
    "agentic_ai": {
        "agente", "agentico", "agéntico", "autonomo", "autónomo", "tool", "herramienta",
        "ejecutar acciones", "workflow", "orquestar", "multiagente", "multi-agent",
        "tomar acciones", "actualizar sistema", "copilot",
    },
    "data_governance": {
        "gobierno", "calidad", "linaje", "catalogo", "catálogo", "metadata", "metadatos",
        "data owner", "data steward", "privacidad", "clasificacion de datos", "clasificación de datos",
    },
}


def _normalized_text(*parts: str) -> str:
    return " ".join(part for part in parts if part).lower().strip()


def _matches(text: str, signals: set[str]) -> list[str]:
    return sorted(signal for signal in signals if signal in text)


def _project_subtype(project_type: str, text: str) -> str:
    if project_type == "dashboard_analytics":
        if "tiempo real" in text or "near real" in text:
            return "near_real_time_dashboard"
        if "ejecutivo" in text or "gerencia" in text:
            return "executive_dashboard"
        if "operativo" in text or "operacional" in text:
            return "operational_dashboard"
        return "analytics_dashboard"
    if project_type == "data_engineering":
        if "cdc" in text or "change data capture" in text:
            return "cdc_pipeline"
        if "streaming" in text or "tiempo real" in text:
            return "streaming_pipeline"
        if "data product" in text:
            return "data_product"
        return "batch_data_pipeline"
    if project_type == "machine_learning":
        if any(term in text for term in ("forecast", "pronost", "demanda")):
            return "forecasting"
        if "fraude" in text or "anomalia" in text or "anomalía" in text:
            return "anomaly_detection"
        if "mantenimiento" in text or "falla" in text:
            return "predictive_maintenance"
        if "optim" in text:
            return "optimization"
        return "predictive_classification"
    if project_type == "generative_ai":
        if "rag" in text or "busqueda" in text or "búsqueda" in text:
            return "rag"
        if "document" in text:
            return "document_intelligence"
        if "generar" in text or "contenido" in text:
            return "content_generation"
        return "conversational_assistant"
    if project_type == "data_governance":
        if "calidad" in text:
            return "data_quality"
        if "linaje" in text or "catalog" in text:
            return "metadata_lineage_catalog"
        return "governance_operating_model"
    if project_type == "agentic_ai":
        return _agent_type(text)
    return "general"


def _agent_type(text: str) -> str:
    if "multiagente" in text or "multi-agent" in text or "varios agentes" in text:
        return "multi_agent_system"
    if any(term in text for term in ("actualizar sistema", "ejecutar acciones", "tomar acciones", "autónomo", "autonomo")):
        return "action_agent"
    if any(term in text for term in ("workflow", "orquestar", "proceso", "herramienta", "tool")):
        return "workflow_agent"
    if any(term in text for term in ("recomendar", "recomendacion", "recomendación", "decision", "decisión")):
        return "recommendation_agent"
    return "knowledge_agent"


def classify_project_need(
    title: str,
    business_problem: str,
    desired_outcome: str,
    additional_context: str,
    tool_context: ToolContext,
) -> dict:
    """Classify a business need into the official ATLAS conversational project taxonomy."""

    text = _normalized_text(title, business_problem, desired_outcome, additional_context)
    scored: list[tuple[str, int, list[str]]] = []
    for project_type, signals in PROJECT_SIGNALS.items():
        matched = _matches(text, signals)
        score = sum(2 if " " in signal else 1 for signal in matched)
        scored.append((project_type, score, matched))

    scored.sort(key=lambda item: item[1], reverse=True)
    top_type, top_score, top_signals = scored[0]
    second_type, second_score, _ = scored[1]

    if top_score == 0:
        primary_type = "unknown"
        confidence = 0.0
        secondary: list[str] = []
    else:
        primary_type = top_type
        confidence = round(min(0.95, top_score / (top_score + max(second_score, 1))), 2)
        secondary = [item[0] for item in scored[1:4] if item[1] > 0]
        if second_score and second_score / top_score >= 0.85:
            secondary = [top_type, second_type, *secondary[1:]]

    subtype = _project_subtype(primary_type, text)
    agent_type = _agent_type(text) if primary_type == "agentic_ai" or "agentic_ai" in secondary else None
    result = {
        "primary_type": primary_type,
        "subtype": subtype,
        "agent_type": agent_type,
        "secondary_capabilities": secondary,
        "confidence": confidence,
        "signals": top_signals,
    }
    tool_context.state["project_classification"] = result
    return result


def capture_business_context(
    business_problem: str,
    desired_outcome: str,
    business_area: str,
    impacted_process: str,
    current_situation: str,
    stakeholders: list[str],
    success_metrics: list[str],
    data_sources: list[str],
    tool_context: ToolContext,
) -> dict:
    """Store structured facts learned from the guided business conversation in ADK session state."""

    context = {
        "business_problem": business_problem.strip(),
        "desired_outcome": desired_outcome.strip(),
        "business_area": business_area.strip(),
        "impacted_process": impacted_process.strip(),
        "current_situation": current_situation.strip(),
        "stakeholders": [item.strip() for item in stakeholders if item.strip()],
        "success_metrics": [item.strip() for item in success_metrics if item.strip()],
        "data_sources": [item.strip() for item in data_sources if item.strip()],
    }
    tool_context.state["business_context"] = context
    return context


def evaluate_data_readiness(
    data_sources: list[str],
    data_owner_known: bool,
    historical_data_known: bool,
    quality_known: bool,
    frequency_known: bool,
    access_known: bool,
    sensitive_data: bool,
    tool_context: ToolContext,
) -> dict:
    """Evaluate whether the known data context is sufficiently ready for project definition."""

    checks = {
        "sources_identified": bool(data_sources),
        "data_owner_known": data_owner_known,
        "historical_data_known": historical_data_known,
        "quality_known": quality_known,
        "frequency_known": frequency_known,
        "access_known": access_known,
    }
    score = round(sum(1 for value in checks.values() if value) / len(checks) * 100)
    gaps = [key for key, value in checks.items() if not value]
    if sensitive_data and "access_known" not in gaps:
        gaps.append("sensitive_data_controls_to_confirm")
    result = {
        "score": score,
        "status": "ready" if score >= 80 else "partial" if score >= 50 else "insufficient",
        "checks": checks,
        "sensitive_data": sensitive_data,
        "gaps": gaps,
        "questions": [f"Clarificar: {gap.replace('_', ' ')}" for gap in gaps],
    }
    tool_context.state["data_readiness"] = result
    return result


def validate_gcp_architecture(
    project_type: str,
    proposed_architecture: str,
    tool_context: ToolContext,
) -> dict:
    """Select and validate the approved end-to-end GCP architecture pattern for the project type."""

    patterns = load_architecture_catalog()
    pattern = next(
        (item for item in patterns if project_type in item.get("project_types", [])),
        None,
    )
    if not pattern:
        result = {
            "status": "no_approved_pattern",
            "project_type": project_type,
            "human_architecture_review_required": True,
            "gaps": ["No approved GCP architecture pattern is registered for this project type."],
        }
        tool_context.state["architecture_assessment"] = result
        return result

    technical_text = proposed_architecture.strip()
    if not technical_text:
        result = {
            "status": "approved_baseline_selected",
            "pattern_id": pattern["id"],
            "pattern_version": pattern["version"],
            "pattern_name": pattern.get("name"),
            "required_components": pattern.get("required_components", []),
            "gcp_services": pattern.get("gcp_services", []),
            "principle": pattern.get("principle"),
            "detected_components": [],
            "missing_components": [],
            "non_canonical_components": [],
            "human_architecture_review_required": False,
            "gaps": [],
        }
        tool_context.state["architecture_assessment"] = result
        return result

    detected = detect_components(technical_text)
    non_canonical = detect_non_canonical_components(technical_text)
    required = pattern.get("required_components", [])
    missing = [component for component in required if component not in detected]
    gaps: list[str] = []
    if non_canonical:
        gaps.append("Proposed architecture includes components outside the registered GCP baseline.")
    if missing:
        gaps.append("Proposed architecture does not yet evidence all mandatory lifecycle components.")

    result = {
        "status": "compliant" if not gaps else "review_required",
        "pattern_id": pattern["id"],
        "pattern_version": pattern["version"],
        "pattern_name": pattern.get("name"),
        "required_components": required,
        "gcp_services": pattern.get("gcp_services", []),
        "principle": pattern.get("principle"),
        "detected_components": detected,
        "missing_components": missing,
        "non_canonical_components": non_canonical,
        "human_architecture_review_required": bool(gaps),
        "gaps": gaps,
    }
    tool_context.state["architecture_assessment"] = result
    return result


def evaluate_governance_policies(
    project_type: str,
    known_controls: list[str],
    sensitive_data: bool,
    writes_to_systems: bool,
    tool_context: ToolContext,
) -> dict:
    """Return applicable versioned governance policies and missing mandatory controls from JSON catalog."""

    known = {item.strip() for item in known_controls if item.strip()}
    applicable: list[dict] = []
    missing_controls: set[str] = set()

    for policy in load_policy_catalog():
        project_types = policy.get("applies_to", {}).get("project_types", [])
        if project_type not in project_types:
            continue
        mandatory = policy.get("mandatory_controls", [])
        missing = [control for control in mandatory if control not in known]
        missing_controls.update(missing)
        applicable.append(
            {
                "id": policy["id"],
                "version": policy["version"],
                "name": policy.get("name"),
                "mandatory_controls": mandatory,
                "missing_controls": missing,
                "recommendation": policy.get("recommendation"),
            }
        )

    if sensitive_data:
        missing_controls.add("sensitive_data_controls")
    if project_type == "agentic_ai" and writes_to_systems:
        missing_controls.update({"human_approval_for_material_actions", "fallback_and_rollback"})

    result = {
        "project_type": project_type,
        "applicable_policies": applicable,
        "policy_references": [f"{item['id']}@{item['version']}" for item in applicable],
        "missing_controls": sorted(missing_controls),
        "sensitive_data": sensitive_data,
        "writes_to_systems": writes_to_systems,
        "status": "compliant" if not missing_controls else "controls_required",
    }
    tool_context.state["policy_assessment"] = result
    return result


def build_business_case_snapshot(tool_context: ToolContext) -> dict:
    """Build the canonical Business Case from facts and specialist assessments stored in session state."""

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
        "project_classification": bool(classification.get("primary_type") and classification.get("primary_type") != "unknown"),
        "data_readiness": bool(data_readiness),
        "architecture_assessment": bool(architecture),
        "policy_assessment": bool(policies),
    }
    completeness = round(sum(1 for value in required.values() if value) / len(required) * 100)
    gaps: list[str] = [key for key, value in required.items() if not value]
    gaps.extend(data_readiness.get("gaps", []))
    gaps.extend(architecture.get("gaps", []))
    gaps.extend(policies.get("missing_controls", []))
    gaps = list(dict.fromkeys(gaps))

    project_type = classification.get("primary_type", "unknown")
    if project_type == "agentic_ai" and classification.get("agent_type") == "action_agent":
        preliminary_risk = "high"
    elif project_type in {"machine_learning", "generative_ai", "agentic_ai"}:
        preliminary_risk = "medium"
    else:
        preliminary_risk = "low"

    ready = completeness == 100 and bool(policies) and bool(architecture)
    business_case = {
        **context,
        "project_classification": classification,
        "data_readiness": data_readiness,
        "architecture_assessment": architecture,
        "policy_assessment": policies,
        "preliminary_risk": preliminary_risk,
        "gaps": gaps,
        "recommendation": "ready_for_user_confirmation" if ready else "continue_refinement",
        "completeness": completeness,
        "ready_to_register": ready,
    }
    tool_context.state["business_case"] = business_case
    return business_case
