"""Local policy retrieval for Sprint 04 Policy RAG MVP."""
from __future__ import annotations

from dataclasses import asdict

from atlas_datagob.services.policy_loader import PolicyChunk, PolicyDocument, chunk_policy_documents
from atlas_datagob.services.rag_lite import cosine_similarity, vectorize


def retrieve_policy_chunks(
    query: str,
    documents: list[PolicyDocument],
    *,
    top_k: int = 5,
    threshold: float = 0.05,
) -> list[dict]:
    """Return the most relevant Markdown policy chunks using lexical cosine similarity."""

    chunks = chunk_policy_documents(documents)
    query_vector = vectorize(query)
    matches: list[tuple[float, PolicyChunk]] = []

    for chunk in chunks:
        score = cosine_similarity(query_vector, vectorize(f"{chunk.title} {chunk.category} {chunk.text}"))
        if score >= threshold:
            matches.append((score, chunk))

    ranked = sorted(matches, key=lambda item: item[0], reverse=True)[:top_k]
    return [
        {
            **asdict(chunk),
            "score": round(score, 3),
            "excerpt": chunk.text[:360].replace("\n", " ").strip(),
        }
        for score, chunk in ranked
    ]


def build_policy_query(
    title: str,
    description: str,
    initiative_type: str,
    target_consumption: str | None = None,
) -> str:
    """Compose a stable retrieval query from intake context."""

    return " ".join(
        part
        for part in [title, description, initiative_type, target_consumption or ""]
        if part
    )
