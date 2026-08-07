"""Policy RAG and architecture validation orchestration for intake."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path

from atlas_datagob.domain.models import DemandRequest
from atlas_datagob.services.architecture_compliance import (
    architecture_result_as_dict,
    validate_architecture_compliance,
)
from atlas_datagob.services.classifier import classify_demand
from atlas_datagob.services.operative_committee import committee_route_as_dict, route_to_operative_committee
from atlas_datagob.services.policy_loader import load_policy_documents, policy_documents_as_dicts
from atlas_datagob.services.policy_retrieval import build_policy_query, retrieve_policy_chunks
from atlas_datagob.services.rag_lite import find_similar_projects, load_projects, similar_projects_as_dicts

POLICY_ROOT = Path("docs/policies")
SYNTHETIC_PROJECTS_PATH = Path("data/synthetic/projects/existing_projects.json")


@dataclass(frozen=True)
class IntakeValidationContext:
    title: str
    description: str
    requester_area: str = "unknown"
    requester_role: str = "unknown"
    domain_hint: str | None = None
    target_consumption: str | None = None


@dataclass(frozen=True)
class PolicyArchitectureValidationResult:
    structured_request: dict
    classification: dict
    architecture: dict
    policy_matches: list[dict]
    similar_projects: list[dict]
    policy_gaps: list[str]
    architecture_gaps: list[str]
    finops_gaps: list[str]
    operative_committee: dict
    human_architecture_review_required: bool
    recommended_next_action: str
    committee_summary: str


def _find_policy_gaps(description: str, architecture_missing_components: list[str]) -> list[str]:
    text = description.lower()
    gaps: list[str] = []

    if "reconciliation" in architecture_missing_components or "reconciliation" not in text and "cuadratura" not in text:
        gaps.append("Definir puntos de reconciliación/cuadratura desde ingesta hasta capa de consumo.")
    if "semantic_model" in architecture_missing_components or "certified_dataset" in architecture_missing_components:
        gaps.append("Definir modelo semántico o dataset certificado para consumo BI/reutilizable.")
    if "feature_layer" in architecture_missing_components:
        gaps.append("Definir ciclo de vida de features para Machine Learning.")
    if {"knowledge_layer", "retrieval_governance", "embeddings", "vector_index"}.intersection(architecture_missing_components):
        gaps.append("Definir capa de conocimiento, embeddings, índice vectorial, fuentes trazables y gobierno del retrieval para GenAI/RAG.")
    if "owner" not in text and "steward" not in text and "responsable" not in text:
        gaps.append("Asignar Data Owner y Data Steward antes de comité.")
    return gaps


def _find_finops_gaps(description: str, architecture_missing_components: list[str]) -> list[str]:
    text = description.lower()
    gaps: list[str] = []
    if "finops" in architecture_missing_components or "costo" not in text and "presupuesto" not in text and "budget" not in text:
        gaps.append("Definir owner de costo, presupuesto, alertas y estrategia de consumo.")
    if "particion" not in text and "clustering" not in text and "volumen" not in text:
        gaps.append("Estimar volumen, frecuencia de consulta y estrategia de particionado/clustering si aplica.")
    return gaps


def _committee_summary(
    request: DemandRequest,
    initiative_type: str,
    architecture_pattern: str,
    policy_gaps: list[str],
    architecture_gaps: list[str],
    next_action: str,
) -> str:
    if policy_gaps or architecture_gaps:
        gap_count = len(policy_gaps) + len(architecture_gaps)
        return (
            f"La solicitud '{request.title}' fue clasificada como {initiative_type} y mapeada al patrón "
            f"{architecture_pattern}. Se detectaron {gap_count} brechas que deben ser revisadas por el "
            f"Comité Operativo con validación final del Arquitecto de Datos. Acción sugerida: {next_action}."
        )
    return (
        f"La solicitud '{request.title}' fue clasificada como {initiative_type} y mapeada al patrón "
        f"{architecture_pattern}. No se detectaron brechas críticas en la validación automática; debe pasar "
        "a Comité Operativo para validación final del Arquitecto de Datos."
    )


def validate_policy_architecture(
    context: IntakeValidationContext,
    *,
    policy_root: str | Path = POLICY_ROOT,
    synthetic_projects_path: str | Path = SYNTHETIC_PROJECTS_PATH,
) -> PolicyArchitectureValidationResult:
    """Validate intake against policies, canonical architecture and committee workflow."""

    request = DemandRequest(
        title=context.title,
        description=context.description,
        requester_area=context.requester_area,
        requester_role=context.requester_role,
        domain_hint=context.domain_hint,
    )
    classification = classify_demand(request)
    architecture = validate_architecture_compliance(
        request,
        classification.initiative_type,
        target_consumption=context.target_consumption,
    )

    documents = load_policy_documents(policy_root)
    policy_query = build_policy_query(
        context.title,
        context.description,
        classification.initiative_type.value,
        context.target_consumption,
    )
    policy_matches = retrieve_policy_chunks(policy_query, documents, top_k=5)

    policy_gaps = _find_policy_gaps(context.description, architecture.missing_components)
    finops_gaps = _find_finops_gaps(context.description, architecture.missing_components)
    all_policy_gaps = policy_gaps + finops_gaps

    similar_projects: list[dict] = []
    projects_path = Path(synthetic_projects_path)
    if projects_path.exists():
        similar_projects = similar_projects_as_dicts(find_similar_projects(request, load_projects(projects_path)))

    committee_route = route_to_operative_committee(
        is_architecture_compliant=architecture.is_compliant,
        policy_gaps=all_policy_gaps,
        architecture_gaps=architecture.architecture_gaps,
        human_architecture_review_required=architecture.human_architecture_review_required,
    )

    next_action = committee_route.suggested_decision
    return PolicyArchitectureValidationResult(
        structured_request={
            "title": request.title,
            "description": request.description,
            "requester_area": request.requester_area,
            "requester_role": request.requester_role,
            "domain_hint": request.domain_hint,
            "target_consumption": context.target_consumption,
        },
        classification={
            "initiative_type": classification.initiative_type.value,
            "confidence": classification.confidence,
            "rationale": classification.rationale,
            "signals": classification.signals,
            "secondary_types": [item.value for item in classification.secondary_types],
        },
        architecture=architecture_result_as_dict(architecture),
        policy_matches=policy_matches,
        similar_projects=similar_projects,
        policy_gaps=all_policy_gaps,
        architecture_gaps=architecture.architecture_gaps,
        finops_gaps=finops_gaps,
        operative_committee=committee_route_as_dict(committee_route),
        human_architecture_review_required=architecture.human_architecture_review_required,
        recommended_next_action=next_action,
        committee_summary=_committee_summary(
            request,
            classification.initiative_type.value,
            architecture.architecture_pattern,
            all_policy_gaps,
            architecture.architecture_gaps,
            next_action,
        ),
    )


def validation_result_as_dict(result: PolicyArchitectureValidationResult) -> dict:
    return asdict(result)


def available_policies(root: str | Path = POLICY_ROOT) -> list[dict]:
    return policy_documents_as_dicts(load_policy_documents(root))
