"""Governed administration store for ATLAS policies and architecture patterns.

Cloud Storage remains the authoritative runtime source. This module adds a
committee-only mutation layer with version lifecycle, optimistic concurrency,
immutable snapshots and append-only audit evidence.
"""
from __future__ import annotations

import json
import os
import uuid
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from atlas_datagob.services.governance_catalog import governance_bucket_name, governance_prefix

VALID_KINDS = {"policies", "architecture_patterns"}
VALID_STATUSES = {"draft", "active", "retired"}
DEFAULT_LOCAL_ROOT = Path("data/governance")


class GovernanceCatalogAdminError(ValueError):
    """Raised when a governed catalog mutation is invalid."""


class GovernanceCatalogConflictError(RuntimeError):
    """Raised when optimistic concurrency detects a stale update."""


@dataclass(frozen=True)
class CatalogDocument:
    kind: str
    records: list[dict[str, Any]]
    generation: int
    source: str


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _require_kind(kind: str) -> str:
    normalized = kind.strip().lower()
    if normalized not in VALID_KINDS:
        raise GovernanceCatalogAdminError(f"Unsupported governance catalog kind: {kind}")
    return normalized


def _admin_requires_gcs() -> bool:
    return os.getenv("ATLAS_GOVERNANCE_ADMIN_REQUIRE_GCS", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _local_root() -> Path:
    configured = os.getenv("ATLAS_GOVERNANCE_ADMIN_LOCAL_ROOT", "").strip()
    return Path(configured) if configured else DEFAULT_LOCAL_ROOT


def _catalog_object_name(kind: str) -> str:
    return f"{governance_prefix()}/{kind}/catalog.json"


def _snapshot_object_name(kind: str, timestamp: str, event_id: str) -> str:
    safe_timestamp = timestamp.replace(":", "").replace("-", "")
    return f"{governance_prefix()}/audit/snapshots/{kind}/{safe_timestamp}-{event_id}.json"


def _audit_object_name(timestamp: str, event_id: str) -> str:
    safe_timestamp = timestamp.replace(":", "").replace("-", "")
    return f"{governance_prefix()}/audit/events/{safe_timestamp}-{event_id}.json"


def _validate_record(record: Any, *, kind: str) -> dict[str, Any]:
    if not isinstance(record, dict):
        raise GovernanceCatalogAdminError(f"{kind} record must be a JSON object")

    normalized = deepcopy(record)
    record_id = str(normalized.get("id", "")).strip()
    version = str(normalized.get("version", "")).strip()
    status = str(normalized.get("status", "")).strip().lower()
    name = str(normalized.get("name", "")).strip()

    if not record_id:
        raise GovernanceCatalogAdminError(f"{kind} record is missing id")
    if not version:
        raise GovernanceCatalogAdminError(f"{kind} record {record_id} is missing version")
    if status not in VALID_STATUSES:
        raise GovernanceCatalogAdminError(
            f"{kind} record {record_id}@{version} has invalid status {status!r}"
        )
    if not name:
        raise GovernanceCatalogAdminError(f"{kind} record {record_id}@{version} is missing name")

    normalized["id"] = record_id
    normalized["version"] = version
    normalized["status"] = status
    normalized["name"] = name

    if kind == "policies":
        applies_to = normalized.get("applies_to")
        if not isinstance(applies_to, dict):
            raise GovernanceCatalogAdminError(f"Policy {record_id}@{version} requires applies_to")
        project_types = applies_to.get("project_types")
        if not isinstance(project_types, list) or not all(isinstance(item, str) and item.strip() for item in project_types):
            raise GovernanceCatalogAdminError(
                f"Policy {record_id}@{version} requires applies_to.project_types"
            )
        controls = normalized.get("mandatory_controls")
        if not isinstance(controls, list) or not all(isinstance(item, str) and item.strip() for item in controls):
            raise GovernanceCatalogAdminError(
                f"Policy {record_id}@{version} requires mandatory_controls"
            )
        if not str(normalized.get("recommendation", "")).strip():
            raise GovernanceCatalogAdminError(f"Policy {record_id}@{version} requires recommendation")
    else:
        for field in ("project_types", "required_components", "gcp_services"):
            value = normalized.get(field)
            if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
                raise GovernanceCatalogAdminError(
                    f"Architecture pattern {record_id}@{version} requires {field}"
                )
        if not str(normalized.get("principle", "")).strip():
            raise GovernanceCatalogAdminError(
                f"Architecture pattern {record_id}@{version} requires principle"
            )

    return normalized


def validate_catalog(kind: str, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    kind = _require_kind(kind)
    normalized = [_validate_record(record, kind=kind) for record in records]

    seen: set[tuple[str, str]] = set()
    active_by_id: dict[str, str] = {}
    for record in normalized:
        key = (record["id"], record["version"])
        if key in seen:
            raise GovernanceCatalogAdminError(
                f"Duplicate governance version: {record['id']}@{record['version']}"
            )
        seen.add(key)
        if record["status"] == "active":
            if record["id"] in active_by_id:
                raise GovernanceCatalogAdminError(
                    f"Only one active version is allowed for {record['id']}: "
                    f"{active_by_id[record['id']]} and {record['version']}"
                )
            active_by_id[record["id"]] = record["version"]

    return normalized


def _read_local(kind: str) -> CatalogDocument:
    path = _local_root() / kind / "catalog.json"
    if not path.exists():
        return CatalogDocument(kind=kind, records=[], generation=0, source="local_json")
    records = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise GovernanceCatalogAdminError(f"Local catalog {path} must contain a JSON array")
    return CatalogDocument(
        kind=kind,
        records=validate_catalog(kind, records),
        generation=int(path.stat().st_mtime_ns),
        source="local_json",
    )


def _read_gcs(kind: str, bucket_name: str) -> CatalogDocument:
    try:
        from google.cloud import storage  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("google-cloud-storage is required for catalog administration") from exc

    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.get_blob(_catalog_object_name(kind))
    if blob is None:
        return CatalogDocument(kind=kind, records=[], generation=0, source="gcs")
    payload = json.loads(blob.download_as_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise GovernanceCatalogAdminError(
            f"gs://{bucket_name}/{blob.name} must contain a JSON array"
        )
    return CatalogDocument(
        kind=kind,
        records=validate_catalog(kind, payload),
        generation=int(blob.generation or 0),
        source="gcs",
    )


def read_catalog(kind: str) -> CatalogDocument:
    kind = _require_kind(kind)
    bucket_name = governance_bucket_name()
    if bucket_name:
        return _read_gcs(kind, bucket_name)
    if _admin_requires_gcs():
        raise RuntimeError(
            "Governance administration requires GCS but ATLAS_GOVERNANCE_BUCKET is not configured"
        )
    return _read_local(kind)


def _write_local(kind: str, records: list[dict[str, Any]], expected_generation: int) -> int:
    root = _local_root()
    path = root / kind / "catalog.json"
    current_generation = int(path.stat().st_mtime_ns) if path.exists() else 0
    if current_generation != expected_generation:
        raise GovernanceCatalogConflictError(
            f"Catalog {kind} changed concurrently: expected generation {expected_generation}, "
            f"current {current_generation}"
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return int(path.stat().st_mtime_ns)


def _write_gcs(
    kind: str,
    records: list[dict[str, Any]],
    expected_generation: int,
    *,
    previous_records: list[dict[str, Any]],
    event: dict[str, Any],
) -> int:
    try:
        from google.api_core.exceptions import PreconditionFailed  # type: ignore
        from google.cloud import storage  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("google-cloud-storage is required for catalog administration") from exc

    bucket_name = governance_bucket_name()
    if not bucket_name:
        raise RuntimeError("ATLAS_GOVERNANCE_BUCKET is required for GCS catalog writes")

    client = storage.Client()
    bucket = client.bucket(bucket_name)
    event_blob = bucket.blob(_audit_object_name(event["timestamp"], event["event_id"]))
    event_blob.upload_from_string(
        json.dumps(event, indent=2, ensure_ascii=False) + "\n",
        content_type="application/json",
        if_generation_match=0,
    )

    if expected_generation:
        snapshot_blob = bucket.blob(
            _snapshot_object_name(kind, event["timestamp"], event["event_id"])
        )
        snapshot_blob.upload_from_string(
            json.dumps(previous_records, indent=2, ensure_ascii=False) + "\n",
            content_type="application/json",
            if_generation_match=0,
        )

    blob = bucket.blob(_catalog_object_name(kind))
    try:
        blob.upload_from_string(
            json.dumps(records, indent=2, ensure_ascii=False) + "\n",
            content_type="application/json",
            if_generation_match=expected_generation,
        )
    except PreconditionFailed as exc:
        raise GovernanceCatalogConflictError(
            f"Catalog {kind} changed concurrently; reload before publishing"
        ) from exc
    blob.reload()
    return int(blob.generation or 0)


def _write_audit_local(event: dict[str, Any], previous_records: list[dict[str, Any]], kind: str) -> None:
    root = _local_root()
    audit_dir = root / "audit" / "events"
    snapshot_dir = root / "audit" / "snapshots" / kind
    audit_dir.mkdir(parents=True, exist_ok=True)
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    timestamp = event["timestamp"].replace(":", "").replace("-", "")
    (audit_dir / f"{timestamp}-{event['event_id']}.json").write_text(
        json.dumps(event, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    if previous_records:
        (snapshot_dir / f"{timestamp}-{event['event_id']}.json").write_text(
            json.dumps(previous_records, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )


def _event(
    *,
    kind: str,
    action: str,
    actor: str,
    change_note: str,
    record_id: str,
    version: str,
    generation_before: int,
) -> dict[str, Any]:
    note = change_note.strip()
    if not note:
        raise GovernanceCatalogAdminError("change_note is required for every catalog mutation")
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": _utc_now(),
        "catalog_kind": kind,
        "action": action,
        "actor": actor,
        "change_note": note,
        "record_id": record_id,
        "version": version,
        "generation_before": generation_before,
    }


def _find(records: list[dict[str, Any]], record_id: str, version: str) -> tuple[int, dict[str, Any]]:
    for index, record in enumerate(records):
        if record.get("id") == record_id and record.get("version") == version:
            return index, record
    raise KeyError(f"Governance record not found: {record_id}@{version}")


def _persist(
    document: CatalogDocument,
    proposed: list[dict[str, Any]],
    *,
    event: dict[str, Any],
) -> dict[str, Any]:
    validated = validate_catalog(document.kind, proposed)
    bucket_name = governance_bucket_name()
    if bucket_name:
        generation = _write_gcs(
            document.kind,
            validated,
            document.generation,
            previous_records=document.records,
            event=event,
        )
    else:
        if _admin_requires_gcs():
            raise RuntimeError("Governance administration requires GCS")
        _write_audit_local(event, document.records, document.kind)
        generation = _write_local(document.kind, validated, document.generation)
    return {
        "catalog_kind": document.kind,
        "generation": generation,
        "source": "gcs" if bucket_name else "local_json",
        "event": event,
        "records": validated,
    }


def list_catalog_versions(kind: str) -> dict[str, Any]:
    document = read_catalog(kind)
    records = sorted(
        document.records,
        key=lambda item: (str(item.get("id", "")), str(item.get("version", ""))),
    )
    return {
        "catalog_kind": document.kind,
        "generation": document.generation,
        "source": document.source,
        "count": len(records),
        "records": records,
    }


def get_catalog_record(kind: str, record_id: str) -> dict[str, Any]:
    document = read_catalog(kind)
    versions = [record for record in document.records if record.get("id") == record_id]
    if not versions:
        raise KeyError(f"Governance record not found: {record_id}")
    return {
        "catalog_kind": document.kind,
        "generation": document.generation,
        "record_id": record_id,
        "versions": sorted(versions, key=lambda item: str(item.get("version", ""))),
    }


def create_draft(kind: str, record: dict[str, Any], *, actor: str, change_note: str) -> dict[str, Any]:
    document = read_catalog(kind)
    draft = deepcopy(record)
    draft["status"] = "draft"
    now = _utc_now()
    draft.setdefault("created_at", now)
    draft.setdefault("created_by", actor)
    draft["updated_at"] = now
    draft["updated_by"] = actor
    draft = _validate_record(draft, kind=document.kind)
    if any(item.get("id") == draft["id"] and item.get("version") == draft["version"] for item in document.records):
        raise GovernanceCatalogAdminError(
            f"Governance version already exists: {draft['id']}@{draft['version']}"
        )
    proposed = [*document.records, draft]
    event = _event(
        kind=document.kind,
        action="draft_created",
        actor=actor,
        change_note=change_note,
        record_id=draft["id"],
        version=draft["version"],
        generation_before=document.generation,
    )
    result = _persist(document, proposed, event=event)
    result["record"] = draft
    return result


def update_draft(
    kind: str,
    record_id: str,
    version: str,
    patch: dict[str, Any],
    *,
    actor: str,
    change_note: str,
) -> dict[str, Any]:
    document = read_catalog(kind)
    proposed = deepcopy(document.records)
    index, current = _find(proposed, record_id, version)
    if current.get("status") != "draft":
        raise GovernanceCatalogAdminError("Only draft governance versions may be edited in place")
    protected = {"id", "version", "status", "created_at", "created_by"}
    updated = {**current, **{key: value for key, value in patch.items() if key not in protected}}
    updated["updated_at"] = _utc_now()
    updated["updated_by"] = actor
    proposed[index] = _validate_record(updated, kind=document.kind)
    event = _event(
        kind=document.kind,
        action="draft_updated",
        actor=actor,
        change_note=change_note,
        record_id=record_id,
        version=version,
        generation_before=document.generation,
    )
    result = _persist(document, proposed, event=event)
    result["record"] = proposed[index]
    return result


def delete_draft(kind: str, record_id: str, version: str, *, actor: str, change_note: str) -> dict[str, Any]:
    document = read_catalog(kind)
    index, current = _find(document.records, record_id, version)
    if current.get("status") != "draft":
        raise GovernanceCatalogAdminError("Only draft governance versions may be physically deleted")
    proposed = [record for position, record in enumerate(document.records) if position != index]
    event = _event(
        kind=document.kind,
        action="draft_deleted",
        actor=actor,
        change_note=change_note,
        record_id=record_id,
        version=version,
        generation_before=document.generation,
    )
    return _persist(document, proposed, event=event)


def clone_version(
    kind: str,
    record_id: str,
    version: str,
    new_version: str,
    *,
    actor: str,
    change_note: str,
) -> dict[str, Any]:
    document = read_catalog(kind)
    _, current = _find(document.records, record_id, version)
    if any(item.get("id") == record_id and item.get("version") == new_version for item in document.records):
        raise GovernanceCatalogAdminError(f"Governance version already exists: {record_id}@{new_version}")
    now = _utc_now()
    clone = deepcopy(current)
    clone["version"] = new_version.strip()
    clone["status"] = "draft"
    clone["created_at"] = now
    clone["created_by"] = actor
    clone["updated_at"] = now
    clone["updated_by"] = actor
    clone = _validate_record(clone, kind=document.kind)
    proposed = [*document.records, clone]
    event = _event(
        kind=document.kind,
        action="version_cloned",
        actor=actor,
        change_note=change_note,
        record_id=record_id,
        version=clone["version"],
        generation_before=document.generation,
    )
    result = _persist(document, proposed, event=event)
    result["record"] = clone
    return result


def activate_version(kind: str, record_id: str, version: str, *, actor: str, change_note: str) -> dict[str, Any]:
    document = read_catalog(kind)
    proposed = deepcopy(document.records)
    index, current = _find(proposed, record_id, version)
    if current.get("status") != "draft":
        raise GovernanceCatalogAdminError("Only draft governance versions may be activated")
    now = _utc_now()
    for position, record in enumerate(proposed):
        if record.get("id") == record_id and record.get("status") == "active":
            retired = deepcopy(record)
            retired["status"] = "retired"
            retired["updated_at"] = now
            retired["updated_by"] = actor
            proposed[position] = retired
    activated = deepcopy(proposed[index])
    activated["status"] = "active"
    activated["updated_at"] = now
    activated["updated_by"] = actor
    proposed[index] = activated
    event = _event(
        kind=document.kind,
        action="version_activated",
        actor=actor,
        change_note=change_note,
        record_id=record_id,
        version=version,
        generation_before=document.generation,
    )
    result = _persist(document, proposed, event=event)
    result["record"] = activated
    return result


def retire_version(kind: str, record_id: str, version: str, *, actor: str, change_note: str) -> dict[str, Any]:
    document = read_catalog(kind)
    proposed = deepcopy(document.records)
    index, current = _find(proposed, record_id, version)
    if current.get("status") != "active":
        raise GovernanceCatalogAdminError("Only an active governance version may be retired")
    retired = deepcopy(current)
    retired["status"] = "retired"
    retired["updated_at"] = _utc_now()
    retired["updated_by"] = actor
    proposed[index] = retired
    event = _event(
        kind=document.kind,
        action="version_retired",
        actor=actor,
        change_note=change_note,
        record_id=record_id,
        version=version,
        generation_before=document.generation,
    )
    result = _persist(document, proposed, event=event)
    result["record"] = retired
    return result


def list_audit_events(limit: int = 100) -> dict[str, Any]:
    bounded_limit = max(1, min(limit, 500))
    bucket_name = governance_bucket_name()
    events: list[dict[str, Any]] = []
    if bucket_name:
        try:
            from google.cloud import storage  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("google-cloud-storage is required for audit history") from exc
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        prefix = f"{governance_prefix()}/audit/events/"
        blobs = sorted(client.list_blobs(bucket, prefix=prefix), key=lambda blob: blob.name, reverse=True)
        for blob in blobs[:bounded_limit]:
            if blob.name.endswith(".json"):
                events.append(json.loads(blob.download_as_text(encoding="utf-8")))
        source = "gcs"
    else:
        if _admin_requires_gcs():
            raise RuntimeError("Governance administration requires GCS")
        audit_dir = _local_root() / "audit" / "events"
        if audit_dir.exists():
            for path in sorted(audit_dir.glob("*.json"), reverse=True)[:bounded_limit]:
                events.append(json.loads(path.read_text(encoding="utf-8")))
        source = "local_json"
    return {"source": source, "count": len(events), "events": events}
