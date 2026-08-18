"""Versioned governance catalog backed by Cloud Storage JSON with local fallback."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

LOCAL_GOVERNANCE_ROOT = Path("data/governance")
DEFAULT_GOVERNANCE_PREFIX = "atlas-governance"


def governance_bucket_name() -> str | None:
    value = os.getenv("ATLAS_GOVERNANCE_BUCKET", "").strip()
    return value or None


def governance_prefix() -> str:
    return os.getenv("ATLAS_GOVERNANCE_PREFIX", DEFAULT_GOVERNANCE_PREFIX).strip("/")


def _validate_record(record: Any, source: str) -> dict:
    if not isinstance(record, dict):
        raise ValueError(f"Governance record in {source} must be a JSON object")
    if not record.get("id"):
        raise ValueError(f"Governance record in {source} is missing id")
    if not record.get("version"):
        raise ValueError(f"Governance record in {source} is missing version")
    return record


def _load_local_json(kind: str) -> list[dict]:
    root = LOCAL_GOVERNANCE_ROOT / kind
    if not root.exists():
        return []

    records: list[dict] = []
    for path in sorted(root.rglob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            records.extend(_validate_record(item, str(path)) for item in payload)
        else:
            records.append(_validate_record(payload, str(path)))
    return records


def _load_gcs_json(kind: str, bucket_name: str) -> list[dict]:
    try:
        from google.cloud import storage  # type: ignore
    except ImportError as exc:  # pragma: no cover - optional in lightweight CI
        raise RuntimeError(
            "ATLAS_GOVERNANCE_BUCKET is configured but google-cloud-storage is not installed"
        ) from exc

    prefix = f"{governance_prefix()}/{kind}/"
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    records: list[dict] = []

    for blob in client.list_blobs(bucket, prefix=prefix):
        if not blob.name.endswith(".json"):
            continue
        payload = json.loads(blob.download_as_text(encoding="utf-8"))
        if isinstance(payload, list):
            records.extend(_validate_record(item, f"gs://{bucket_name}/{blob.name}") for item in payload)
        else:
            records.append(_validate_record(payload, f"gs://{bucket_name}/{blob.name}"))

    return records


def load_governance_records(kind: str) -> list[dict]:
    """Load active governance records from GCS in production or local JSON in dev/test."""

    bucket_name = governance_bucket_name()
    records = _load_gcs_json(kind, bucket_name) if bucket_name else _load_local_json(kind)
    return [record for record in records if record.get("status", "active") == "active"]


def load_policy_catalog() -> list[dict]:
    return load_governance_records("policies")


def load_architecture_catalog() -> list[dict]:
    return load_governance_records("architecture_patterns")


def catalog_snapshot() -> dict:
    """Return safe metadata for readiness/diagnostics without exposing credentials."""

    bucket_name = governance_bucket_name()
    return {
        "source": "gcs" if bucket_name else "local_json",
        "bucket": bucket_name,
        "prefix": governance_prefix(),
        "policy_count": len(load_policy_catalog()),
        "architecture_pattern_count": len(load_architecture_catalog()),
    }
