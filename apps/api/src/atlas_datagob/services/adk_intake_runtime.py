"""Runtime adapter between FastAPI and the Gemini ADK conversational intake."""
from __future__ import annotations

from typing import Any
from uuid import uuid4

APP_NAME = "atlas-datagob-intake"

_session_service = None
_runner = None


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


def _runtime():
    """Lazily create the ADK runner so deterministic unit tests do not require Vertex credentials."""

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


async def run_intake_turn(*, user_id: str, message: str, session_id: str | None = None) -> dict:
    """Run one guided business-intake turn and return the conversational plus structured state."""

    from google.genai import types  # type: ignore

    resolved_session_id = session_id or f"INTAKE-{uuid4().hex[:12].upper()}"
    await _get_or_create_session(user_id, resolved_session_id)
    session_service, runner = _runtime()

    user_content = types.Content(
        role="user",
        parts=[types.Part.from_text(text=message)],
    )

    final_text = ""
    trace: list[str] = []
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
