"""Repository boundary for ATLAS DataGob demand persistence.

The MVP still persists demand records in a local JSON file, but product code should
not be coupled to that storage detail forever. This module defines a small
repository contract and a local JSON adapter that can be replaced by Firestore,
Cloud SQL, BigQuery or another managed store without changing the demand
lifecycle contract.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Protocol

from atlas_datagob.services.demand_lifecycle import normalize_and_validate_records
from atlas_datagob.services.persistence_config import (
    DEFAULT_REPOSITORY_ADAPTER,
    demand_repository_adapter,
    validate_persistence_configuration,
)


class DemandRepository(Protocol):
    """Storage contract required by the demand backlog service."""

    def load_all(self) -> list[dict]:
        """Return every persisted demand record."""

    def replace_all(self, records: list[dict]) -> None:
        """Replace the complete persisted demand collection."""


class LocalJsonDemandRepository:
    """Demand repository backed by a JSON file.

    This is the default MVP adapter. It intentionally keeps the same local file
    semantics used by earlier sprints while adding a stable repository boundary.
    """

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)

    def load_all(self) -> list[dict]:
        if not self.path.exists():
            return []
        with self.path.open("r", encoding="utf-8") as file:
            payload = json.load(file)
        if not isinstance(payload, list):
            raise ValueError(f"Invalid demand backlog payload in {self.path}")
        return normalize_and_validate_records(payload)

    def replace_all(self, records: list[dict]) -> None:
        normalized = normalize_and_validate_records(records)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as file:
            json.dump(normalized, file, indent=2, ensure_ascii=False)
            file.write("\n")


def demand_repository_for(path: str | Path, adapter: str | None = None) -> DemandRepository:
    """Return the repository adapter for the configured demand backlog path."""

    selected_adapter = adapter or demand_repository_adapter()
    if selected_adapter != DEFAULT_REPOSITORY_ADAPTER:
        validate_persistence_configuration()
    return LocalJsonDemandRepository(path)
