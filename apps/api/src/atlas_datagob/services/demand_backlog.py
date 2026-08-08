"""Local demand backlog persistence for ATLAS DataGob.

This module keeps the public backlog operations used by the API, CRUD grid,
scoring workflow and demo reset. Persistence is delegated to a repository
adapter so the MVP can keep local JSON today and move later to a managed store
without rewriting the business flow.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from atlas_datagob.services.demand_lifecycle import (
    DEMAND_RECORD_SCHEMA_VERSION,
    assert_transition_allowed,
)
from atlas_datagob.services.demand_repository import demand_repository_for

DEFAULT_BACKLOG_PATH = Path("data/runtime/demand_backlog.json")
DEMO_SEED_PATH = Path("data/demo/demand_backlog_seed.json")

_EDITABLE_REQUEST_FIELDS = {
    "title",
    "description",
    "requester_area",
    "requester_role",
    "domain_hint",
    "target_consumption",
}


def utc_now() -> str:
    """Return an ISO timestamp suitable for audit events."""

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _event(
    *,
    event_type: str,
    actor: str,
    from_status: str | None,
    to_status: str,
    decision: str | None,
    comment: str,
    timestamp: str,
) -> dict:
    return {
        "event_id": f"EVT-{uuid4().hex[:8].upper()}",
        "timestamp": timestamp,
        "type": event_type,
        "actor": actor,
        "from_status": from_status,
        "to_status": to_status,
        "decision": decision,
        "comment": comment,
    }


def _clean_mapping(payload: dict | None) -> dict:
    if not payload:
        return {}
    return {key: value for key, value in payload.items() if value is not None}


def _clone_records(records: list[dict]) -> list[dict]:
    """Deep-copy JSON-compatible records without retaining references."""

    return json.loads(json.dumps(records))


def load_demand_records(path: str | Path = DEFAULT_BACKLOG_PATH) -> list[dict]:
    """Load all demand records through the configured repository adapter."""

    return demand_repository_for(path).load_all()


def write_demand_records(records: list[dict], path: str | Path = DEFAULT_BACKLOG_PATH) -> None:
    """Persist all demand records through the configured repository adapter."""

    demand_repository_for(path).replace_all(records)


def load_demo_seed_records(seed_path: str | Path = DEMO_SEED_PATH) -> list[dict]:
    """Load curated records used to reset and rehearse product demos."""

    records = load_demand_records(seed_path)
    if not records:
        raise ValueError(f"Demo seed file has no records: {seed_path}")
    return records


def reset_demo_backlog(
    *,
    seed_path: str | Path = DEMO_SEED_PATH,
    path: str | Path = DEFAULT_BACKLOG_PATH,
    actor: str = "ATLAS DataGob",
) -> list[dict]:
    """Replace the runtime backlog with curated demo records and audit the reset."""

    records = _clone_records(load_demo_seed_records(seed_path))
    now = utc_now()
    for record in records:
        status = record.get("status", "intake_validated")
        assert_transition_allowed(status, status)
        record["schema_version"] = DEMAND_RECORD_SCHEMA_VERSION
        record["updated_at"] = now
        record.setdefault("events", []).append(
            _event(
                event_type="demo_reset",
                actor=actor,
                from_status=status,
                to_status=status,
                decision=record.get("decision"),
                comment="Registro cargado desde dataset semilla de demo.",
                timestamp=now,
            )
        )
    write_demand_records(records, path)
    return records


def infer_initial_status(validation_result: dict) -> str:
    """Map an agent recommendation to an initial backlog status."""

    next_action = validation_result.get("recommended_next_action") or validation_result.get("operative_committee", {}).get(
        "suggested_decision"
    )
    if next_action in {"approve_for_scoring", "approved_for_scoring"}:
        return "approved_for_scoring"
    if next_action in {"reject", "rejected"}:
        return "rejected"
    if next_action in {"reformulation_required", "request_more_info"}:
        return "reformulation_required"
    if next_action in {"architect_review", "architecture_exception_or_reformulation"}:
        return "operative_committee_review"
    return "intake_validated"


def demand_id_for(now: str) -> str:
    """Create a compact business-friendly demand id."""

    date_token = now[:10].replace("-", "")
    return f"DEM-{date_token}-{uuid4().hex[:8].upper()}"


def create_demand_record(
    validation_result: dict,
    *,
    path: str | Path = DEFAULT_BACKLOG_PATH,
    actor: str = "ATLAS DataGob",
) -> dict:
    """Create and persist a demand record from a policy/architecture validation result."""

    now = utc_now()
    request = validation_result.get("structured_request", {})
    committee = validation_result.get("operative_committee", {})
    status = infer_initial_status(validation_result)
    decision = committee.get("suggested_decision") or validation_result.get("recommended_next_action") or "pending"
    current_stage = committee.get("committee_stage") or committee.get("route") or "intake_validated"

    record = {
        "schema_version": DEMAND_RECORD_SCHEMA_VERSION,
        "demand_id": demand_id_for(now),
        "created_at": now,
        "updated_at": now,
        "status": status,
        "decision": decision,
        "current_stage": current_stage,
        "request": request,
        "classification": validation_result.get("classification", {}),
        "architecture": validation_result.get("architecture", {}),
        "policy_gaps": validation_result.get("policy_gaps", []),
        "architecture_gaps": validation_result.get("architecture_gaps", []),
        "finops_gaps": validation_result.get("finops_gaps", []),
        "committee": committee,
        "committee_summary": validation_result.get("committee_summary", ""),
        "agent_trace": validation_result.get("agent_trace", []),
        "business_inputs": {},
        "committee_inputs": {},
        "events": [
            _event(
                event_type="demand_created",
                actor=actor,
                from_status=None,
                to_status=status,
                decision=decision,
                comment="Solicitud validada y registrada en el backlog de demanda.",
                timestamp=now,
            )
        ],
    }

    records = load_demand_records(path)
    records.append(record)
    write_demand_records(records, path)
    return record


def list_demand_records(status: str | None = None, path: str | Path = DEFAULT_BACKLOG_PATH) -> list[dict]:
    """List demand records, newest first, optionally filtered by status."""

    records = load_demand_records(path)
    if status:
        records = [record for record in records if record.get("status") == status]
    return sorted(records, key=lambda item: item.get("created_at", ""), reverse=True)


def get_demand_record(demand_id: str, path: str | Path = DEFAULT_BACKLOG_PATH) -> dict | None:
    """Return one demand record by id."""

    for record in load_demand_records(path):
        if record.get("demand_id") == demand_id:
            return record
    return None


def update_demand_record(
    demand_id: str,
    *,
    request_update: dict | None = None,
    business_inputs: dict | None = None,
    committee_inputs: dict | None = None,
    validation_state: dict | str | None = None,
    decision: str | None = None,
    actor: str = "Data Steward",
    comment: str | None = None,
    path: str | Path = DEFAULT_BACKLOG_PATH,
) -> dict | None:
    """Update editable demand fields and append an audit event."""

    records = load_demand_records(path)
    now = utc_now()
    for record in records:
        if record.get("demand_id") != demand_id:
            continue

        previous_status = record.get("status")
        request_payload = _clean_mapping(request_update)
        if request_payload:
            editable_request = {key: value for key, value in request_payload.items() if key in _EDITABLE_REQUEST_FIELDS}
            record.setdefault("request", {}).update(editable_request)

        business_payload = _clean_mapping(business_inputs)
        if business_payload:
            record.setdefault("business_inputs", {}).update(business_payload)

        committee_payload = _clean_mapping(committee_inputs)
        if committee_payload:
            record.setdefault("committee_inputs", {}).update(committee_payload)

        if validation_state:
            record["validation_state"] = validation_state
        if decision:
            record["decision"] = decision

        record["schema_version"] = DEMAND_RECORD_SCHEMA_VERSION
        record["updated_at"] = now
        record.setdefault("events", []).append(
            _event(
                event_type="demand_updated",
                actor=actor,
                from_status=previous_status,
                to_status=record.get("status", "intake_validated"),
                decision=record.get("decision"),
                comment=comment or "Campos editables de la demanda actualizados.",
                timestamp=now,
            )
        )
        write_demand_records(records, path)
        return record
    return None


def update_demand_record_status(
    demand_id: str,
    *,
    status: str,
    decision: str | None = None,
    comment: str | None = None,
    actor: str = "Data Architect",
    path: str | Path = DEFAULT_BACKLOG_PATH,
) -> dict | None:
    """Update the status/decision of one demand record and append an audit event."""

    records = load_demand_records(path)
    now = utc_now()
    for record in records:
        if record.get("demand_id") != demand_id:
            continue
        previous_status = record.get("status")
        assert_transition_allowed(previous_status, status)
        record["schema_version"] = DEMAND_RECORD_SCHEMA_VERSION
        record["status"] = status
        record["decision"] = decision or record.get("decision") or status
        record["updated_at"] = now
        record.setdefault("events", []).append(
            _event(
                event_type="status_changed",
                actor=actor,
                from_status=previous_status,
                to_status=status,
                decision=record["decision"],
                comment=comment or "Actualización de estado registrada.",
                timestamp=now,
            )
        )
        write_demand_records(records, path)
        return record
    return None


def update_demand_record_scoring(
    demand_id: str,
    *,
    scoring_result: dict,
    actor: str = "Portfolio Owner",
    comment: str | None = None,
    path: str | Path = DEFAULT_BACKLOG_PATH,
) -> dict | None:
    """Attach scoring and financial metrics to one demand record with audit trail."""

    records = load_demand_records(path)
    now = utc_now()
    for record in records:
        if record.get("demand_id") != demand_id:
            continue
        previous_status = record.get("status")
        assert_transition_allowed(previous_status, "scored")
        record["schema_version"] = DEMAND_RECORD_SCHEMA_VERSION
        record["scoring"] = {
            "score": scoring_result["score"],
            "priority": scoring_result["priority"],
            "rationale": scoring_result["rationale"],
            "components": scoring_result["components"],
            "financial_signal": scoring_result["financial_signal"],
            "model_version": scoring_result["model_version"],
            "governance_note": scoring_result["governance_note"],
        }
        record["financials"] = scoring_result["financials"]
        if "business_inputs" in scoring_result:
            record["business_inputs"] = scoring_result["business_inputs"]
        if "committee_inputs" in scoring_result:
            record["committee_inputs"] = scoring_result["committee_inputs"]
        record["status"] = "scored"
        record["decision"] = f"priority_{str(scoring_result['priority']).lower()}"
        record["current_stage"] = "portfolio_scoring"
        record["updated_at"] = now
        record.setdefault("events", []).append(
            _event(
                event_type="scoring_updated",
                actor=actor,
                from_status=previous_status,
                to_status="scored",
                decision=record["decision"],
                comment=comment or "Scoring operativo y métricas financieras registrados.",
                timestamp=now,
            )
        )
        write_demand_records(records, path)
        return record
    return None
