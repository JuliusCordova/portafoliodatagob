"""Read model for the reusable SPEC-059 Agent Governance / AgentOps dashboard.

V1 intentionally reads only persisted observability evidence. Until ``agent_runs``
is instrumented with explicit start/finish lifecycle events, a dashboard "run" means
a distinct ``run_id`` observed in ``agent_llm_usage``. The response exposes that
semantics explicitly so the UI never presents inferred data as a richer source.
"""
from __future__ import annotations

import os
from datetime import date, datetime
from decimal import Decimal
from typing import Any

DEFAULT_AGENT_SYSTEM_ID = "ATLAS-DATAGOB"
DEFAULT_DAYS = 14
MIN_DAYS = 1
MAX_DAYS = 90


def _project_id() -> str | None:
    return os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("PROJECT_ID")


def _table_id() -> str:
    explicit = os.getenv("ATLAS_AGENTOPS_LLM_USAGE_TABLE")
    if explicit:
        return explicit
    project = _project_id()
    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT/PROJECT_ID is required for AgentOps reads")
    dataset = os.getenv("ATLAS_AGENTOPS_DATASET", "agentops")
    return f"{project}.{dataset}.agent_llm_usage"


def validate_days(days: int) -> int:
    try:
        resolved = int(days)
    except (TypeError, ValueError) as exc:
        raise ValueError("days must be an integer") from exc
    if not MIN_DAYS <= resolved <= MAX_DAYS:
        raise ValueError(f"days must be between {MIN_DAYS} and {MAX_DAYS}")
    return resolved


def _plain(value: Any) -> Any:
    """Convert BigQuery scalar values into JSON-safe primitives."""

    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): _plain(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_plain(item) for item in value]
    return value


def _row_dict(row: Any) -> dict[str, Any]:
    if isinstance(row, dict):
        payload = row
    elif hasattr(row, "items"):
        payload = dict(row.items())
    else:
        payload = dict(row)
    return {str(key): _plain(value) for key, value in payload.items()}


def _query(sql: str, *, days: int, agent_system_id: str) -> list[dict[str, Any]]:
    from google.cloud import bigquery

    client = bigquery.Client(project=_project_id())
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("days", "INT64", days),
            bigquery.ScalarQueryParameter("agent_system_id", "STRING", agent_system_id),
        ]
    )
    return [_row_dict(row) for row in client.query(sql, job_config=job_config).result()]


def get_agentops_overview(
    *,
    days: int = DEFAULT_DAYS,
    agent_system_id: str = DEFAULT_AGENT_SYSTEM_ID,
) -> dict[str, Any]:
    """Return executive summary, observed agents and recent LLM-observed runs."""

    resolved_days = validate_days(days)
    table_id = _table_id()
    base_filter = f"""
      FROM `{table_id}`
      WHERE agent_system_id = @agent_system_id
        AND observed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
    """

    summary_sql = f"""
      SELECT
        COUNT(DISTINCT run_id) AS observed_runs,
        COUNT(*) AS llm_calls,
        COUNT(DISTINCT agent_id) AS observed_agents,
        COALESCE(SUM(input_tokens), 0) AS input_tokens,
        COALESCE(SUM(output_tokens), 0) AS output_tokens,
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        ROUND(100 * SAFE_DIVIDE(COUNTIF(status = 'SUCCESS'), COUNT(*)), 2) AS success_rate,
        ROUND(AVG(latency_ms), 1) AS avg_latency_ms,
        APPROX_QUANTILES(latency_ms, 100)[SAFE_OFFSET(90)] AS p90_latency_ms,
        MIN(observed_at) AS first_observed_at,
        MAX(observed_at) AS last_observed_at
      {base_filter}
    """

    agents_sql = f"""
      SELECT
        agent_id,
        ARRAY_AGG(model_name ORDER BY observed_at DESC LIMIT 1)[OFFSET(0)] AS model_name,
        COUNT(*) AS llm_calls,
        COUNT(DISTINCT run_id) AS observed_runs,
        COALESCE(SUM(input_tokens), 0) AS input_tokens,
        COALESCE(SUM(output_tokens), 0) AS output_tokens,
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        ROUND(100 * SAFE_DIVIDE(COUNTIF(status = 'SUCCESS'), COUNT(*)), 2) AS success_rate,
        ROUND(AVG(latency_ms), 1) AS avg_latency_ms,
        APPROX_QUANTILES(latency_ms, 100)[SAFE_OFFSET(90)] AS p90_latency_ms,
        MAX(observed_at) AS last_observed_at
      {base_filter}
      GROUP BY agent_id
      ORDER BY total_tokens DESC, llm_calls DESC, agent_id
    """

    runs_sql = f"""
      SELECT
        run_id,
        ARRAY_AGG(trace_id ORDER BY observed_at DESC LIMIT 1)[OFFSET(0)] AS trace_id,
        ARRAY_AGG(requested_by ORDER BY observed_at DESC LIMIT 1)[OFFSET(0)] AS requested_by,
        MIN(observed_at) AS started_at,
        MAX(observed_at) AS finished_at,
        COUNT(*) AS llm_calls,
        COUNT(DISTINCT agent_id) AS observed_agents,
        ARRAY_TO_STRING(ARRAY_AGG(DISTINCT agent_id ORDER BY agent_id), ',') AS agent_ids,
        COALESCE(SUM(input_tokens), 0) AS input_tokens,
        COALESCE(SUM(output_tokens), 0) AS output_tokens,
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        ROUND(AVG(latency_ms), 1) AS avg_latency_ms,
        APPROX_QUANTILES(latency_ms, 100)[SAFE_OFFSET(90)] AS p90_latency_ms,
        ROUND(100 * SAFE_DIVIDE(COUNTIF(status = 'SUCCESS'), COUNT(*)), 2) AS success_rate,
        IF(COUNTIF(status != 'SUCCESS') = 0, 'SUCCESS', 'FAILED') AS status
      {base_filter}
      GROUP BY run_id
      ORDER BY finished_at DESC
      LIMIT 25
    """

    summary_rows = _query(summary_sql, days=resolved_days, agent_system_id=agent_system_id)
    agents = _query(agents_sql, days=resolved_days, agent_system_id=agent_system_id)
    runs = _query(runs_sql, days=resolved_days, agent_system_id=agent_system_id)
    summary = summary_rows[0] if summary_rows else {
        "observed_runs": 0,
        "llm_calls": 0,
        "observed_agents": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "success_rate": None,
        "avg_latency_ms": None,
        "p90_latency_ms": None,
        "first_observed_at": None,
        "last_observed_at": None,
    }

    return {
        "agent_system_id": agent_system_id,
        "period_days": resolved_days,
        "source": {
            "plane": "bigquery_observability",
            "table": table_id,
            "run_semantics": "distinct_run_id_observed_in_agent_llm_usage",
            "run_lifecycle_instrumented": False,
            "cost_semantics": "not_available_in_this_increment",
        },
        "summary": summary,
        "agents": agents,
        "runs": runs,
    }
