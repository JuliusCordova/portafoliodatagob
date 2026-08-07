"""Rule-based classifier used as deterministic MVP baseline."""
from __future__ import annotations

from collections import Counter
import re

from atlas_datagob.domain.enums import InitiativeType
from atlas_datagob.domain.models import ClassificationResult, DemandRequest

_KEYWORDS: dict[InitiativeType, set[str]] = {
    InitiativeType.DATA_ENGINEERING: {
        "pipeline", "ingesta", "etl", "elt", "bronze", "silver", "gold", "lakehouse",
        "databricks", "bigquery", "spark", "orquestacion", "batch", "streaming",
        "cdc", "integracion", "fuente", "procesamiento", "modelo analitico",
    },
    InitiativeType.DATA_GOVERNANCE: {
        "gobierno", "calidad", "linaje", "catalogo", "diccionario", "dominio",
        "steward", "owner", "data owner", "data steward", "metadata", "purview",
        "dataplex", "politica", "acceso", "privacidad", "clasificacion", "regla",
    },
    InitiativeType.MACHINE_LEARNING: {
        "modelo", "prediccion", "machine learning", "ml", "entrenamiento", "feature",
        "precision", "recall", "clasificador", "forecast", "score", "riesgo", "fraude",
        "churn", "propension", "segmentacion", "drift",
    },
    InitiativeType.AGENTIC_AI: {
        "agente", "agentico", "chatbot", "llm", "gemini", "copilot", "prompt",
        "herramienta", "tool", "rag", "conversacional", "automatizar decision",
        "asistente", "workflow agentico", "multiagente", "adk",
    },
}

_WORD_PATTERN = re.compile(r"[\wáéíóúñü]+", re.IGNORECASE)


def _normalize(text: str) -> str:
    return text.lower().strip()


def _tokenize(text: str) -> set[str]:
    normalized = _normalize(text)
    tokens = set(_WORD_PATTERN.findall(normalized))
    phrases = {phrase for values in _KEYWORDS.values() for phrase in values if " " in phrase and phrase in normalized}
    return tokens | phrases


def classify_demand(request: DemandRequest) -> ClassificationResult:
    """Classify a demand request into a canonical initiative type."""

    text = " ".join(filter(None, [request.title, request.description, request.domain_hint or ""]))
    tokens = _tokenize(text)
    scores: Counter[InitiativeType] = Counter()
    signals: dict[InitiativeType, list[str]] = {}

    for initiative_type, keywords in _KEYWORDS.items():
        matched = sorted(tokens.intersection(keywords))
        if matched:
            scores[initiative_type] = sum(2 if " " in kw else 1 for kw in matched)
            signals[initiative_type] = matched

    if not scores:
        return ClassificationResult(
            initiative_type=InitiativeType.UNKNOWN,
            confidence=0.0,
            rationale="No se encontraron señales suficientes para clasificar la iniciativa.",
            signals=[],
        )

    ranked = scores.most_common()
    top_type, top_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0
    total_score = sum(scores.values())

    if len(ranked) > 1 and second_score / top_score >= 0.65:
        initiative_type = InitiativeType.HYBRID
        secondary_types = [item[0] for item in ranked[:3]]
        chosen_signals = sorted({kw for t in secondary_types for kw in signals.get(t, [])})
        rationale = "La solicitud combina señales relevantes de más de una categoría."
        confidence = min(0.95, total_score / (total_score + 3))
    else:
        initiative_type = top_type
        secondary_types = [item[0] for item in ranked[1:3]]
        chosen_signals = signals[top_type]
        rationale = f"La mayor concentración de señales corresponde a {top_type.value}."
        confidence = min(0.95, top_score / (top_score + max(1, second_score) + 1))

    return ClassificationResult(
        initiative_type=initiative_type,
        confidence=round(confidence, 2),
        rationale=rationale,
        signals=chosen_signals,
        secondary_types=secondary_types,
    )
