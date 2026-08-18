"""Runtime adapter between FastAPI and the Gemini ADK conversational intake."""
from __future__ import annotations

from typing import Any
from uuid import uuid4

APP_NAME = "atlas-datagob-intake"
FACT_APP_NAME = "atlas-datagob-intake-facts"

_session_service = None
_runner = None
_fact_session_service = None
_fact_runner = None


class _StateToolContext:
    """Minimal ToolContext-compatible wrapper for deterministic snapshot materialization."""

    def __init__(self, state: dict[str, Any]) -> None:
        self.state = state


def materialize_business_case(state: dict[str, Any]) -> dict:
    """Build a current Business Case snapshot from structured session state.

    The conversational LLM is instructed to call build_business_case_snapshot itself,
    but the API must never depend on that probabilistic choice to expose or register the
    canonical artifact. This deterministic fallback keeps the UI and confirmation gate
    consistent even when an LLM turn ends before invoking the snapshot tool.
    """

    from atlas_datagob.agents.conversational_intake_tools import build_business_case_snapshot

    working_state = dict(state)
    context = _StateToolContext(working_state)
    return build_business_case_snapshot(context)  # type: ignore[arg-type]


def merge_turn_business_facts(current: dict[str, Any], facts: dict[str, Any]) -> dict[str, Any]:
    """Merge schema-constrained facts from one user turn without erasing prior evidence."""

    merged = dict(current)
    string_fields = {
        "business_problem",
        "desired_outcome",
        "business_area",
        "impacted_process",
        "current_situation",
    }
    list_fields = {"stakeholders", "success_metrics", "data_sources"}

    for key in string_fields:
        value = facts.get(key)
        if isinstance(value, str) and value.strip():
            merged[key] = value.strip()

    for key in list_fields:
        value = facts.get(key)
        if not isinstance(value, list):
            continue
        clean = [str(item).strip() for item in value if str(item).strip()]
        if not clean:
            continue
        previous = merged.get(key, [])
        previous_items = previous if isinstance(previous, list) else []
        merged[key] = list(dict.fromkeys([*previous_items, *clean]))

    return merged


def _runtime():
    """Lazily create the main ADK runner so deterministic unit tests do not require Vertex credentials."""

    global _session_service, _runner
    if _session_service is None or _runner is None:
        from google.adk.runners import Runner  # type: ignore
        from google.adk.sessions import InMemorySessionService  # type: ignore

        from atlas_datagob.agents.agent import root_agent

        _session_service = InMemorySessionService()
        _runner = Runner(
            agent=root_agent,
            app_name=APP_NAME,
            session_service=_session_service,
        )
    return _session_service, _runner


def _fact_runtime():
    """Create a separate schema-constrained ADK runner for mandatory turn fact extraction."""

    global _fact_session_service, _fact_runner
    if _fact_session_service is None or _fact_runner is None:
        from google.adk.runners import Runner  # type: ignore
        from google.adk.sessions import InMemorySessionService  # type: ignore

        from atlas_datagob.agents.business_fact_extractor_agent import business_fact_extractor_agent

        _fact_session_service = InMemorySessionService()
        _fact_runner = Runner(
            agent=business_fact_extractor_agent,
            app_name=FACT_APP_NAME,
            session_service=_fact_session_service,
        )
    return _fact_session_service, _fact_runner


async def _extract_turn_business_facts(*, user_id: str, message: str) -> dict[str, Any]:
    """Run one isolated ADK structured-extraction turn and return validated business facts."""

    from google.genai import types  # type: ignore

    from atlas_datagob.agents.business_fact_extractor_agent import TurnBusinessFacts

    session_service, runner = _fact_runtime()
    session_id = f"FACT-{uuid4().hex[:12].upper()}"
    await session_service.create_session(
        app_name=FACT_APP_NAME,
        user_id=user_id,
        session_id=session_id,
        state={},
    )

    user_content = types.Content(
        role="user",
        parts=[types.Part.from_text(text=message)],
    )

    parsed: dict[str, Any] | None = None
    final_text = ""
    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=user_content,
        ):
            output = getattr(event, "output", None)
            if output is not None:
                if hasattr(output, "model_dump"):
                    parsed = output.model_dump()
                elif isinstance(output, dict):
                    parsed = dict(output)

            if event.is_final_response() and event.content and event.content.parts:
                final_text = "".join(
                    part.text or ""
                    for part in event.content.parts
                    if getattr(part, "text", None)
                ).strip()

        if parsed is None:
            parsed = TurnBusinessFacts.model_validate_json(final_text).model_dump()
        else:
            parsed = TurnBusinessFacts.model_validate(parsed).model_dump()
        return parsed
    finally:
        await session_service.delete_session(
            app_name=FACT_APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )


