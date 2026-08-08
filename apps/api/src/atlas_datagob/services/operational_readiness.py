"""Operational readiness snapshot for ATLAS DataGob pilots.

The snapshot is intentionally read-only. It gives operators and demo owners a
single place to inspect whether the pilot has the minimum conditions expected
for Day 1 execution without mutating the backlog or requiring cloud APIs.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any

from atlas_datagob.services.authz import auth_snapshot
from atlas_datagob.services.demand_backlog import list_demand_records
from atlas_datagob.services.persistence_config import persistence_configuration_snapshot


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _priority(record: dict[str, Any]) -> str:
    explicit = (record.get("scoring") or {}).get("priority")
    if explicit in {"Alta", "Media", "Baja"}:
        return explicit
    score = (record.get("scoring") or {}).get("score")
    if not isinstance(score, (int, float)):
        return "Sin score"
    if score >= 4:
        return "Alta"
    if score >= 3:
        return "Media"
    return "Baja"


def _gap_total(record: dict[str, Any]) -> int:
    return (
        len(record.get("policy_gaps") or [])
        + len(record.get("architecture_gaps") or [])
        + len(record.get("finops_gaps") or [])
    )


def _status_for_checks(checks: list[dict[str, str]]) -> str:
    if any(check["status"] == "critical" for check in checks):
        return "critical"
    if any(check["status"] == "warning" for check in checks):
        return "warning"
    return "ok"


def _recommendations(checks: list[dict[str, str]]) -> list[str]:
    recommendations: list[str] = []
    for check in checks:
        if check["status"] != "ok":
            recommendations.append(check["recommendation"])
    return recommendations


def operational_readiness_snapshot(records: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Return a safe, serializable operational snapshot for pilot execution."""

    generated_at = _utc_now()
    errors: list[str] = []

    try:
        auth = auth_snapshot()
    except Exception as exc:  # pragma: no cover - defensive operations snapshot
        auth = {"mode": "unknown"}
        errors.append(f"auth configuration error: {exc}")

    try:
        persistence = persistence_configuration_snapshot()
    except Exception as exc:  # pragma: no cover - defensive operations snapshot
        persistence = {"repository_adapter": "unknown"}
        errors.append(f"persistence configuration error: {exc}")

    if records is None:
        try:
            records = list_demand_records()
        except Exception as exc:  # pragma: no cover - defensive operations snapshot
            records = []
            errors.append(f"backlog read error: {exc}")

    status_counts = Counter(str(record.get("status", "unknown")) for record in records)
    priority_counts = Counter(_priority(record) for record in records)
    total_gaps = sum(_gap_total(record) for record in records)
    total_events = sum(len(record.get("events") or []) for record in records)
    scored = status_counts.get("scored", 0)
    active_review = sum(count for status, count in status_counts.items() if "review" in status)
    terminal = status_counts.get("rejected", 0) + status_counts.get("archived", 0)

    checks = [
        {
            "name": "api_runtime",
            "status": "critical" if errors else "ok",
            "detail": "API can produce operational snapshot" if not errors else "; ".join(errors),
            "recommendation": "Review startup configuration and service logs before pilot execution.",
        },
        {
            "name": "auth_mode",
            "status": "warning" if auth.get("mode") == "disabled" else "ok",
            "detail": f"ATLAS_AUTH_MODE={auth.get('mode')}",
            "recommendation": "Use ATLAS_AUTH_MODE=header or an upstream identity provider for a closed pilot.",
        },
        {
            "name": "persistence",
            "status": "warning" if persistence.get("repository_adapter") == "local_json" else "ok",
            "detail": f"repository_adapter={persistence.get('repository_adapter')}",
            "recommendation": "Use Firestore or another managed repository for shared pilot execution.",
        },
        {
            "name": "backlog_population",
            "status": "ok" if len(records) >= 10 else "warning",
            "detail": f"{len(records)} demands available",
            "recommendation": "Seed or create at least 10 representative demo/pilot demands before executive review.",
        },
        {
            "name": "governance_gaps",
            "status": "ok" if total_gaps == 0 else "warning",
            "detail": f"{total_gaps} open policy/architecture/FinOps gaps across portfolio",
            "recommendation": "Use the committee view to close or explicitly accept gaps before production promotion.",
        },
        {
            "name": "audit_trail",
            "status": "ok" if not records or total_events >= len(records) else "warning",
            "detail": f"{total_events} events across {len(records)} demands",
            "recommendation": "Ensure every demand has at least one event before using it as pilot evidence.",
        },
    ]

    status = _status_for_checks(checks)
    return {
        "product": "ATLAS DataGob",
        "snapshot_type": "pilot_operational_readiness",
        "generated_at": generated_at,
        "status": status,
        "checks": checks,
        "portfolio": {
            "total_demands": len(records),
            "status_counts": dict(sorted(status_counts.items())),
            "priority_counts": dict(sorted(priority_counts.items())),
            "scored_demands": scored,
            "active_review_demands": active_review,
            "terminal_demands": terminal,
            "total_governance_gaps": total_gaps,
            "total_audit_events": total_events,
        },
        "runtime": {
            "auth": auth,
            "persistence": persistence,
        },
        "recommendations": _recommendations(checks),
    }
