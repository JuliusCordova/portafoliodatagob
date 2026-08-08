from __future__ import annotations

import os
import unittest
from contextlib import contextmanager
from copy import deepcopy
from typing import Iterator

from atlas_datagob.services.demand_repository import FirestoreDemandRepository, demand_repository_for


@contextmanager
def patched_env(**values: str | None) -> Iterator[None]:
    previous = {key: os.environ.get(key) for key in values}
    try:
        for key, value in values.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def sample_record(demand_id: str, title: str) -> dict:
    return {
        "schema_version": "demand-record-v1.0",
        "demand_id": demand_id,
        "created_at": "2026-08-08T00:00:00+00:00",
        "updated_at": "2026-08-08T00:00:00+00:00",
        "status": "intake_validated",
        "decision": "pending",
        "current_stage": "intake_validated",
        "request": {
            "title": title,
            "description": "Synthetic Firestore adapter case.",
            "requester_area": "Data Office",
            "requester_role": "Data Owner",
        },
        "classification": {},
        "architecture": {},
        "policy_gaps": [],
        "architecture_gaps": [],
        "finops_gaps": [],
        "committee": {},
        "committee_summary": "Pending committee review.",
        "agent_trace": [],
        "events": [],
    }


class FakeDocumentSnapshot:
    def __init__(self, document_id: str, payload: dict) -> None:
        self.id = document_id
        self._payload = deepcopy(payload)

    def to_dict(self) -> dict:
        return deepcopy(self._payload)


class FakeDocumentReference:
    def __init__(self, collection: "FakeCollection", document_id: str) -> None:
        self.collection = collection
        self.document_id = document_id

    def set(self, payload: dict) -> None:
        self.collection.documents[self.document_id] = deepcopy(payload)

    def delete(self) -> None:
        self.collection.documents.pop(self.document_id, None)


class FakeCollection:
    def __init__(self, initial_documents: dict[str, dict] | None = None) -> None:
        self.documents = deepcopy(initial_documents or {})

    def stream(self) -> list[FakeDocumentSnapshot]:
        return [FakeDocumentSnapshot(document_id, payload) for document_id, payload in self.documents.items()]

    def document(self, document_id: str) -> FakeDocumentReference:
        return FakeDocumentReference(self, document_id)


class FakeFirestoreClient:
    def __init__(self, collection: FakeCollection) -> None:
        self.collection_ref = collection
        self.requested_collections: list[str] = []

    def collection(self, name: str) -> FakeCollection:
        self.requested_collections.append(name)
        return self.collection_ref


class FirestoreRepositoryTest(unittest.TestCase):
    def test_load_all_reads_firestore_documents_and_normalizes_records(self) -> None:
        collection = FakeCollection({"DEM-001": sample_record("DEM-001", "Caso Firestore")})
        client = FakeFirestoreClient(collection)
        repository = FirestoreDemandRepository(collection_name="demands", client=client)

        records = repository.load_all()

        self.assertEqual(1, len(records))
        self.assertEqual("DEM-001", records[0]["demand_id"])
        self.assertEqual("demand-record-v1.0", records[0]["schema_version"])
        self.assertEqual(["demands"], client.requested_collections)

    def test_replace_all_upserts_incoming_records_and_deletes_stale_documents(self) -> None:
        stale = sample_record("DEM-STALE", "Caso obsoleto")
        collection = FakeCollection({"DEM-STALE": stale})
        client = FakeFirestoreClient(collection)
        repository = FirestoreDemandRepository(collection_name="demands", client=client)

        incoming = [sample_record("DEM-NEW", "Caso nuevo")]
        repository.replace_all(incoming)

        self.assertNotIn("DEM-STALE", collection.documents)
        self.assertIn("DEM-NEW", collection.documents)
        self.assertEqual("Caso nuevo", collection.documents["DEM-NEW"]["request"]["title"])

    def test_factory_selects_firestore_when_environment_requests_it(self) -> None:
        with patched_env(
            ATLAS_DEMAND_REPOSITORY="firestore",
            ATLAS_FIRESTORE_COLLECTION="atlas_test_demands",
            ATLAS_FIRESTORE_PROJECT="demo-project",
            ATLAS_FIRESTORE_DATABASE="demo-db",
        ):
            repository = demand_repository_for("ignored-local-path.json")

        self.assertIsInstance(repository, FirestoreDemandRepository)
        assert isinstance(repository, FirestoreDemandRepository)
        self.assertEqual("atlas_test_demands", repository.collection_name)
        self.assertEqual("demo-project", repository.project_id)
        self.assertEqual("demo-db", repository.database)


if __name__ == "__main__":
    unittest.main()
