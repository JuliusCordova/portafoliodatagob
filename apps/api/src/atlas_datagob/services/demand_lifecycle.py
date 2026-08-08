"""Demand lifecycle and schema contracts for ATLAS DataGob.

This module centralizes the lifecycle rules of the demand backlog so the MVP does
not rely on ad-hoc status strings scattered across API handlers, UI actions or
local persistence helpers. It is intentionally framework-free so it can be reused
when the runtime store moves from JSON files to a managed database.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Iterable

DEMAND_RECORD_SCHEMA_VERSION = "demand-record-v1.0"

VALID_DEMAND_STATUSES = {
    "draft",
    "intake_validated",
    "operative_committee_review",
    "reformulation_required",
    "approved_for_scoring",
    "scored",
    "rejected",
    "closed",
    "archived",
    "mvp_candidate",
    "production_candidate",
}

TERMINAL_DEMAND_STATUSES = {"rejected", "closed", "archived"}

ALLOWED_DEMAND_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"intake_validated", "operative_committee_review", "reformulation_required", "rejected", "closed"},
    "intake_validated": {"operative_committee_review", "reformulation_required", "approved_for_scoring", "rejected", "closed"},
    "operative_committee_review": {"approved_for_scoring", "scored", "reformulation_required", "rejected", "closed"},
    "reformulation_required": {"intake_validated", "operative_committee_review", "approved_for_scoring", "rejected", "closed"},
    "approved_for_scoring": {"scored", "operative_committee_review", "rejected", "closed"},
    "scored": {"mvp_candidate", "production_candidate", "operative_committee_review", "closed", "archived"},
    "mvp_candidate": {"production_candidate", "scored", "closed", "archived"},
    "production_candidate": {"scored", "closed", "archived"},
    "rejected": {"archived"},
    "closed": {"archived"},
    "archived": set(),
}

REQUIRED_DEMAND_RECORD_FIELDS = {
    "demand_id",
    "created_at",
    "updated_at",
    "status",
    "decision",
    "current_stage",
    "request",
    "classification",
    "architecture",
    "policy_gaps",
    "architecture_gaps",
    "finops_gaps",
    "committee",
    "committee_summary",
    "agent_trace",
    "events",
}

REQUIRED_REQUEST_FIELDS = {"title", "description", "requester_area", "requester_role"}


def validate_demand_status(status: str) -> None:
    """Raise ValueError if a demand status is outside the official lifecycle."""

    if status not in VALID_DEMAND_STATUSES:
        allowed = ", ".join(sorted(VALID_DEMAND_STATUSES))
        raise ValueError(f"Invalid demand status: {status}. Allowed statuses: {allowed}")


def assert_transition_allowed(from_status: str | None, to_status: str) -> None:
    """Validate status transitions, allowing initial state creation and no-op updates."""

    validate_demand_status(to_status)
    if from_status is None or from_status == to_status:
        return
    validate_demand_status(from_status)
    allowed_targets = ALLOWED_DEMAND_TRANSITIONS.get(from_status, set())
    if to_status not in allowed_targets:
        allowed = ", ".join(sorted(allowed_targets)) or "none"
        raise ValueError(f"Invalid demand status transition: {from_status} -> {to_status}. Allowed targets: {allowed}")


def normalize_demand_record(record: dict) -> dict:
    """Return a copy with the current schema version and safe default collections."""

    normalized = deepcopy(record)
    normalized.setdefault("schema_version", DEMAND_RECORD_SCHEMA_VERSION)
    normalized.setdefault("business_inputs", {})
    normalized.setdefault("committee_inputs", {})
    normalized.setdefault("events", [])
    normalized.setdefault("policy_gaps", [])
    normalized.setdefault("architecture_gaps", [])
    normalized.setdefault("finops_gaps", [])
    normalized.setdefault("agent_trace", [])
    return normalized


def validate_demand_record(record: dict) -> None:
    """Validate minimum shape required by backlog, CRUD, scoring and demo flows."""

    missing = sorted(REQUIRED_DEMAND_RECORD_FIELDS - set(record))
    if missing:
        raise ValueError(f"Demand record is missing required fields: {missing}")

    status = record.get("status")
    if not isinstance(status, str):
        raise ValueError("Demand record status must be a string")
    validate_demand_status(status)

    request = record.get("request")
    if not isinstance(request, dict):
        raise ValueError("Demand record request must be a mapping")
    missing_request = sorted(REQUIRED_REQUEST_FIELDS - set(request))
    if missing_request:
        raise ValueError(f"Demand request is missing required fields: {missing_request}")

    events = record.get("events")
    if not isinstance(events, list):
        raise ValueError("Demand record events must be a list")


def normalize_and_validate_records(records: Iterable[dict]) -> list[dict]:
    """Normalize and validate multiple demand records before persistence."""

    normalized_records = [normalize_demand_record(record) for record in records]
    for record in normalized_records:
        validate_demand_record(record)
    return normalized_records
