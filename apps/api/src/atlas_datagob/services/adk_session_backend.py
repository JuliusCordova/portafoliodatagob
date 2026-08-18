"""ADK session backend selection for ATLAS Conversational Intake.

The main conversational session must be externalized in production so Cloud Run
instances can share conversation state. Local development and dependency-light tests
may keep the in-memory service. The one-turn business fact extractor intentionally uses
its own ephemeral in-memory session and is not governed by this module.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


_IN_MEMORY = "in_memory"
_VERTEX_AI = "vertex_ai"
_SUPPORTED = {_IN_MEMORY, _VERTEX_AI}


@dataclass(frozen=True)
class AdkSessionBackendConfig:
    backend: str
    project: str | None
    location: str | None
    agent_engine_id: str | None
    durable_required: bool

    @property
    def durable(self) -> bool:
        return self.backend == _VERTEX_AI


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def resolve_adk_session_backend_config() -> AdkSessionBackendConfig:
    """Resolve and validate the main conversational session backend from environment."""

    backend = os.getenv("ATLAS_ADK_SESSION_BACKEND", _IN_MEMORY).strip().lower()
    if backend not in _SUPPORTED:
        raise RuntimeError(
            "ATLAS_ADK_SESSION_BACKEND must be one of: " + ", ".join(sorted(_SUPPORTED))
        )

    durable_required = _env_bool("ATLAS_ADK_REQUIRE_DURABLE_SESSIONS")
    project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("ATLAS_GCP_PROJECT")
    location = os.getenv("GOOGLE_CLOUD_LOCATION") or os.getenv("ATLAS_GCP_LOCATION")
    agent_engine_id = os.getenv("GOOGLE_CLOUD_AGENT_ENGINE_ID") or os.getenv(
        "ATLAS_ADK_AGENT_ENGINE_ID"
    )

    if durable_required and backend != _VERTEX_AI:
        raise RuntimeError(
            "Durable ADK sessions are required but ATLAS_ADK_SESSION_BACKEND is not vertex_ai."
        )

    if backend == _VERTEX_AI:
        missing = [
            name
            for name, value in (
                ("GOOGLE_CLOUD_PROJECT", project),
                ("GOOGLE_CLOUD_LOCATION", location),
                ("GOOGLE_CLOUD_AGENT_ENGINE_ID", agent_engine_id),
            )
            if not value
        ]
        if missing:
            raise RuntimeError(
                "Vertex AI ADK sessions require: " + ", ".join(missing)
            )

    return AdkSessionBackendConfig(
        backend=backend,
        project=project,
        location=location,
        agent_engine_id=agent_engine_id,
        durable_required=durable_required,
    )


def build_adk_session_service():
    """Build the configured ADK SessionService with cloud imports kept lazy."""

    config = resolve_adk_session_backend_config()
    if config.backend == _IN_MEMORY:
        from google.adk.sessions import InMemorySessionService  # type: ignore

        return InMemorySessionService()

    from google.adk.sessions import VertexAiSessionService  # type: ignore

    return VertexAiSessionService(
        project=config.project,
        location=config.location,
        agent_engine_id=config.agent_engine_id,
    )


def adk_session_backend_snapshot() -> dict:
    """Return non-secret runtime metadata suitable for health/debug diagnostics."""

    config = resolve_adk_session_backend_config()
    return {
        "backend": config.backend,
        "durable": config.durable,
        "durable_required": config.durable_required,
        "project": config.project,
        "location": config.location,
        "agent_engine_id_configured": bool(config.agent_engine_id),
    }
