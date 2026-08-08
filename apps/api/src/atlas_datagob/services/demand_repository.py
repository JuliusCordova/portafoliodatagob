"""Repository boundary for ATLAS DataGob demand persistence.

The MVP still persists demand records in a local JSON file, but product code should
not be coupled to that storage detail forever. This module defines a small
repository contract and adapters that can be swapped through configuration
without changing the demand lifecycle contract.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Protocol

from atlas_datagob.services.demand_lifecycle import normalize_and_validate_records
from atlas_datagob.services.persistence_config import (
    DEFAULT_REPOSITORY_ADAPTER,
    FIRESTORE_REPOSITORY_ADAPTER,
    demand_repository_adapter,
    firestore_collection,
    firestore_database,
    firestore_project_id,
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


class FirestoreDemandRepository:
    """Demand repository backed by Google Cloud Firestore.

    The adapter uses lazy imports so local development and CI do not require the
    Google Cloud dependency unless the Firestore adapter is selected at runtime.
    Tests can inject a lightweight fake client through the ``client`` argument.
    """

    def __init__(
        self,
        *,
        collection_name: str,
        project_id: str | None = None,
        database: str | None = None,
        client: Any | None = None,
    ) -> None:
        self.collection_name = collection_name
        self.project_id = project_id
        self.database = database
        self._client = client

    @property
    def client(self) -> Any:
        if self._client is None:
            try:
                from google.cloud import firestore  # type: ignore
            except ImportError as exc:  # pragma: no cover - dependency is optional in CI
                raise RuntimeError(
                    "Firestore adapter selected but google-cloud-firestore is not installed. "
                    "Install the optional dependency before setting ATLAS_DEMAND_REPOSITORY=firestore."
                ) from exc

            kwargs: dict[str, str] = {}
            if self.project_id:
                kwargs["project"] = self.project_id
            if self.database:
                kwargs["database"] = self.database
            self._client = firestore.Client(**kwargs)
        return self._client

    def _collection(self) -> Any:
        return self.client.collection(self.collection_name)

    def load_all(self) -> list[dict]:
        records: list[dict] = []
        for document in self._collection().stream():
            payload = document.to_dict() or {}
            payload.setdefault("demand_id", document.id)
            records.append(payload)
        return normalize_and_validate_records(records)

    def replace_all(self, records: list[dict]) -> None:
        normalized = normalize_and_validate_records(records)
        collection = self._collection()

        existing_document_ids = {document.id for document in collection.stream()}
        incoming_document_ids = {record["demand_id"] for record in normalized}

        for stale_document_id in existing_document_ids - incoming_document_ids:
            collection.document(stale_document_id).delete()

        for record in normalized:
            collection.document(record["demand_id"]).set(record)


def demand_repository_for(path: str | Path, adapter: str | None = None) -> DemandRepository:
    """Return the repository adapter for the configured demand backlog path."""

    selected_adapter = adapter or demand_repository_adapter()
    validate_persistence_configuration()

    if selected_adapter == DEFAULT_REPOSITORY_ADAPTER:
        return LocalJsonDemandRepository(path)
    if selected_adapter == FIRESTORE_REPOSITORY_ADAPTER:
        return FirestoreDemandRepository(
            collection_name=firestore_collection(),
            project_id=firestore_project_id(),
            database=firestore_database(),
        )

    raise ValueError(f"Unsupported demand repository adapter: {selected_adapter}")
