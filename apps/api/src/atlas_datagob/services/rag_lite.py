"""Low-cost local RAG utilities for Sprint 02."""
from __future__ import annotations

from collections import Counter
from dataclasses import asdict
import json
from math import sqrt
from pathlib import Path
import re
from typing import Iterable

from atlas_datagob.domain.enums import InitiativeType
from atlas_datagob.domain.models import DemandRequest, SimilarProject

_TOKEN_PATTERN = re.compile(r"[\wáéíóúñü]+", re.IGNORECASE)


def tokenize(text: str) -> list[str]:
    return [token.lower() for token in _TOKEN_PATTERN.findall(text)]


def vectorize(text: str) -> Counter[str]:
    return Counter(tokenize(text))


def cosine_similarity(left: Counter[str], right: Counter[str]) -> float:
    if not left or not right:
        return 0.0
    common = set(left).intersection(right)
    numerator = sum(left[token] * right[token] for token in common)
    left_norm = sqrt(sum(value * value for value in left.values()))
    right_norm = sqrt(sum(value * value for value in right.values()))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return numerator / (left_norm * right_norm)


def load_projects(path: str | Path) -> list[dict]:
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Synthetic projects file not found: {file_path}")
    return json.loads(file_path.read_text(encoding="utf-8"))


def find_similar_projects(
    request: DemandRequest,
    projects: Iterable[dict],
    *,
    top_k: int = 3,
    threshold: float = 0.12,
) -> list[SimilarProject]:
    query_vector = vectorize(f"{request.title} {request.description} {request.domain_hint or ''}")
    matches: list[SimilarProject] = []

    for project in projects:
        project_text = " ".join(
            str(project.get(field, ""))
            for field in ["title", "description", "domain", "subdomain", "initiative_type", "tags"]
        )
        similarity = cosine_similarity(query_vector, vectorize(project_text))
        if similarity >= threshold:
            matches.append(
                SimilarProject(
                    project_id=project["project_id"],
                    title=project["title"],
                    initiative_type=InitiativeType(project.get("initiative_type", "unknown")),
                    domain=project.get("domain", "unknown"),
                    similarity=round(similarity, 3),
                    reusable_patterns=project.get("reusable_patterns", []),
                    metadata={"source": project.get("source", "synthetic")},
                )
            )

    return sorted(matches, key=lambda item: item.similarity, reverse=True)[:top_k]


def similar_projects_as_dicts(items: Iterable[SimilarProject]) -> list[dict]:
    return [asdict(item) for item in items]
