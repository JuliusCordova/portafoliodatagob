"""Markdown policy loading utilities for ATLAS DataGob."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PolicyDocument:
    """A versioned policy document loaded from the repository."""

    policy_id: str
    title: str
    category: str
    path: str
    content: str


@dataclass(frozen=True)
class PolicyChunk:
    """A searchable chunk of a policy document."""

    policy_id: str
    title: str
    category: str
    path: str
    chunk_id: str
    text: str


def _title_from_content(content: str, fallback: str) -> str:
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return fallback.replace("-", " ").replace("_", " ").title()


def _policy_id_from_path(path: Path) -> str:
    stem = path.stem.lower().replace("_", "-")
    return stem


def _category_from_path(root: Path, path: Path) -> str:
    relative = path.relative_to(root)
    if len(relative.parts) > 1:
        return relative.parts[0]
    return "general"


def load_policy_documents(root: str | Path = "docs/policies") -> list[PolicyDocument]:
    """Load all Markdown policies below a repository policy folder."""

    policy_root = Path(root)
    if not policy_root.exists():
        return []

    documents: list[PolicyDocument] = []
    for path in sorted(policy_root.rglob("*.md")):
        content = path.read_text(encoding="utf-8")
        documents.append(
            PolicyDocument(
                policy_id=_policy_id_from_path(path),
                title=_title_from_content(content, path.stem),
                category=_category_from_path(policy_root, path),
                path=str(path),
                content=content,
            )
        )
    return documents


def chunk_policy_documents(
    documents: list[PolicyDocument],
    *,
    max_chars: int = 900,
) -> list[PolicyChunk]:
    """Create deterministic chunks from Markdown policies without external dependencies."""

    chunks: list[PolicyChunk] = []
    for document in documents:
        sections: list[str] = []
        buffer: list[str] = []
        for line in document.content.splitlines():
            if line.startswith("## ") and buffer:
                sections.append("\n".join(buffer).strip())
                buffer = [line]
            else:
                buffer.append(line)
        if buffer:
            sections.append("\n".join(buffer).strip())

        if not sections:
            sections = [document.content]

        chunk_number = 1
        for section in sections:
            current = section.strip()
            while current:
                piece = current[:max_chars].strip()
                chunks.append(
                    PolicyChunk(
                        policy_id=document.policy_id,
                        title=document.title,
                        category=document.category,
                        path=document.path,
                        chunk_id=f"{document.policy_id}-{chunk_number:03d}",
                        text=piece,
                    )
                )
                current = current[max_chars:].strip()
                chunk_number += 1
    return chunks


def policy_documents_as_dicts(documents: list[PolicyDocument]) -> list[dict]:
    return [
        {
            "policy_id": item.policy_id,
            "title": item.title,
            "category": item.category,
            "path": item.path,
        }
        for item in documents
    ]
