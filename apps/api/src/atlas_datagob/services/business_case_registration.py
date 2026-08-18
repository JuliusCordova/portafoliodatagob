"""Deterministic adapter from the canonical conversational Business Case to demand validation contract."""
from __future__ import annotations


FINOPS_CONTROL_NAMES = {
    "cost_owner",
    "budget",
    "labels",
    "cost_monitoring",
}


def _target_consumption(project_type: str) -> str:
    return {
        "dashboard_analytics": "BI ejecutivo / dashboard",
        "machine_learning": "Machine Learning",
        "generative_ai": "GenAI / RAG",
        "agentic_ai": "GenAI / RAG / agente",
        "data_engineering": "Data platform / governed data product",
        "data_governance": "Gobierno de datos",
        "hybrid": "Consumo híbrido",
    }.get(project_type, "Por definir")


def business_case_title(business_case: dict) -> str:
    classification = business_case.get("project_classification", {})
    subtype = str(classification.get("subtype") or classification.get("primary_type") or "iniciativa")
    outcome = str(business_case.get("desired_outcome") or business_case.get("business_problem") or "Caso de negocio")
    label = subtype.replace("_", " ").strip().title()
    return f"{label}: {outcome[:90]}"


def business_case_description(business_case: dict) -> str:
    parts = [
        f"Problema de negocio: {business_case.get('business_problem', '')}",
        f"Resultado esperado: {business_case.get('desired_outcome', '')}",
        f"Situación actual: {business_case.get('current_situation', '')}",
        f"Proceso impactado: {business_case.get('impacted_process', '')}",
    ]
    sources = business_case.get("data_sources", [])
    if sources:
        parts.append("Fuentes conocidas: " + ", ".join(str(item) for item in sources))
    metrics = business_case.get("success_metrics", [])
    if metrics:
        parts.append("Métricas de éxito: " + ", ".join(str(item) for item in metrics))
    return "\n".join(part for part in parts if not part.endswith(": "))


def business_case_to_validation_result(business_case: dict) -> dict:
    """Convert the confirmed Business Case into the existing deterministic demand creation contract.

    This adapter intentionally does not reclassify the initiative with the legacy classifier.
    The Feature 54 project classification, architecture catalog references and policy IDs are
    preserved as the canonical intake evidence.
    """

    classification = dict(business_case.get("project_classification", {}))
    architecture = dict(business_case.get("architecture_assessment", {}))
    policy = dict(business_case.get("policy_assessment", {}))
    readiness = dict(business_case.get("data_readiness", {}))

    project_type = str(classification.get("primary_type") or "unknown")
    architecture_gaps = list(architecture.get("gaps", []))
    policy_gaps = list(policy.get("missing_controls", []))
    finops_gaps = [gap for gap in policy_gaps if gap in FINOPS_CONTROL_NAMES]

    human_architecture_review = bool(architecture.get("human_architecture_review_required"))
    readiness_status = str(readiness.get("status") or "insufficient")

    if readiness_status == "insufficient":
        next_action = "request_more_info"
        suggested_decision = "reformulation_required"
        committee_stage = "intake_refinement"
    elif human_architecture_review:
        next_action = "architect_review"
        suggested_decision = "architect_review"
        committee_stage = "operative_committee_review"
    else:
        next_action = "operative_committee_review"
        suggested_decision = "operative_committee_review"
        committee_stage = "operative_committee_review"

    policy_refs = policy.get("policy_references", [])
    pattern_id = architecture.get("pattern_id")
    pattern_version = architecture.get("pattern_version")

    structured_request = {
        "title": business_case_title(business_case),
        "description": business_case_description(business_case),
        "requester_area": str(business_case.get("business_area") or "unknown"),
        "requester_role": "Data Owner",
        "domain_hint": None,
        "target_consumption": _target_consumption(project_type),
    }

    canonical_classification = {
        "initiative_type": project_type,
        "subtype": classification.get("subtype"),
        "agent_type": classification.get("agent_type"),
        "confidence": classification.get("confidence", 0.0),
        "signals": classification.get("signals", []),
        "secondary_types": classification.get("secondary_capabilities", []),
        "classifier": "feature54_conversational_governed_intake",
    }

    committee = {
        "committee_stage": committee_stage,
        "data_architect_final_validation_required": human_architecture_review,
        "suggested_decision": suggested_decision,
        "rejection_allowed": True,
        "rationale": (
            "El Caso de Negocio fue confirmado por el usuario. Comité revisa valor, brechas conocidas, "
            "readiness, patrón GCP y controles aplicables antes del scoring."
        ),
        "required_review_roles": ["Data Owner", "Data Steward", "Data Architect"],
    }

    evidence_parts = [
        f"Tipo: {project_type}",
        f"Data Readiness: {readiness.get('score', 0)}% ({readiness_status})",
    ]
    if pattern_id:
        evidence_parts.append(f"Arquitectura: {pattern_id}@{pattern_version}")
    if policy_refs:
        evidence_parts.append("Políticas: " + ", ".join(str(item) for item in policy_refs))

    return {
        "structured_request": structured_request,
        "classification": canonical_classification,
        "architecture": architecture,
        "policy_matches": [
            {"reference": reference, "source": "governance_json_catalog"}
            for reference in policy_refs
        ],
        "similar_projects": [],
        "policy_gaps": policy_gaps,
        "architecture_gaps": architecture_gaps,
        "finops_gaps": finops_gaps,
        "operative_committee": committee,
        "human_architecture_review_required": human_architecture_review,
        "recommended_next_action": next_action,
        "committee_summary": " · ".join(evidence_parts),
        "agent_trace": [
            "ATLAS Intake Orchestrator",
            "Data Readiness Agent",
            "Architecture Validation Agent",
            "Policy & Controls Agent",
            "Deterministic Business Case Registration Adapter",
        ],
    }
