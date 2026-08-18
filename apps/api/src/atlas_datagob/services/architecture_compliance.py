"""Architecture compliance validation against a predefined Google Cloud reference architecture."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
import re

from atlas_datagob.domain.enums import InitiativeType
from atlas_datagob.domain.models import DemandRequest

_TOKEN_PATTERN = re.compile(r"[\wáéíóúñü]+", re.IGNORECASE)

APPROVED_PATTERNS = {
    "bi_reporting": [
        "sources", "extraction", "landing", "bronze", "silver", "gold",
        "certified_dataset", "semantic_model", "serving", "monitoring", "finops",
    ],
    "data_engineering": [
        "sources", "extraction", "landing", "bronze", "silver", "gold",
        "reconciliation", "quality", "lineage", "monitoring", "finops",
    ],
    "machine_learning": [
        "sources", "extraction", "bronze", "silver", "gold", "feature_layer",
        "model_registry", "serving", "model_monitoring", "finops",
    ],
    "genai_rag": [
        "sources", "extraction", "bronze", "silver", "gold", "knowledge_layer",
        "embeddings", "vector_index", "retrieval_governance", "serving", "monitoring", "finops",
    ],
    "streaming": [
        "sources", "event_ingestion", "bronze", "silver", "serving",
        "state_management", "reconciliation", "monitoring", "finops",
    ],
}

NON_CANONICAL_COMPONENT_SIGNALS = {
    "snowflake", "redshift", "synapse", "fabric", "aws", "azure", "oracle cloud",
    "on premise only", "manual excel", "spreadsheet as source of truth",
}

COMPONENT_SIGNALS = {
    "sources": {"fuente", "fuentes", "source", "sources", "erp", "crm", "api", "archivos", "logs", "eventos"},
    "extraction": {"extraccion", "extracción", "extraction", "ingesta", "ingestion", "etl", "elt", "datastream", "dataflow"},
    "landing": {"landing", "raw", "zona de aterrizaje", "cloud storage", "gcs"},
    "bronze": {"bronze", "crudo", "crudos", "raw", "landing"},
    "silver": {"silver", "limpieza", "calidad", "estandarizacion", "estandarización", "integracion", "integración"},
    "gold": {"gold", "data mart", "modelo estrella", "hechos", "dimensiones", "fact", "dim"},
    "quality": {"quality", "calidad", "reglas de calidad", "validacion", "validación"},
    "lineage": {"lineage", "linaje", "trazabilidad", "catalogo", "catálogo", "dataplex"},
    "serving": {"serving", "consumo", "endpoint", "api", "dashboard", "reporte", "agente"},
    "monitoring": {"monitoring", "monitoreo", "observabilidad", "logging", "alertas", "sla"},
    "reconciliation": {"cuadratura", "reconciliacion", "reconciliación", "control", "conteo", "totales", "validacion", "validación"},
    "semantic_model": {"modelo semantico", "modelo semántico", "semantic model", "power bi", "looker", "metricas certificadas", "métricas certificadas"},
    "certified_dataset": {"dataset certificado", "certified dataset", "data product", "dataset"},
    "feature_layer": {"feature", "feature layer", "features", "variables", "entrenamiento"},
    "model_registry": {"registry", "registro de modelo", "model registry", "versionado de modelo"},
    "model_monitoring": {"drift", "monitoreo de modelo", "model monitoring", "precision", "precisión", "recall"},
    "knowledge_layer": {"knowledge", "capa de conocimiento", "fuentes", "documentos", "contexto"},
    "embeddings": {"embedding", "embeddings", "vector"},
    "vector_index": {"vector search", "indice vectorial", "índice vectorial", "vector index", "bigquery vector"},
    "retrieval_governance": {"retrieval", "trazabilidad", "grounding", "fuente citada", "rag"},
    "finops": {"finops", "costo", "costos", "budget", "presupuesto", "labels", "billing", "particionado", "clustering"},
    "event_ingestion": {"pubsub", "pub/sub", "streaming", "evento", "tiempo real", "datastream"},
    "state_management": {"estado", "state", "checkpoint", "exactly once", "ventanas"},
    "security": {"seguridad", "security", "iam", "cifrado", "encryption", "secret manager", "vpc", "private access", "least privilege"},
    "tool_boundary": {"tool boundary", "tool allowlist", "herramientas permitidas", "allowlist", "function calling"},
    "identity": {"identidad", "identity", "service account", "managed identity", "iam"},
    "human_approval": {"human in the loop", "human approval", "aprobacion humana", "aprobación humana", "visto bueno humano"},
    "audit_log": {"audit log", "auditoria", "auditoría", "cloud audit logs", "logging"},
    "rollback": {"rollback", "reversa", "reversión", "reversion", "fallback", "contingencia"},
}


@dataclass(frozen=True)
class ArchitectureValidationResult:
    architecture_pattern: str
    is_compliant: bool
    detected_components: list[str]
    required_components: list[str]
    missing_components: list[str]
    architecture_gaps: list[str]
    non_canonical_components: list[str]
    human_architecture_review_required: bool
    recommended_next_action: str
    rationale: str
    metadata: dict[str, str] = field(default_factory=dict)


def _normalize(text: str) -> str:
    return text.lower().strip()


def _tokens(text: str) -> set[str]:
    return set(_TOKEN_PATTERN.findall(_normalize(text)))


def _contains_phrase(text: str, phrase: str) -> bool:
    return phrase in text


def _request_text(request: DemandRequest, target_consumption: str | None = None) -> str:
    return _normalize(" ".join([request.title, request.description, request.domain_hint or "", target_consumption or ""]))


def infer_architecture_pattern(
    request: DemandRequest,
    initiative_type: InitiativeType,
    target_consumption: str | None = None,
) -> str:
    text = _request_text(request, target_consumption)
    token_set = _tokens(text)

    if {"streaming", "evento", "eventos", "tiempo", "real", "pubsub", "datastream"}.intersection(token_set):
        return "streaming"
    if initiative_type == InitiativeType.MACHINE_LEARNING or {"ml", "machine", "learning", "prediccion", "feature", "entrenamiento"}.intersection(token_set):
        return "machine_learning"
    if initiative_type == InitiativeType.AGENTIC_AI or {"rag", "llm", "gemini", "agente", "agentico", "chatbot", "embedding"}.intersection(token_set):
        return "genai_rag"
    if {"bi", "dashboard", "reporte", "power", "looker", "kpi", "metricas", "métricas"}.intersection(token_set):
        return "bi_reporting"
    if initiative_type in {InitiativeType.DATA_ENGINEERING, InitiativeType.DATA_GOVERNANCE, InitiativeType.HYBRID}:
        return "data_engineering"
    return "unknown"


def detect_components(text: str) -> list[str]:
    normalized = _normalize(text)
    found: list[str] = []
    for component, signals in COMPONENT_SIGNALS.items():
        if any(signal in normalized for signal in signals):
            found.append(component)
    return sorted(found)


def detect_non_canonical_components(text: str) -> list[str]:
    normalized = _normalize(text)
    return sorted(signal for signal in NON_CANONICAL_COMPONENT_SIGNALS if _contains_phrase(normalized, signal))


def validate_architecture_compliance(
    request: DemandRequest,
    initiative_type: InitiativeType,
    *,
    target_consumption: str | None = None,
) -> ArchitectureValidationResult:
    text = _request_text(request, target_consumption)
    pattern = infer_architecture_pattern(request, initiative_type, target_consumption)
    required = APPROVED_PATTERNS.get(pattern, [])
    detected = detect_components(text)
    non_canonical = detect_non_canonical_components(text)

    missing = [component for component in required if component not in detected]
    gaps: list[str] = []

    if pattern == "unknown":
        gaps.append("No se pudo mapear el requerimiento a un patrón de arquitectura aprobado.")
    if non_canonical:
        gaps.append("El requerimiento menciona componentes no registrados en la arquitectura canónica.")
    if missing:
        gaps.append("Faltan componentes obligatorios del patrón aprobado: " + ", ".join(missing[:8]) + ".")

    critical_missing = {
        "reconciliation", "semantic_model", "certified_dataset", "feature_layer",
        "knowledge_layer", "retrieval_governance", "model_monitoring", "finops",
    }.intersection(missing)
    human_review = bool(pattern == "unknown" or non_canonical or critical_missing)

    is_compliant = not gaps
    if is_compliant:
        next_action = "operative_committee_review"
        rationale = "El requerimiento calza con un patrón aprobado y no presenta brechas críticas detectadas."
    elif human_review:
        next_action = "architect_review"
        rationale = "El requerimiento requiere validación final del Arquitecto de Datos antes de continuar."
    else:
        next_action = "request_more_info"
        rationale = "El requerimiento requiere información adicional para completar la validación de arquitectura."

    return ArchitectureValidationResult(
        architecture_pattern=pattern,
        is_compliant=is_compliant,
        detected_components=detected,
        required_components=required,
        missing_components=missing,
        architecture_gaps=gaps,
        non_canonical_components=non_canonical,
        human_architecture_review_required=human_review,
        recommended_next_action=next_action,
        rationale=rationale,
        metadata={"validator": "Architecture Compliance Agent", "reference": "Google Cloud canonical architecture"},
    )


def architecture_result_as_dict(result: ArchitectureValidationResult) -> dict:
    return asdict(result)