async def _get_or_create_session(user_id: str, session_id: str):
    session_service, _ = _runtime()
    session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
    )
    if session is None:
        session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
            state={
                "business_context": {},
                "project_classification": {},
                "data_readiness": {},
                "architecture_assessment": {},
                "policy_assessment": {},
                "business_case": {},
            },
        )
    return session


async def _persist_turn_business_facts(*, user_id: str, session_id: str, facts: dict[str, Any]) -> None:
    """Persist extracted facts via an ADK EventActions state delta for durable-service compatibility."""

    from google.adk.events import Event, EventActions  # type: ignore

    session_service, _ = _runtime()
    session = await _get_or_create_session(user_id, session_id)
    merged = merge_turn_business_facts(
        dict(session.state.get("business_context", {})),
        facts,
    )
    event = Event(
        invocation_id=f"fact-extraction-{uuid4().hex[:12]}",
        author="atlas_business_fact_extractor",
        actions=EventActions(
            state_delta={
                "business_context": merged,
                "last_turn_business_facts": facts,
            }
        ),
    )
    await session_service.append_event(session=session, event=event)


async def run_intake_turn(*, user_id: str, message: str, session_id: str | None = None) -> dict:
    """Run one guided business-intake turn and return the conversational plus structured state."""

    from google.genai import types  # type: ignore

    resolved_session_id = session_id or f"INTAKE-{uuid4().hex[:12].upper()}"
    await _get_or_create_session(user_id, resolved_session_id)

    # Mandatory semantic extraction happens before conversational orchestration. This is
    # intentionally separate from the root agent's optional capture tool so canonical
    # Business Case facts cannot be lost merely because an LLM turn omits a tool call.
    extracted_facts = await _extract_turn_business_facts(user_id=user_id, message=message)
    await _persist_turn_business_facts(
        user_id=user_id,
        session_id=resolved_session_id,
        facts=extracted_facts,
    )

    session_service, runner = _runtime()
    user_content = types.Content(
        role="user",
        parts=[types.Part.from_text(text=message)],
    )

    final_text = ""
    trace: list[str] = ["atlas_business_fact_extractor"]
    async for event in runner.run_async(
        user_id=user_id,
        session_id=resolved_session_id,
        new_message=user_content,
    ):
        author = getattr(event, "author", None)
        if author and author not in trace:
            trace.append(author)
        if event.is_final_response() and event.content and event.content.parts:
            final_text = "".join(
                part.text or ""
                for part in event.content.parts
                if getattr(part, "text", None)
            ).strip()

    session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=resolved_session_id,
    )
    state = dict(session.state if session else {})
    business_case = materialize_business_case(state)

    return {
        "session_id": resolved_session_id,
        "message": final_text,
        "business_case": business_case,
        "business_context": state.get("business_context", {}),
        "project_classification": state.get("project_classification", {}),
        "data_readiness": state.get("data_readiness", {}),
        "architecture_assessment": state.get("architecture_assessment", {}),
        "policy_assessment": state.get("policy_assessment", {}),
        "agent_trace": trace,
    }


async def get_intake_session_state(*, user_id: str, session_id: str) -> dict:
    """Return structured ADK session state with a deterministic canonical Business Case snapshot."""

    session_service, _ = _runtime()
    session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
    )
    if session is None:
        raise KeyError(session_id)

    state = dict(session.state)
    state["business_case"] = materialize_business_case(state)
    return state
