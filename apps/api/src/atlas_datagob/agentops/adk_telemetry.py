"""Reusable Google ADK LLM telemetry for SPEC-059 AgentOps.

The instrumentation mirrors the proven Business Rules Silver pattern: observe the
real ADK model response, read usage_metadata, measure latency and persist one
best-effort BigQuery row per LLM call. Observability failures must never fail the
business flow.
"""
from __future__ import annotations

import asyncio
import contextvars
import inspect
import logging
import os
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator
from uuid import uuid4

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse

logger = logging.getLogger(__name__)

_RUN_CONTEXT: contextvars.ContextVar[dict[str, str] | None] = contextvars.ContextVar(
    "atlas_agentops_run_context",
    default=None,
)
_INSTRUMENTED_AGENT_IDS: set[int] = set()
_START_KEY_PREFIX = "temp:agentops_llm_start_ns:"


def _enabled() -> bool:
    return os.getenv("ATLAS_AGENTOPS_ENABLED", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _project_id() -> str | None:
    return os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("PROJECT_ID")


def _table_id() -> str | None:
    explicit = os.getenv("ATLAS_AGENTOPS_LLM_USAGE_TABLE")
    if explicit:
        return explicit
    project = _project_id()
    if not project:
        return None
    dataset = os.getenv("ATLAS_AGENTOPS_DATASET", "agentops")
    return f"{project}.{dataset}.agent_llm_usage"


def _environment() -> str:
    return os.getenv("ATLAS_ENVIRONMENT", "unknown")


def _usage_value(usage: Any, field: str) -> int:
    value = getattr(usage, field, None) if usage is not None else None
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _model_name(agent: Any) -> str:
    model = getattr(agent, "model", None)
    if isinstance(model, str) and model:
        return model
    nested = getattr(model, "model", None)
    if isinstance(nested, str) and nested:
        return nested
    return str(model or "unknown")


@contextmanager
def agentops_run_context(
    *,
    requested_by: str | None,
    agent_system_id: str = "ATLAS-DATAGOB",
    run_id: str | None = None,
    trace_id: str | None = None,
    environment: str | None = None,
) -> Iterator[dict[str, str]]:
    """Correlate all ADK model calls executed inside one governed application turn."""

    resolved_run_id = run_id or f"RUN-{uuid4().hex[:16].upper()}"
    resolved_trace_id = trace_id or resolved_run_id
    context = {
        "agent_system_id": agent_system_id,
        "run_id": resolved_run_id,
        "trace_id": resolved_trace_id,
        "requested_by": requested_by or "unknown",
        "environment": environment or _environment(),
    }
    token = _RUN_CONTEXT.set(context)
    try:
        yield context
    finally:
        _RUN_CONTEXT.reset(token)


def build_llm_usage_row(
    *,
    callback_context: CallbackContext,
    llm_response: LlmResponse,
    agent_system_id: str,
    agent_id: str,
    model_name: str,
    started_ns: int | None,
) -> dict[str, Any]:
    """Build the canonical BigQuery row from real ADK response metadata."""

    run_context = _RUN_CONTEXT.get() or {}
    usage = getattr(llm_response, "usage_metadata", None)
    input_tokens = _usage_value(usage, "prompt_token_count")
    output_tokens = _usage_value(usage, "candidates_token_count")
    total_tokens = _usage_value(usage, "total_token_count")
    if not total_tokens:
        total_tokens = input_tokens + output_tokens

    latency_ms = None
    if isinstance(started_ns, int):
        latency_ms = max(int((time.perf_counter_ns() - started_ns) / 1_000_000), 0)

    error_code = getattr(llm_response, "error_code", None)
    error_message = getattr(llm_response, "error_message", None)
    status = "FAILED" if error_code or error_message else "SUCCESS"

    invocation_id = str(getattr(callback_context, "invocation_id", "") or "")
    run_id = run_context.get("run_id") or invocation_id or f"RUN-{uuid4().hex[:16].upper()}"
    trace_id = run_context.get("trace_id") or run_id
    session = getattr(callback_context, "session", None)
    session_id = getattr(session, "id", None)

    return {
        "agent_system_id": run_context.get("agent_system_id") or agent_system_id,
        "run_id": run_id,
        "trace_id": trace_id,
        "session_id": session_id,
        "agent_id": agent_id,
        "model_provider": "google",
        "model_name": model_name,
        "request_count": 1,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "latency_ms": latency_ms,
        "status": status,
        "error_code": str(error_code) if error_code else None,
        "error_message": str(error_message) if error_message else None,
        "requested_by": run_context.get("requested_by")
        or str(getattr(callback_context, "user_id", "") or "")
        or None,
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "billing_reference": None,
        "metadata": {
            "invocation_id": invocation_id or None,
            "environment": run_context.get("environment") or _environment(),
            "telemetry_source": "google_adk_callback",
        },
    }


async def _insert_row(table_id: str, row: dict[str, Any]) -> list[dict[str, Any]]:
    from google.cloud import bigquery

    def _insert() -> list[dict[str, Any]]:
        client = bigquery.Client(project=_project_id())
        return client.insert_rows_json(table_id, [row])

    return await asyncio.to_thread(_insert)


async def _maybe_await(value: Any) -> Any:
    if inspect.isawaitable(value):
        return await value
    return value


def build_agentops_callbacks(
    *,
    agent_system_id: str,
    agent_id: str,
    model_name: str,
):
    """Return composable ADK callbacks that emit real LLM telemetry."""

    start_key = f"{_START_KEY_PREFIX}{agent_id}"

    async def before_model_callback(
        callback_context: CallbackContext,
        llm_request: LlmRequest,
    ) -> None:
        del llm_request
        if _enabled():
            callback_context.state[start_key] = time.perf_counter_ns()
        return None

    async def after_model_callback(
        callback_context: CallbackContext,
        llm_response: LlmResponse,
    ) -> None:
        if not _enabled():
            return None

        table_id = _table_id()
        if not table_id:
            logger.warning(
                "AgentOps telemetry skipped for %s: BigQuery table/project unavailable",
                agent_id,
            )
            return None

        started_ns = callback_context.state.get(start_key)
        row = build_llm_usage_row(
            callback_context=callback_context,
            llm_response=llm_response,
            agent_system_id=agent_system_id,
            agent_id=agent_id,
            model_name=model_name,
            started_ns=started_ns if isinstance(started_ns, int) else None,
        )
        try:
            errors = await _insert_row(table_id, row)
            if errors:
                logger.warning("AgentOps telemetry insert returned errors for %s: %s", agent_id, errors)
        except Exception as exc:  # Observability must not break the governed business execution.
            logger.warning("AgentOps telemetry insert failed for %s: %s", agent_id, exc)
        return None

    return before_model_callback, after_model_callback


def instrument_adk_agent(agent: Any, *, agent_system_id: str = "ATLAS-DATAGOB") -> Any:
    """Attach AgentOps callbacks to one ADK agent while preserving existing callbacks."""

    object_id = id(agent)
    if object_id in _INSTRUMENTED_AGENT_IDS:
        return agent

    agent_id = str(getattr(agent, "name", "unknown-agent"))
    telemetry_before, telemetry_after = build_agentops_callbacks(
        agent_system_id=agent_system_id,
        agent_id=agent_id,
        model_name=_model_name(agent),
    )
    existing_before = getattr(agent, "before_model_callback", None)
    existing_after = getattr(agent, "after_model_callback", None)

    async def combined_before(callback_context: CallbackContext, llm_request: LlmRequest):
        if existing_before is not None:
            existing_result = await _maybe_await(existing_before(callback_context, llm_request))
            if existing_result is not None:
                return existing_result
        return await telemetry_before(callback_context, llm_request)

    async def combined_after(callback_context: CallbackContext, llm_response: LlmResponse):
        existing_result = None
        if existing_after is not None:
            existing_result = await _maybe_await(existing_after(callback_context, llm_response))
        effective_response = existing_result if existing_result is not None else llm_response
        await telemetry_after(callback_context, effective_response)
        return existing_result

    setattr(agent, "before_model_callback", combined_before)
    setattr(agent, "after_model_callback", combined_after)
    _INSTRUMENTED_AGENT_IDS.add(object_id)
    return agent


def instrument_adk_agent_tree(root_agent: Any, *, agent_system_id: str = "ATLAS-DATAGOB") -> Any:
    """Instrument a root ADK agent and every delegated sub-agent recursively."""

    instrument_adk_agent(root_agent, agent_system_id=agent_system_id)
    for child in list(getattr(root_agent, "sub_agents", None) or []):
        instrument_adk_agent_tree(child, agent_system_id=agent_system_id)
    return root_agent
